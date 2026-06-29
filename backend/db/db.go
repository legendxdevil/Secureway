package db

import (
	"log"
	"secureway/backend/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB(filepath string) *gorm.DB {
	var err error
	DB, err = gorm.Open(sqlite.Open(filepath), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// Auto Migrate the schemas
	err = DB.AutoMigrate(
		&models.Organization{},
		&models.User{},
		&models.Project{},
		&models.ScanJob{},
		&models.Vulnerability{},
		&models.Alert{},
		&models.GatePolicy{},
		&models.AuditLogEntry{},
	)
	if err != nil {
		log.Fatalf("failed to auto migrate database: %v", err)
	}

	return DB
}
