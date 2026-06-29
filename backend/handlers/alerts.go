package handlers

import (
	"secureway/backend/db"
	"secureway/backend/models"

	"github.com/gofiber/fiber/v2"
)

func GetAlerts(c *fiber.Ctx) error {
	orgID, ok := c.Locals("org_id").(string)
	if !ok || orgID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var alerts []models.Alert
	// Join GORM projects relation (aliased as "Project") to filter by Organization ID
	err := db.DB.Joins("Project").Where("Project.org_id = ?", orgID).Order("alerts.created_at desc").Find(&alerts).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve alerts"})
	}

	return c.JSON(alerts)
}

func MarkAlertRead(c *fiber.Ctx) error {
	alertID := c.Params("id")
	orgID, ok := c.Locals("org_id").(string)
	if !ok || orgID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var alert models.Alert
	if err := db.DB.Preload("Project").First(&alert, "id = ?", alertID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Alert not found"})
	}

	if alert.Project.OrgID != orgID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden"})
	}

	alert.Read = true
	if err := db.DB.Save(&alert).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update alert status"})
	}

	return c.JSON(alert)
}
