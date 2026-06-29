package models

import (
	"time"

	"gorm.io/gorm"
)

type Organization struct {
	ID        string         `gorm:"primaryKey" json:"id"`
	Name      string         `json:"name"`
	Domain    string         `gorm:"uniqueIndex" json:"domain"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type User struct {
	ID           string         `gorm:"primaryKey" json:"id"`
	Name         string         `json:"name"`
	Email        string         `gorm:"uniqueIndex" json:"email"`
	PasswordHash string         `json:"-"`
	Role         string         `json:"role"` // admin | developer | viewer
	OrgID        string         `json:"org_id"`
	Organization Organization   `gorm:"foreignKey:OrgID" json:"-"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type Project struct {
	ID                   string         `gorm:"primaryKey" json:"id"`
	OrgID                string         `json:"org_id"`
	Name                 string         `json:"name"`
	RepoURL              string         `json:"repo_url"`
	Language             string         `json:"language"`
	LastScanID           string         `json:"last_scan_id"`
	LastScanAt           time.Time      `json:"last_scan_at"`
	Scans                []ScanJob      `gorm:"foreignKey:ProjectID" json:"scans"`
	VerificationToken    string         `json:"verification_token"`
	Verified             bool           `gorm:"default:false" json:"verified"`
	VerifiedAt           *time.Time     `json:"verified_at"`
	VerificationAttempts int            `gorm:"default:0" json:"verification_attempts"`
	LockedUntil          *time.Time     `json:"locked_until"`
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
	DeletedAt            gorm.DeletedAt `gorm:"index" json:"-"`
}

type ScanJob struct {
	ID          string         `gorm:"primaryKey" json:"id"`
	ProjectID   string         `json:"project_id"`
	Project     Project        `gorm:"foreignKey:ProjectID" json:"-"`
	Status      string         `json:"status"`       // queued | building | scanning | completed | failed
	TriggerType string         `json:"trigger_type"` // manual | mock_push
	GatePassed  bool           `gorm:"default:false" json:"gate_passed"`
	ErrorReason string         `gorm:"default:''" json:"error_reason"`
	StartedAt   time.Time      `json:"started_at"`
	FinishedAt  time.Time      `json:"finished_at"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type Vulnerability struct {
	ID          string         `gorm:"primaryKey" json:"id"`
	ScanID      string         `json:"scan_id"`
	Severity    string         `json:"severity"` // critical | high | medium | low
	Title       string         `json:"title"`
	FilePath    string         `json:"file_path"`
	Line        int            `json:"line"`
	Description string         `json:"description"`
	Remediation string         `json:"remediation"`
	Status      string         `json:"status"` // open | resolved | ignored | false_positive
	DetectedAt  time.Time      `json:"detected_at"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type Alert struct {
	ID        string         `gorm:"primaryKey" json:"id"`
	ProjectID string         `json:"project_id"`
	Project   Project        `gorm:"foreignKey:ProjectID" json:"-"`
	ScanID    string         `json:"scan_id"`
	Severity  string         `json:"severity"`
	Message   string         `json:"message"`
	Read      bool           `json:"read"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type GatePolicy struct {
	ID               string         `gorm:"primaryKey" json:"id"`
	ProjectID        string         `gorm:"uniqueIndex" json:"project_id"`
	BlockOnCritical  bool           `gorm:"default:true" json:"block_on_critical"`
	BlockOnHigh      bool           `gorm:"default:false" json:"block_on_high"`
	MaxAllowedMedium int            `gorm:"default:-1" json:"max_allowed_medium"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

type AuditLogEntry struct {
	ID        string         `gorm:"primaryKey" json:"id"`
	OrgID     string         `json:"org_id"`
	ActorID   string         `json:"actor_id"`
	Action    string         `json:"action"`
	TargetID  string         `json:"target_id"`
	Metadata  string         `json:"metadata"` // JSON string
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
