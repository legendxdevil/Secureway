package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"secureway/backend/audit"
	"secureway/backend/db"
	"secureway/backend/models"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CreateProjectRequest struct {
	Name     string `json:"name"`
	RepoURL  string `json:"repo_url"`
	Language string `json:"language"`
}

func GetProjects(c *fiber.Ctx) error {
	orgID, ok := c.Locals("org_id").(string)
	if !ok || orgID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var projects []models.Project
	if err := db.DB.Find(&projects, "org_id = ?", orgID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve projects"})
	}

	return c.JSON(projects)
}

func CreateProject(c *fiber.Ctx) error {
	orgID, ok := c.Locals("org_id").(string)
	userID, ok2 := c.Locals("user_id").(string)
	if !ok || !ok2 || orgID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req CreateProjectRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Name == "" || req.RepoURL == "" || req.Language == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Name, repository URL, and primary language are required"})
	}

	project := models.Project{
		ID:        uuid.New().String(),
		OrgID:     orgID,
		Name:      req.Name,
		RepoURL:   req.RepoURL,
		Language:  req.Language,
		Verified:  false,
		CreatedAt: time.Now(),
	}

	if err := db.DB.Create(&project).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create project"})
	}

	// Create default GatePolicy
	defaultPolicy := models.GatePolicy{
		ID:               uuid.New().String(),
		ProjectID:        project.ID,
		BlockOnCritical:  true,
		BlockOnHigh:      false,
		MaxAllowedMedium: -1,
		CreatedAt:        time.Now(),
	}
	if err := db.DB.Create(&defaultPolicy).Error; err != nil {
		log.Printf("Warning: failed to create default gate policy for project %s: %v", project.ID, err)
	}

	audit.Log(orgID, userID, "project_created", project.ID, map[string]interface{}{"name": project.Name, "language": project.Language})

	return c.Status(fiber.StatusCreated).JSON(project)
}

func GetProject(c *fiber.Ctx) error {
	orgID, ok := c.Locals("org_id").(string)
	if !ok || orgID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	projectID := c.Params("id")

	var project models.Project
	if err := db.DB.Preload("Scans", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at DESC")
	}).First(&project, "id = ? AND org_id = ?", projectID, orgID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}

	return c.JSON(project)
}

func DeleteProject(c *fiber.Ctx) error {
	orgID, ok := c.Locals("org_id").(string)
	userID, ok2 := c.Locals("user_id").(string)
	if !ok || !ok2 || orgID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	projectID := c.Params("id")

	// Ensure project belongs to the organization
	var project models.Project
	if err := db.DB.First(&project, "id = ? AND org_id = ?", projectID, orgID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}

	// Delete related alerts, scan jobs, and vulnerabilities
	db.DB.Delete(&models.Alert{}, "project_id = ?", projectID)
	db.DB.Delete(&models.GatePolicy{}, "project_id = ?", projectID)
	
	var scans []models.ScanJob
	db.DB.Find(&scans, "project_id = ?", projectID)
	for _, scan := range scans {
		db.DB.Delete(&models.Vulnerability{}, "scan_id = ?", scan.ID)
	}
	db.DB.Delete(&models.ScanJob{}, "project_id = ?", projectID)

	// Delete project itself
	if err := db.DB.Delete(&project).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete project"})
	}

	audit.Log(orgID, userID, "project_deleted", projectID, map[string]interface{}{"name": project.Name})

	return c.JSON(fiber.Map{"message": "Project deleted successfully"})
}

func GenerateVerificationToken(c *fiber.Ctx) error {
	orgID, ok := c.Locals("org_id").(string)
	userID, ok2 := c.Locals("user_id").(string)
	if !ok || !ok2 || orgID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	projectID := c.Params("id")

	var project models.Project
	if err := db.DB.First(&project, "id = ? AND org_id = ?", projectID, orgID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}

	// Read server secret
	serverSecret := os.Getenv("SERVER_SECRET")
	if serverSecret == "" {
		serverSecret = "secureway_server_secret_key_999"
	}

	timestamp := time.Now().Format(time.RFC3339Nano)
	raw := project.ID + userID + serverSecret + timestamp
	h := sha256.New()
	h.Write([]byte(raw))
	token := hex.EncodeToString(h.Sum(nil))

	// Reset verified status
	project.VerificationToken = token
	project.Verified = false
	now := time.Now()
	project.VerifiedAt = nil
	project.VerificationAttempts = 0
	project.LockedUntil = nil

	if err := db.DB.Save(&project).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save verification token"})
	}

	// Format text response
	textResponse := fmt.Sprintf("SecureWay-Verification-Token: %s\nProject: %s\nGenerated: %s\n", token, project.Name, now.Format(time.RFC3339))

	format := c.Query("format")
	if format == "text" || strings.Contains(c.Get("Accept"), "text/plain") {
		c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=secureway-%s.txt", project.Name))
		c.Set("Content-Type", "text/plain")
		return c.SendString(textResponse)
	}

	return c.JSON(fiber.Map{
		"token":        token,
		"file_content": textResponse,
	})
}

func VerifyProjectOwnership(c *fiber.Ctx) error {
	orgID, ok := c.Locals("org_id").(string)
	userID, ok2 := c.Locals("user_id").(string)
	if !ok || !ok2 || orgID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	projectID := c.Params("id")

	var project models.Project
	if err := db.DB.First(&project, "id = ? AND org_id = ?", projectID, orgID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}

	// Check lockout
	if project.LockedUntil != nil && project.LockedUntil.After(time.Now()) {
		timeLeft := time.Until(*project.LockedUntil)
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error": fmt.Sprintf("Too many failed attempts. Lockout active. Please wait %.0f minutes and %.0f seconds.", timeLeft.Minutes(), float64(int(timeLeft.Seconds())%60)),
		})
	}

	// Handle file upload
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "File upload is required"})
	}

	// Check extension
	if !strings.HasSuffix(strings.ToLower(fileHeader.Filename), ".txt") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Only .txt files are allowed"})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to read uploaded file"})
	}
	defer file.Close()

	fileBytes := make([]byte, fileHeader.Size)
	if _, err := file.Read(fileBytes); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse uploaded file"})
	}

	content := string(fileBytes)
	var uploadedToken string
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "SecureWay-Verification-Token:") {
			uploadedToken = strings.TrimSpace(strings.TrimPrefix(line, "SecureWay-Verification-Token:"))
			break
		}
	}

	// Strip possible carriage returns or extra spaces
	uploadedToken = strings.TrimSpace(uploadedToken)

	if uploadedToken == "" || uploadedToken != project.VerificationToken {
		// Increment attempts
		project.VerificationAttempts++
		if project.VerificationAttempts >= 5 {
			lockout := time.Now().Add(15 * time.Minute)
			project.LockedUntil = &lockout
			db.DB.Save(&project)
			
			audit.Log(orgID, userID, "auth_denied", project.ID, map[string]interface{}{
				"action": "project_verification",
				"reason": "Lockout triggered due to 5 consecutive failures",
				"attempts": project.VerificationAttempts,
			})
			
			timeLeft := time.Until(lockout)
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": fmt.Sprintf("Too many failed attempts. Lockout active. Please wait %.0f minutes and %.0f seconds.", timeLeft.Minutes(), float64(int(timeLeft.Seconds())%60)),
			})
		}
		db.DB.Save(&project)

		audit.Log(orgID, userID, "auth_denied", project.ID, map[string]interface{}{"action": "project_verification", "reason": "Token mismatch", "attempts": project.VerificationAttempts})

		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Token mismatch — please re-download and re-upload without editing.",
		})
	}

	// Verification Success!
	now := time.Now()
	project.Verified = true
	project.VerifiedAt = &now
	project.VerificationAttempts = 0
	project.LockedUntil = nil

	if err := db.DB.Save(&project).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save verification status"})
	}

	audit.Log(orgID, userID, "project_verified", project.ID, map[string]interface{}{"attempts": project.VerificationAttempts})

	return c.JSON(fiber.Map{
		"message": "Project ownership verified successfully!",
		"project": project,
	})
}
