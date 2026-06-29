package audit

import (
	"encoding/json"
	"log"
	"secureway/backend/db"
	"secureway/backend/models"
	"time"

	"github.com/google/uuid"
)

// Log saves an audit log entry to the database asynchronously.
func Log(orgID, actorID, action, targetID string, metadata interface{}) {
	var metadataJSON string
	if metadata != nil {
		bytes, err := json.Marshal(metadata)
		if err == nil {
			metadataJSON = string(bytes)
		} else {
			log.Printf("Failed to marshal audit log metadata: %v", err)
		}
	}

	entry := models.AuditLogEntry{
		ID:        uuid.New().String(),
		OrgID:     orgID,
		ActorID:   actorID,
		Action:    action,
		TargetID:  targetID,
		Metadata:  metadataJSON,
		CreatedAt: time.Now(),
	}

	go func() {
		if err := db.DB.Create(&entry).Error; err != nil {
			log.Printf("Failed to save audit log entry to DB: %v", err)
		}
	}()
}
