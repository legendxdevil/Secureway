package services

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"secureway/backend/db"
	"secureway/backend/models"
	"secureway/backend/ws"
	"strings"
	"time"

	"github.com/google/uuid"
)

type ScanMessage struct {
	Event   string      `json:"event"`
	Payload interface{} `json:"payload"`
}

type ScanProgressPayload struct {
	ScanID    string `json:"scan_id"`
	ProjectID string `json:"project_id"`
	Stage     string `json:"stage"`
	Percent   int    `json:"percent"`
}

type ScanLogPayload struct {
	ScanID    string `json:"scan_id"`
	ProjectID string `json:"project_id"`
	Line      string `json:"line"`
}

type ScanCompletedPayload struct {
	ScanID         string `json:"scan_id"`
	ProjectID      string `json:"project_id"`
	TotalFound     int    `json:"total_found"`
	CriticalCount  int    `json:"critical_count"`
	HighCount      int    `json:"high_count"`
	MediumCount    int    `json:"medium_count"`
	LowCount       int    `json:"low_count"`
	GatePassed     bool   `json:"gate_passed"`
	ErrorReason    string `json:"error_reason"`
	Status         string `json:"status"`
}

type VulnTemplate struct {
	Title       string
	Severity    string // critical | high | medium | low
	FilePath    string
	Line        int
	Description string
	Remediation string
	Languages   []string // Javascript, Go, Python, or "any"
}

var VulnTemplates = []VulnTemplate{
	{
		Title:       "Prototype Pollution in lodash",
		Severity:    "high",
		FilePath:    "package.json",
		Line:        18,
		Description: "The library lodash prior to 4.17.21 is vulnerable to prototype pollution, which could lead to remote code execution (RCE) or denial of service (DoS) in Node.js applications.",
		Remediation: "Upgrade lodash dependency to version 4.17.21 or later using `npm install lodash@latest`.",
		Languages:   []string{"javascript"},
	},
	{
		Title:       "Exposed AWS Access Key ID",
		Severity:    "critical",
		FilePath:    "config/aws.json",
		Line:        4,
		Description: "A plaintext AWS Access Key ID was detected in a configuration file. Threat actors can use leaked credentials to access cloud infrastructure resources.",
		Remediation: "Revoke the leaked key immediately in AWS IAM, and move to IAM roles, instance profiles, or secure environment variable injection via AWS Secrets Manager.",
		Languages:   []string{"any"},
	},
	{
		Title:       "SQL Injection risk in query builder",
		Severity:    "critical",
		FilePath:    "src/lib/db.ts",
		Line:        82,
		Description: "Concatenating user input directly into SQL statement variables exposes the application to SQL Injection, potentially allowing unauthorized database access or manipulation.",
		Remediation: "Refactor raw SQL strings to use parameterized queries or parameterized placeholder arguments supported by the database query interface.",
		Languages:   []string{"javascript", "go", "python"},
	},
	{
		Title:       "Missing Content-Security-Policy header",
		Severity:    "low",
		FilePath:    "src/pages/_document.tsx",
		Line:        12,
		Description: "The response headers do not restrict the origins of script execution, stylesheets, or images, making the site vulnerable to cross-site scripting (XSS) and clickjacking attacks.",
		Remediation: "Implement a Content-Security-Policy (CSP) HTTP header or configure meta http-equiv HTML tags to restrict trusted domains for asset loading.",
		Languages:   []string{"javascript"},
	},
	{
		Title:       "Plaintext database credentials",
		Severity:    "high",
		FilePath:    "app.config.js",
		Line:        23,
		Description: "The database password and connection host details are hardcoded directly in application configuration scripts, exposing access credentials in source control systems.",
		Remediation: "Replace hardcoded strings with calls to `process.env.DATABASE_URL` and manage active values using secure environment configurations outside of git tracks.",
		Languages:   []string{"any"},
	},
	{
		Title:       "Wildcard CORS Origin Policy",
		Severity:    "medium",
		FilePath:    "src/pages/api/cors.ts",
		Line:        8,
		Description: "Setting Access-Control-Allow-Origin response headers to wildcard '*' allows any external domain to read sensitive api resources via browser-side fetch protocols.",
		Remediation: "Replace wildcard header configs with explicit matching filters that restrict CORS requests to trusted client host domains.",
		Languages:   []string{"any"},
	},
	{
		Title:       "Path Traversal in file downloader",
		Severity:    "high",
		FilePath:    "src/pages/api/download.ts",
		Line:        34,
		Description: "Accepting relative path segments like '../..' in filename parameters allows external users to download arbitrary files from the filesystem.",
		Remediation: "Sanitize path string inputs using path resolve utilities and validate that requested paths are fully within designated download folders.",
		Languages:   []string{"javascript", "go", "python"},
	},
	{
		Title:       "Outdated runtime version: Node.js 14.x",
		Severity:    "medium",
		FilePath:    "package.json",
		Line:        6,
		Description: "Node.js 14.x reached its end-of-life cycle and no longer receives critical security patches or stability fixes.",
		Remediation: "Upgrade the project runtime specification and deploy environments to use Node.js 18.x or 20.x LTS releases.",
		Languages:   []string{"javascript"},
	},
	{
		Title:       "Sensitive cookie missing Secure flag",
		Severity:    "medium",
		FilePath:    "src/lib/session.ts",
		Line:        19,
		Description: "Authentication session cookies that lack the 'Secure' flag will transmit over unencrypted HTTP channels, risking credential sniffing on public networks.",
		Remediation: "Configure the session manager cookie schema options to enforce `Secure: true` and `HttpOnly: true` flags.",
		Languages:   []string{"javascript", "go", "python"},
	},
	{
		Title:       "JWT verification bypass (None algorithm allowed)",
		Severity:    "critical",
		FilePath:    "src/lib/jwt-verifier.ts",
		Line:        45,
		Description: "The JWT decoding logic accepts signatures utilizing the 'none' algorithm, permitting authentication tokens to bypass secure cryptographic verification.",
		Remediation: "Explicitly restrict token verification configurations to only allow cryptographic sign schemes (HS256/RS256) and reject tokens using 'none'.",
		Languages:   []string{"javascript", "go", "python"},
	},
	{
		Title:       "Exposed .env configuration file",
		Severity:    "critical",
		FilePath:    ".env",
		Line:        1,
		Description: "Local developer secrets environment file containing secret keys, tokens, and database passwords has been committed to version control.",
		Remediation: "Add `.env` files to `.gitignore` files, run git history filter scripts to purge the credentials, and reset all exposed keys immediately.",
		Languages:   []string{"any"},
	},
	{
		Title:       "Unprotected admin controller action",
		Severity:    "high",
		FilePath:    "src/pages/api/admin/users.ts",
		Line:        14,
		Description: "Admin API dashboard actions do not implement authorization checks, enabling regular users to request data by guessing endpoints.",
		Remediation: "Implement authentication and role-checking middleware checks on all controller routes prefixing administrative access paths.",
		Languages:   []string{"javascript", "go", "python"},
	},
	{
		Title:       "Reflected Cross-Site Scripting (XSS)",
		Severity:    "high",
		FilePath:    "src/pages/search.tsx",
		Line:        57,
		Description: "Rendering raw query params directly in the browser DOM using dangerouslySetInnerHTML can execute injected scripts.",
		Remediation: "Sanitize all dynamic inputs before rendering or bind query variables to standard text nodes that auto-escape script segments.",
		Languages:   []string{"javascript"},
	},
	{
		Title:       "Insecure deserialization using pickle",
		Severity:    "critical",
		FilePath:    "utils/serializer.py",
		Line:        14,
		Description: "The pickle module in Python is vulnerable to arbitrary code execution if untrusted input is passed to pickle.loads().",
		Remediation: "Avoid pickle for loading untrusted files. Use safer alternatives like json or yaml.safe_load.",
		Languages:   []string{"python"},
	},
	{
		Title:       "Unchecked memory allocation in slice creation",
		Severity:    "medium",
		FilePath:    "parser/reader.go",
		Line:        91,
		Description: "Creating slices directly using unchecked sizes from client inputs can lead to out-of-memory crashes.",
		Remediation: "Validate input buffer sizes before initializing make([]byte, size) allocations.",
		Languages:   []string{"go"},
	},
}

var ScanQueue = make(chan string, 100) // Channel of Scan IDs

func StartScanner() {
	go func() {
		for scanID := range ScanQueue {
			processScan(scanID)
		}
	}()
}

func TriggerScan(scanID string) {
	ScanQueue <- scanID
}

func matchesLanguage(projectLang string, templateLangs []string) bool {
	pLang := strings.ToLower(projectLang)
	for _, l := range templateLangs {
		lLower := strings.ToLower(l)
		if lLower == "any" || lLower == pLang {
			return true
		}
	}
	return false
}

func processScan(scanID string) {
	var job models.ScanJob
	if err := db.DB.Preload("Project").First(&job, "id = ?", scanID).Error; err != nil {
		log.Printf("Scanner failed to find ScanJob %s: %v", scanID, err)
		return
	}

	orgID := job.Project.OrgID

	broadcastEvent := func(event string, payload interface{}) {
		msgBytes, err := json.Marshal(ScanMessage{Event: event, Payload: payload})
		if err != nil {
			log.Printf("Failed to marshal WS event: %v", err)
			return
		}
		ws.GlobalHub.Broadcast <- ws.BroadcastMessage{
			OrgID:   orgID,
			Message: msgBytes,
		}
	}

	// 1. Queued -> update status to building
	job.Status = "building"
	db.DB.Save(&job)
	broadcastEvent("scan.progress", ScanProgressPayload{
		ScanID:    job.ID,
		ProjectID: job.ProjectID,
		Stage:     "building",
		Percent:   20,
	})
	broadcastEvent("scan.log", ScanLogPayload{ScanID: job.ID, ProjectID: job.ProjectID, Line: "Preparing build environment..."})
	time.Sleep(1 * time.Second)

	// Stream building logs
	broadcastEvent("scan.log", ScanLogPayload{ScanID: job.ID, ProjectID: job.ProjectID, Line: "Fetching git repository branch refs..."})
	broadcastEvent("scan.log", ScanLogPayload{ScanID: job.ID, ProjectID: job.ProjectID, Line: fmt.Sprintf("Parsing repository file tree structure (%s)...", job.Project.Language)})
	broadcastEvent("scan.log", ScanLogPayload{ScanID: job.ID, ProjectID: job.ProjectID, Line: "Restoring runtime cache frameworks..."})
	time.Sleep(800 * time.Millisecond)

	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	// Introduce a 5% random failure rate (Phase 3 constraint 5)
	if r.Float64() < 0.05 {
		job.Status = "failed"
		job.ErrorReason = "scan worker timeout"
		job.FinishedAt = time.Now()
		db.DB.Save(&job)

		broadcastEvent("scan.progress", ScanProgressPayload{
			ScanID:    job.ID,
			ProjectID: job.ProjectID,
			Stage:     "failed",
			Percent:   100,
		})
		broadcastEvent("scan.log", ScanLogPayload{ScanID: job.ID, ProjectID: job.ProjectID, Line: "FATAL ERROR: scan worker timeout - runner execution exceeded limits"})
		broadcastEvent("scan.completed", ScanCompletedPayload{
			ScanID:      job.ID,
			ProjectID:   job.ProjectID,
			Status:      "failed",
			ErrorReason: "scan worker timeout",
		})
		return
	}

	// 2. Building -> update status to scanning
	job.Status = "scanning"
	db.DB.Save(&job)
	broadcastEvent("scan.progress", ScanProgressPayload{
		ScanID:    job.ID,
		ProjectID: job.ProjectID,
		Stage:     "scanning",
		Percent:   60,
	})
	broadcastEvent("scan.log", ScanLogPayload{ScanID: job.ID, ProjectID: job.ProjectID, Line: "Build complete. Running SecureWay static scanner..."})
	time.Sleep(1200 * time.Millisecond)

	// Stream scanning logs
	broadcastEvent("scan.log", ScanLogPayload{ScanID: job.ID, ProjectID: job.ProjectID, Line: "[SAST] Running static rule analysis matchers..."})
	broadcastEvent("scan.log", ScanLogPayload{ScanID: job.ID, ProjectID: job.ProjectID, Line: "[SCA] Auditing package dependency logs against CVE database..."})
	broadcastEvent("scan.log", ScanLogPayload{ScanID: job.ID, ProjectID: job.ProjectID, Line: "[SECRETS] Searching code buffers for key entropy patterns..."})
	time.Sleep(1200 * time.Millisecond)

	// 3. Scanning -> update status to analyzing
	job.Status = "analyzing"
	db.DB.Save(&job)
	broadcastEvent("scan.progress", ScanProgressPayload{
		ScanID:    job.ID,
		ProjectID: job.ProjectID,
		Stage:     "analyzing",
		Percent:   90,
	})
	broadcastEvent("scan.log", ScanLogPayload{ScanID: job.ID, ProjectID: job.ProjectID, Line: "Synthesizing findings..."})
	time.Sleep(800 * time.Millisecond)

	// 4. Generate contextual vulnerabilities based on Language + Name heuristics (Phase 3)
	var candidates []VulnTemplate
	for _, t := range VulnTemplates {
		if matchesLanguage(job.Project.Language, t.Languages) {
			candidates = append(candidates, t)
		}
	}
	// Fallback if no matching language templates
	if len(candidates) == 0 {
		candidates = VulnTemplates
	}

	// Categorize severity candidates
	var highCrit []VulnTemplate
	var medLow []VulnTemplate
	for _, c := range candidates {
		if c.Severity == "critical" || c.Severity == "high" {
			highCrit = append(highCrit, c)
		} else {
			medLow = append(medLow, c)
		}
	}

	// Check name/URL sensitivity keywords
	nameLower := strings.ToLower(job.Project.Name)
	repoLower := strings.ToLower(job.Project.RepoURL)
	isSensitive := strings.Contains(nameLower, "auth") ||
		strings.Contains(nameLower, "payment") ||
		strings.Contains(nameLower, "pay") ||
		strings.Contains(nameLower, "secret") ||
		strings.Contains(repoLower, "auth") ||
		strings.Contains(repoLower, "payment") ||
		strings.Contains(repoLower, "pay") ||
		strings.Contains(repoLower, "secret")

	// Get previously resolved vulnerability titles for this project
	var resolvedTitles []string
	db.DB.Model(&models.Vulnerability{}).
		Joins("JOIN scan_jobs ON vulnerabilities.scan_id = scan_jobs.id").
		Where("scan_jobs.project_id = ? AND (vulnerabilities.status = ? OR vulnerabilities.status = ?)", job.ProjectID, "resolved", "ignored").
		Pluck("title", &resolvedTitles)

	resolvedMap := make(map[string]bool)
	for _, t := range resolvedTitles {
		resolvedMap[t] = true
	}

	numVulnerabilities := r.Intn(5) + 1 // 1 to 5 vulnerabilities
	var vulns []models.Vulnerability
	var criticalCount, highCount, mediumCount, lowCount int

	for i := 0; i < numVulnerabilities; i++ {
		targetHighCrit := false
		if isSensitive {
			if i == 0 {
				targetHighCrit = true
			} else {
				targetHighCrit = r.Float64() < 0.75 // 75% high/crit weight
			}
		} else {
			targetHighCrit = r.Float64() < 0.25 // 25% high/crit weight
		}

		var chosen VulnTemplate
		if targetHighCrit && len(highCrit) > 0 {
			chosen = highCrit[r.Intn(len(highCrit))]
		} else if len(medLow) > 0 {
			chosen = medLow[r.Intn(len(medLow))]
		} else if len(candidates) > 0 {
			chosen = candidates[r.Intn(len(candidates))]
		} else {
			break
		}

		// Resolved-state penalty check (Phase 3 constraint 4)
		if resolvedMap[chosen.Title] && r.Float64() < 0.90 {
			// 90% chance to skip and select another one instead
			if len(candidates) > 1 {
				// Re-roll from candidates
				chosen = candidates[r.Intn(len(candidates))]
			}
		}

		// Deduplicate within same scan run
		dup := false
		for _, v := range vulns {
			if v.Title == chosen.Title {
				dup = true
				break
			}
		}
		if dup {
			continue
		}

		vuln := models.Vulnerability{
			ID:          fmt.Sprintf("SW-%d-%04d", time.Now().Year(), r.Intn(9999)),
			ScanID:      job.ID,
			Severity:    chosen.Severity,
			Title:       chosen.Title,
			FilePath:    chosen.FilePath,
			Line:        chosen.Line,
			Description: chosen.Description,
			Remediation: chosen.Remediation,
			Status:      "open",
			DetectedAt:  time.Now(),
		}

		switch vuln.Severity {
		case "critical":
			criticalCount++
		case "high":
			highCount++
		case "medium":
			mediumCount++
		case "low":
			lowCount++
		}

		db.DB.Create(&vuln)
		vulns = append(vulns, vuln)
	}

	// 5. Evaluate CI/CD Gate Policy (Phase 4)
	var policy models.GatePolicy
	if err := db.DB.First(&policy, "project_id = ?", job.ProjectID).Error; err != nil {
		// Create default
		policy = models.GatePolicy{
			ID:               uuid.New().String(),
			ProjectID:        job.ProjectID,
			BlockOnCritical:  true,
			BlockOnHigh:      false,
			MaxAllowedMedium: -1,
			CreatedAt:        time.Now(),
		}
		db.DB.Create(&policy)
	}

	gatePassed := true
	if policy.BlockOnCritical && criticalCount > 0 {
		gatePassed = false
	}
	if policy.BlockOnHigh && highCount > 0 {
		gatePassed = false
	}
	if policy.MaxAllowedMedium >= 0 && mediumCount > policy.MaxAllowedMedium {
		gatePassed = false
	}

	// Save scan job status as completed
	job.Status = "completed"
	job.FinishedAt = time.Now()
	job.GatePassed = gatePassed
	db.DB.Save(&job)

	// Update project last scan metadata
	var project models.Project
	if db.DB.First(&project, "id = ?", job.ProjectID).Error == nil {
		project.LastScanID = job.ID
		project.LastScanAt = time.Now()
		db.DB.Save(&project)
	}

	broadcastEvent("scan.progress", ScanProgressPayload{
		ScanID:    job.ID,
		ProjectID: job.ProjectID,
		Stage:     "completed",
		Percent:   100,
	})

	if gatePassed {
		broadcastEvent("scan.log", ScanLogPayload{ScanID: job.ID, ProjectID: job.ProjectID, Line: "[GATE POLICY] Compliance gate constraints met: PASSED."})
	} else {
		broadcastEvent("scan.log", ScanLogPayload{ScanID: job.ID, ProjectID: job.ProjectID, Line: "[GATE POLICY] Compliance policy violated: FAILED."})
	}

	broadcastEvent("scan.log", ScanLogPayload{ScanID: job.ID, ProjectID: job.ProjectID, Line: fmt.Sprintf("Scan completed. Found %d issues.", len(vulns))})

	broadcastEvent("scan.completed", ScanCompletedPayload{
		ScanID:        job.ID,
		ProjectID:     job.ProjectID,
		TotalFound:    len(vulns),
		CriticalCount: criticalCount,
		HighCount:     highCount,
		MediumCount:   mediumCount,
		LowCount:      lowCount,
		GatePassed:    gatePassed,
		Status:        "completed",
	})

	// If critical/high found, trigger an Alert
	if criticalCount > 0 || highCount > 0 {
		alertMsg := fmt.Sprintf("Critical or High vulnerabilities detected in project %s during scan %s", job.Project.Name, job.ID[:8])
		alert := models.Alert{
			ID:        uuid.New().String(),
			ProjectID: job.ProjectID,
			ScanID:    job.ID,
			Severity:  "high",
			Message:   alertMsg,
			Read:      false,
			CreatedAt: time.Now(),
		}
		if criticalCount > 0 {
			alert.Severity = "critical"
		}
		db.DB.Create(&alert)

		// Broadcast alert to all organization connections
		msgBytes, err := json.Marshal(ScanMessage{Event: "alert.new", Payload: alert})
		if err == nil {
			ws.GlobalHub.Broadcast <- ws.BroadcastMessage{
				OrgID:   orgID,
				Message: msgBytes,
			}
		}
	}
}
