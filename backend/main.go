package main

import (
	"log"
	"secureway/backend/db"
	"secureway/backend/handlers"
	"secureway/backend/middleware"
	"secureway/backend/services"
	"secureway/backend/ws"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/websocket/v2"
	"github.com/golang-jwt/jwt/v5"
)

func main() {
	// Initialize database
	db.InitDB("./secureway.db")

	// Initialize WebSocket hub
	ws.GlobalHub = ws.NewHub()
	go ws.GlobalHub.Run()

	// Initialize background scanner
	services.StartScanner()

	app := fiber.New()

	// CORS configuration
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000", // Next.js default port
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PATCH, PUT, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	// Public Routes
	app.Post("/api/auth/register", handlers.Register)
	app.Post("/api/auth/login", handlers.Login)

	// WebSocket handler (with query-token authentication)
	app.Use("/ws", func(c *fiber.Ctx) error {
		tokenString := c.Query("token")
		if tokenString == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized - missing token"})
		}
		token, err := jwt.ParseWithClaims(tokenString, &middleware.Claims{}, func(token *jwt.Token) (interface{}, error) {
			return middleware.JwtSecret, nil
		})
		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized - invalid token"})
		}
		claims, ok := token.Claims.(*middleware.Claims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized - invalid claims"})
		}
		c.Locals("org_id", claims.OrgID)
		return c.Next()
	})

	app.Get("/ws", websocket.New(func(c *websocket.Conn) {
		orgID := c.Locals("org_id").(string)
		client := &ws.Client{
			Hub:   ws.GlobalHub,
			Conn:  c.Conn,
			OrgID: orgID,
			Send:  make(chan []byte, 256),
		}
		client.Hub.Register <- client

		go client.WritePump()
		client.ReadPump()
	}))

	// Protected REST API group
	api := app.Group("/api", middleware.JWTMiddleware())

	// Profile route
	api.Get("/auth/me", handlers.Me)

	// Projects routes
	api.Get("/projects", handlers.GetProjects)
	api.Post("/projects", handlers.CreateProject)
	api.Get("/projects/:id", handlers.GetProject)
	api.Delete("/projects/:id", handlers.DeleteProject)
	api.Post("/projects/:id/generate-token", handlers.GenerateVerificationToken)
	api.Post("/projects/:id/verify", handlers.VerifyProjectOwnership)
	api.Get("/projects/:id/gate-policy", handlers.GetGatePolicy)
	api.Put("/projects/:id/gate-policy", handlers.UpdateGatePolicy)

	// Org members routes
	api.Get("/org/members", handlers.GetOrgMembers)
	api.Put("/org/members/:id/role", handlers.UpdateMemberRole)
	api.Delete("/org/members/:id", handlers.DeleteMember)

	// Scans routes
	api.Post("/projects/:id/trigger", handlers.TriggerProjectScan)
	api.Get("/scans/:id", handlers.GetScanJob)
	api.Get("/scans/:id/vulnerabilities", handlers.GetScanVulnerabilities)
	api.Patch("/vulnerabilities/:id", handlers.UpdateVulnerabilityStatus)

	// Alerts routes
	api.Get("/alerts", handlers.GetAlerts)
	api.Patch("/alerts/:id/read", handlers.MarkAlertRead)

	// Analytics routes
	api.Get("/analytics/overview", handlers.GetAnalyticsOverview)
	api.Get("/analytics/trends", handlers.GetAnalyticsTrends)

	// Audit logs route
	api.Get("/audit-log", handlers.GetAuditLogs)

	log.Println("SecureWay backend server starting on :8080...")
	log.Fatal(app.Listen(":8080"))
}
