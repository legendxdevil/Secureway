package handlers

import (
	"secureway/backend/audit"
	"secureway/backend/db"
	"secureway/backend/middleware"
	"secureway/backend/models"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"` // Optional
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Email == "" || req.Password == "" || req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Name, email, and password are required"})
	}

	// Extract and validate domain
	emailParts := strings.Split(req.Email, "@")
	if len(emailParts) != 2 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid email address format"})
	}
	domain := strings.ToLower(strings.TrimSpace(emailParts[1]))

	blockedDomains := map[string]bool{
		"gmail.com":      true,
		"yahoo.com":      true,
		"outlook.com":    true,
		"hotmail.com":    true,
		"icloud.com":     true,
		"protonmail.com": true,
	}

	if blockedDomains[domain] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Please register with your company email address."})
	}

	// Check if user already exists
	var existingUser models.User
	if err := db.DB.First(&existingUser, "email = ?", req.Email).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "User with this email already exists"})
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	var org models.Organization
	var orgID string
	var role string

	// Try to find existing organization by domain
	if err := db.DB.First(&org, "domain = ?", domain).Error; err == nil {
		// Org exists -> join it as developer
		orgID = org.ID
		role = "developer"
	} else {
		// Org doesn't exist -> create new one, make user admin
		orgID = uuid.New().String()
		orgName := strings.Title(strings.Split(domain, ".")[0]) + " Corp"
		org = models.Organization{
			ID:        orgID,
			Name:      orgName,
			Domain:    domain,
			CreatedAt: time.Now(),
		}
		if err := db.DB.Create(&org).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create organization"})
		}
		role = "admin"
	}

	// Create User
	user := models.User{
		ID:           uuid.New().String(),
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         role,
		OrgID:        orgID,
		CreatedAt:    time.Now(),
	}

	if err := db.DB.Create(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user"})
	}

	// Generate JWT
	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role, user.OrgID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	// Set cookie
	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    token,
		Expires:  time.Now().Add(24 * time.Hour),
		HTTPOnly: true,
	})

	audit.Log(user.OrgID, user.ID, "user_login", user.ID, map[string]interface{}{"event": "register", "email": user.Email})

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"token": token,
		"user":  user,
	})
}

func Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var user models.User
	if err := db.DB.First(&user, "email = ?", req.Email).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
	}

	// Generate JWT
	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role, user.OrgID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	// Set cookie
	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    token,
		Expires:  time.Now().Add(24 * time.Hour),
		HTTPOnly: true,
	})

	audit.Log(user.OrgID, user.ID, "user_login", user.ID, map[string]interface{}{"event": "login", "email": user.Email})

	return c.JSON(fiber.Map{
		"token": token,
		"user":  user,
	})
}

func Me(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	return c.JSON(user)
}
