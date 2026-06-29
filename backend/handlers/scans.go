package handlers

import (
	"secureway/backend/audit"
	"secureway/backend/db"
	"secureway/backend/models"
	"secureway/backend/services"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type TriggerScanRequest struct {
	TriggerType string `json:"trigger_type"` // manual | mock_push
}

type UpdateVulnerabilityRequest struct {
	Status string `json:"status"` // open | resolved | ignored | false_positive
}

type UpdateGatePolicyRequest struct {
	BlockOnCritical  bool `json:"block_on_critical"`
	BlockOnHigh      bool `json:"block_on_high"`
	MaxAllowedMedium int  `json:"max_allowed_medium"`
}

func TriggerProjectScan(c *fiber.Ctx) error {
	orgID, ok := c.Locals("org_id").(string)
	userID, ok2 := c.Locals("user_id").(string)
	if !ok || !ok2 || orgID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	projectID := c.Params("id")

	// Ensure project belongs to org
	var project models.Project
	if err := db.DB.First(&project, "id = ? AND org_id = ?", projectID, orgID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}

	// Ownership Verification Check (Phase 2)
	if !project.Verified {
		audit.Log(orgID, userID, "auth_denied", projectID, map[string]interface{}{"action": "trigger_scan", "reason": "Project not verified"})
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Project not verified"})
	}

	// Concurrent Scan Prevention Check (Phase 3)
	var activeScan models.ScanJob
	if err := db.DB.First(&activeScan, "project_id = ? AND status IN ?", projectID, []string{"queued", "building", "scanning"}).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Scan already in progress"})
	}

	var req TriggerScanRequest
	if err := c.BodyParser(&req); err != nil {
		req.TriggerType = "manual" // default
	}
	if req.TriggerType == "" {
		req.TriggerType = "manual"
	}

	scanJob := models.ScanJob{
		ID:          uuid.New().String(),
		ProjectID:   projectID,
		Status:      "queued",
		TriggerType: req.TriggerType,
		StartedAt:   time.Now(),
	}

	if err := db.DB.Create(&scanJob).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create scan job"})
	}

	// Trigger mock scan asynchronously
	services.TriggerScan(scanJob.ID)

	audit.Log(orgID, userID, "scan_triggered", scanJob.ID, map[string]interface{}{"project_id": projectID, "trigger_type": req.TriggerType})

	return c.Status(fiber.StatusAccepted).JSON(scanJob)
}

func GetScanJob(c *fiber.Ctx) error {
	scanID := c.Params("id")

	var scanJob models.ScanJob
	if err := db.DB.Preload("Project").First(&scanJob, "id = ?", scanID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Scan job not found"})
	}

	orgID, ok := c.Locals("org_id").(string)
	if !ok || scanJob.Project.OrgID != orgID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
	}

	return c.JSON(scanJob)
}

func GetScanVulnerabilities(c *fiber.Ctx) error {
	scanID := c.Params("id")

	var scanJob models.ScanJob
	if err := db.DB.Preload("Project").First(&scanJob, "id = ?", scanID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Scan job not found"})
	}

	orgID, ok := c.Locals("org_id").(string)
	if !ok || scanJob.Project.OrgID != orgID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
	}

	var vulnerabilities []models.Vulnerability
	if err := db.DB.Find(&vulnerabilities, "scan_id = ?", scanID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve vulnerabilities"})
	}

	return c.JSON(vulnerabilities)
}

func UpdateVulnerabilityStatus(c *fiber.Ctx) error {
	vulnID := c.Params("id")
	userID, okUser := c.Locals("user_id").(string)

	var vuln models.Vulnerability
	if err := db.DB.First(&vuln, "id = ?", vulnID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Vulnerability not found"})
	}

	// Fetch scan and project to check organization ownership
	var scanJob models.ScanJob
	if err := db.DB.Preload("Project").First(&scanJob, "id = ?", vuln.ScanID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Scan job not found"})
	}

	orgID, ok := c.Locals("org_id").(string)
	if !ok || !okUser || scanJob.Project.OrgID != orgID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
	}

	var req UpdateVulnerabilityRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	validStatuses := map[string]bool{"open": true, "resolved": true, "ignored": true, "false_positive": true}
	if !validStatuses[req.Status] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid status value"})
	}

	oldStatus := vuln.Status
	vuln.Status = req.Status
	if err := db.DB.Save(&vuln).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update status"})
	}

	audit.Log(orgID, userID, "vulnerability_status_changed", vuln.ID, map[string]interface{}{"old_status": oldStatus, "new_status": req.Status})

	return c.JSON(vuln)
}

func GetGatePolicy(c *fiber.Ctx) error {
	orgID, ok := c.Locals("org_id").(string)
	if !ok || orgID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	projectID := c.Params("id")

	var project models.Project
	if err := db.DB.First(&project, "id = ? AND org_id = ?", projectID, orgID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}

	var policy models.GatePolicy
	if err := db.DB.First(&policy, "project_id = ?", projectID).Error; err != nil {
		policy = models.GatePolicy{
			ID:               uuid.New().String(),
			ProjectID:        projectID,
			BlockOnCritical:  true,
			BlockOnHigh:      false,
			MaxAllowedMedium: -1,
			CreatedAt:        time.Now(),
		}
		db.DB.Create(&policy)
	}

	return c.JSON(policy)
}

func UpdateGatePolicy(c *fiber.Ctx) error {
	orgID, ok := c.Locals("org_id").(string)
	userID, ok2 := c.Locals("user_id").(string)
	actorRole, ok3 := c.Locals("role").(string)
	if !ok || !ok2 || !ok3 || orgID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	projectID := c.Params("id")

	var project models.Project
	if err := db.DB.First(&project, "id = ? AND org_id = ?", projectID, orgID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Project not found"})
	}

	// Only admin can change gate policy
	if actorRole != "admin" {
		audit.Log(orgID, userID, "auth_denied", projectID, map[string]interface{}{"action": "update_gate_policy", "reason": "Requires admin role"})
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden — Administrators only"})
	}

	var req UpdateGatePolicyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var policy models.GatePolicy
	if err := db.DB.First(&policy, "project_id = ?", projectID).Error; err != nil {
		policy = models.GatePolicy{
			ID:        uuid.New().String(),
			ProjectID: projectID,
			CreatedAt: time.Now(),
		}
	}

	oldPolicy := policy
	policy.BlockOnCritical = req.BlockOnCritical
	policy.BlockOnHigh = req.BlockOnHigh
	policy.MaxAllowedMedium = req.MaxAllowedMedium
	policy.UpdatedAt = time.Now()

	if err := db.DB.Save(&policy).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save gate policy"})
	}

	audit.Log(orgID, userID, "gate_policy_updated", projectID, map[string]interface{}{
		"old_policy": oldPolicy,
		"new_policy": policy,
	})

	return c.JSON(policy)
}
