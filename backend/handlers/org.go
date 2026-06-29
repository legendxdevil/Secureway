package handlers

import (
	"secureway/backend/audit"
	"secureway/backend/db"
	"secureway/backend/models"

	"github.com/gofiber/fiber/v2"
)

type UpdateRoleRequest struct {
	Role string `json:"role"` // admin | developer | viewer
}

func GetOrgMembers(c *fiber.Ctx) error {
	orgID, ok := c.Locals("org_id").(string)
	if !ok || orgID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var users []models.User
	if err := db.DB.Find(&users, "org_id = ?", orgID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve members"})
	}

	return c.JSON(users)
}

func UpdateMemberRole(c *fiber.Ctx) error {
	orgID, ok := c.Locals("org_id").(string)
	actorID, ok2 := c.Locals("user_id").(string)
	actorRole, ok3 := c.Locals("role").(string)
	if !ok || !ok2 || !ok3 || orgID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	targetUserID := c.Params("id")

	// Ensure actor is admin
	if actorRole != "admin" {
		audit.Log(orgID, actorID, "auth_denied", targetUserID, map[string]interface{}{"action": "member_role_changed", "reason": "Requires admin role"})
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden - Administrators only"})
	}

	var req UpdateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Role != "admin" && req.Role != "developer" && req.Role != "viewer" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid role value"})
	}

	var targetUser models.User
	if err := db.DB.First(&targetUser, "id = ? AND org_id = ?", targetUserID, orgID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Member not found"})
	}

	// Safeguard: must have at least 1 admin
	if targetUser.Role == "admin" && req.Role != "admin" {
		var adminCount int64
		db.DB.Model(&models.User{}).Where("org_id = ? AND role = ?", orgID, "admin").Count(&adminCount)
		if adminCount <= 1 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "An organization must have at least one administrator."})
		}
	}

	oldRole := targetUser.Role
	targetUser.Role = req.Role
	if err := db.DB.Save(&targetUser).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update member role"})
	}

	audit.Log(orgID, actorID, "member_role_changed", targetUserID, map[string]interface{}{"old_role": oldRole, "new_role": req.Role})

	return c.JSON(targetUser)
}

func DeleteMember(c *fiber.Ctx) error {
	orgID, ok := c.Locals("org_id").(string)
	actorID, ok2 := c.Locals("user_id").(string)
	actorRole, ok3 := c.Locals("role").(string)
	if !ok || !ok2 || !ok3 || orgID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	targetUserID := c.Params("id")

	// Ensure actor is admin
	if actorRole != "admin" {
		audit.Log(orgID, actorID, "auth_denied", targetUserID, map[string]interface{}{"action": "member_removed", "reason": "Requires admin role"})
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Forbidden - Administrators only"})
	}

	var targetUser models.User
	if err := db.DB.First(&targetUser, "id = ? AND org_id = ?", targetUserID, orgID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Member not found"})
	}

	// Safeguard: must have at least 1 admin
	if targetUser.Role == "admin" {
		var adminCount int64
		db.DB.Model(&models.User{}).Where("org_id = ? AND role = ?", orgID, "admin").Count(&adminCount)
		if adminCount <= 1 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "An organization must have at least one administrator."})
		}
	}

	if err := db.DB.Delete(&targetUser).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete member"})
	}

	audit.Log(orgID, actorID, "member_removed", targetUserID, map[string]interface{}{"name": targetUser.Name, "email": targetUser.Email})

	return c.JSON(fiber.Map{"message": "Member removed successfully"})
}
