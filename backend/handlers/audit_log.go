package handlers

import (
	"secureway/backend/audit"
	"secureway/backend/db"
	"secureway/backend/models"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

func GetAuditLogs(c *fiber.Ctx) error {
	orgID, ok := c.Locals("org_id").(string)
	userID, ok2 := c.Locals("user_id").(string)
	actorRole, ok3 := c.Locals("role").(string)
	if !ok || !ok2 || !ok3 || orgID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	// Admin only
	if actorRole != "admin" {
		audit.Log(orgID, userID, "auth_denied", "audit_logs", map[string]interface{}{"action": "view_audit_logs", "reason": "Requires admin role"})
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden — Administrators only"})
	}

	// Pagination parameters
	page, err := strconv.Atoi(c.Query("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(c.Query("limit", "20"))
	if err != nil || limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := db.DB.Model(&models.AuditLogEntry{}).Where("org_id = ?", orgID)

	// Search filter inputs
	if actorFilter := c.Query("actor_id"); actorFilter != "" {
		query = query.Where("actor_id = ?", actorFilter)
	}
	if actionFilter := c.Query("action"); actionFilter != "" {
		query = query.Where("action = ?", actionFilter)
	}
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if t, err := time.Parse(time.RFC3339, startDateStr); err == nil {
			query = query.Where("created_at >= ?", t)
		} else if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if t, err := time.Parse(time.RFC3339, endDateStr); err == nil {
			query = query.Where("created_at <= ?", t)
		} else if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
			t = t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			query = query.Where("created_at <= ?", t)
		}
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count audit logs"})
	}

	var entries []models.AuditLogEntry
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&entries).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve audit logs"})
	}

	return c.JSON(fiber.Map{
		"total":   total,
		"page":    page,
		"limit":   limit,
		"entries": entries,
	})
}
