# SecureWay — Product Requirements Document (PRD)

**Type:** Prototype / Simulation
**Version:** 1.0
**Purpose:** Reference document for AI IDE (Cursor / Windsurf) driven development

\---

## 1\. Project Overview

**SecureWay** ek SaaS-based DevSecOps platform hai jo end-to-end cybersecurity simulation provide karta hai. Platform Linux-based scanning engines (simulated) use karke user ke applications, web apps, tools, aur repositories ke andar security vulnerabilities detect karta hai aur unhe report karta hai.

Core differentiator: **CI/CD integration** — jab user GitHub (ya kisi bhi platform) pe code push/upload karta hai, SecureWay automatically pipeline trigger karta hai, code scan karta hai, aur **deploy/upload se pehle** user ko vulnerabilities ke baare me alert karta hai.

### Scope of this Prototype

* Scan/analysis engine: **Simulated (mock data)** — real Trivy/Semgrep jaisa tool integrate nahi hoga, lekin realistic output structure follow hoga.
* CI/CD pipeline: **Mock pipeline** — fake events trigger honge jo real GitHub webhook flow ko simulate karenge.
* Auth: **Real** — Go backend me actual JWT-based authentication (functional, not mocked).
* Coverage: **Full end-to-end flow** — Auth → Dashboard → Projects → Scans → Alerts → Reports → Settings.

\---

## 2\. Tech Stack

### Frontend

|Technology|Purpose|
|-|-|
|Next.js (App Router)|Frontend Framework|
|React|UI Library|
|TypeScript|Type Safety|
|Tailwind CSS|Styling|
|shadcn/ui|UI Components|
|TanStack Query|Server State / API caching|
|Zustand|Client State (auth, UI state)|
|WebSocket (native/socket client)|Real-time scan/alert updates|
|Recharts|Analytics \& vulnerability charts|

### Backend

|Technology|Purpose|
|-|-|
|Go (Golang)|Backend language|
|Gin / Fiber (recommended: **Fiber** for speed)|HTTP framework|
|JWT (golang-jwt)|Authentication|
|GORM + PostgreSQL (or SQLite for prototype)|Database/ORM|
|Gorilla WebSocket|Real-time server push|
|bcrypt|Password hashing|
|In-memory job queue (goroutines + channels)|Simulated scan job processing|

\---

## 3\. System Architecture

```
┌─────────────────────┐         REST + WS         ┌──────────────────────┐
│   Next.js Frontend   │ ◄─────────────────────────► │     Go Backend       │
│  (Dashboard, Auth UI) │                            │  (Auth, API, WS Hub)  │
└─────────────────────┘                            └──────────┬───────────┘
                                                                │
                                                     ┌──────────▼───────────┐
                                                     │  Mock Scan Engine     │
                                                     │ (goroutine simulator) │
                                                     └──────────┬───────────┘
                                                                │
                                                     ┌──────────▼───────────┐
                                                     │  Mock CI/CD Trigger   │
                                                     │ (fake webhook events) │
                                                     └───────────────────────┘
```

**Flow:**

1. User register/login → JWT issued by Go backend.
2. User "connects" a project (manually enter repo name/URL — no real GitHub OAuth needed for prototype).
3. User triggers a "Push Event" (button in UI simulates a GitHub push webhook).
4. Backend receives mock webhook → creates a Scan Job → pushes job to in-memory queue.
5. Goroutine "processes" the job over a few seconds (simulated delay) → generates randomized/seeded vulnerability findings.
6. Backend pushes real-time progress + final result via WebSocket to frontend.
7. If critical/high vulnerabilities found → Alert generated → shown in dashboard + notification.
8. User views detailed report, can mark issues as resolved/ignored.

\---

## 4\. User Roles

|Role|Permissions|
|-|-|
|**Admin**|Manage org, manage members, view all projects|
|**Developer**|Connect projects, trigger scans, view own project reports|
|**Viewer**|Read-only access to dashboards/reports|

(For prototype: single-org, role stored on user, enforced via middleware)

\---

## 5\. Pages / Screens

### 5.1 Public

* `/` — Landing page (marketing, product pitch)
* `/login` — Login
* `/register` — Register
* `/forgot-password` — (optional, can mock)

### 5.2 Authenticated App (`/app/\*`)

1. **Dashboard** (`/app/dashboard`)

   * Summary cards: Total Projects, Active Scans, Open Vulnerabilities, Critical Alerts
   * Vulnerability trend chart (Recharts line/area chart)
   * Severity distribution (pie/donut chart)
   * Recent scan activity feed (real-time via WS)
2. **Projects** (`/app/projects`)

   * List of connected projects/repos
   * "Connect New Project" modal (name, repo URL, language — all mock metadata)
   * Each project card: last scan status, vulnerability count, last scanned time
3. **Project Detail** (`/app/projects/\[id]`)

   * Project info, branch list (mock)
   * "Simulate Push Event" button → triggers mock CI/CD pipeline
   * Pipeline visualization: Push → Build → Scan → Report → Gate (pass/fail)
   * Live scan progress (WebSocket-driven progress bar/log stream)
4. **Scan Reports** (`/app/projects/\[id]/scans/\[scanId]`)

   * Full vulnerability list: severity (Critical/High/Medium/Low), CVE-like ID (mock), file path, line number, description, remediation suggestion
   * Filter/sort by severity, status
   * Mark as Resolved / Ignored / False Positive
5. **Alerts** (`/app/alerts`)

   * Real-time alert feed (WebSocket)
   * Alert detail: which project, which scan, severity, timestamp
   * Mark as read/acknowledged
6. **Analytics** (`/app/analytics`)

   * Org-wide vulnerability trends over time
   * Top vulnerable projects
   * Mean time to resolution (mock calculated metric)
7. **Settings** (`/app/settings`)

   * Profile, password change
   * Team members (Admin only)
   * Notification preferences (email/webhook toggle — UI only)

\---

## 6\. Data Models (Go structs / DB schema)

```go
type User struct {
    ID           string    `json:"id"`
    Name         string    `json:"name"`
    Email        string    `json:"email"`
    PasswordHash string    `json:"-"`
    Role         string    `json:"role"` // admin | developer | viewer
    OrgID        string    `json:"org\_id"`
    CreatedAt    time.Time `json:"created\_at"`
}

type Organization struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    CreatedAt time.Time `json:"created\_at"`
}

type Project struct {
    ID            string    `json:"id"`
    OrgID         string    `json:"org\_id"`
    Name          string    `json:"name"`
    RepoURL       string    `json:"repo\_url"`
    Language      string    `json:"language"`
    LastScanID    string    `json:"last\_scan\_id"`
    LastScanAt    time.Time `json:"last\_scan\_at"`
    CreatedAt     time.Time `json:"created\_at"`
}

type ScanJob struct {
    ID          string    `json:"id"`
    ProjectID   string    `json:"project\_id"`
    Status      string    `json:"status"` // queued | building | scanning | completed | failed
    TriggerType string    `json:"trigger\_type"` // manual | mock\_push
    StartedAt   time.Time `json:"started\_at"`
    FinishedAt  time.Time `json:"finished\_at"`
}

type Vulnerability struct {
    ID            string    `json:"id"`
    ScanID        string    `json:"scan\_id"`
    Severity      string    `json:"severity"` // critical | high | medium | low
    Title         string    `json:"title"`
    FilePath      string    `json:"file\_path"`
    Line          int       `json:"line"`
    Description   string    `json:"description"`
    Remediation   string    `json:"remediation"`
    Status        string    `json:"status"` // open | resolved | ignored | false\_positive
    DetectedAt    time.Time `json:"detected\_at"`
}

type Alert struct {
    ID         string    `json:"id"`
    ProjectID  string    `json:"project\_id"`
    ScanID     string    `json:"scan\_id"`
    Severity   string    `json:"severity"`
    Message    string    `json:"message"`
    Read        bool      `json:"read"`
    CreatedAt  time.Time `json:"created\_at"`
}
```

\---

## 7\. API Endpoints (REST)

### Auth

|Method|Endpoint|Description|
|-|-|-|
|POST|`/api/auth/register`|Register new user (creates org if first user)|
|POST|`/api/auth/login`|Login, returns JWT|
|GET|`/api/auth/me`|Get current user (JWT protected)|

### Projects

|Method|Endpoint|Description|
|-|-|-|
|GET|`/api/projects`|List projects|
|POST|`/api/projects`|Create/connect project|
|GET|`/api/projects/:id`|Project detail|
|DELETE|`/api/projects/:id`|Remove project|

### Scans (Mock CI/CD trigger lives here)

|Method|Endpoint|Description|
|-|-|-|
|POST|`/api/projects/:id/trigger`|Simulate push event → starts mock pipeline + scan job|
|GET|`/api/scans/:id`|Get scan job status + result|
|GET|`/api/scans/:id/vulnerabilities`|List vulnerabilities for a scan|
|PATCH|`/api/vulnerabilities/:id`|Update status (resolve/ignore)|

### Alerts

|Method|Endpoint|Description|
|-|-|-|
|GET|`/api/alerts`|List alerts|
|PATCH|`/api/alerts/:id/read`|Mark as read|

### Analytics

|Method|Endpoint|Description|
|-|-|-|
|GET|`/api/analytics/overview`|Dashboard summary stats|
|GET|`/api/analytics/trends`|Time-series vulnerability data|

\---

## 8\. WebSocket Events

Connection: `ws://<host>/ws?token=<jwt>`

|Event|Payload|Description|
|-|-|-|
|`scan.queued`|`{scanId, projectId}`|Job accepted|
|`scan.progress`|`{scanId, stage, percent}`|Stage = building/scanning/analyzing|
|`scan.log`|`{scanId, line}`|Streamed fake log line (for pipeline console UI)|
|`scan.completed`|`{scanId, summary}`|Final result summary|
|`alert.new`|`{alert}`|New alert pushed to all org clients|

\---

## 9\. Mock Scan Engine Logic (Backend simulation design)

1. On trigger, create `ScanJob` with status `queued`.
2. Goroutine sleeps \~1s → emits `scan.progress` (stage: building, 20%)
3. Sleeps \~2s → emits `scan.progress` (stage: scanning, 60%) + streams 3-5 fake log lines via `scan.log`
4. Randomly (seeded, weighted) generates 0-12 vulnerabilities from a **predefined pool** of realistic-looking vulnerability templates (e.g., "Hardcoded API Key Detected", "Outdated dependency: lodash@4.17.10 — known CVE", "SQL Injection risk in query builder", "Missing Content-Security-Policy header", "Exposed .env file in repo").
5. Severity distribution weighted (fewer criticals, more lows) for realism.
6. Emits `scan.completed` with summary → if any critical/high found, also emits `alert.new`.
7. Updates `Project.LastScanAt` and `ScanJob.status = completed`.

This keeps the simulation deterministic enough to look believable while being entirely mock — no real scanning tools required.

\---

## 10\. Color Palette / Design Direction

Cybersecurity SaaS aesthetic:

* sage #9DBDB8, cream #F0E7D6, vermilion #EA2E00
* Typography: monospace accents (e.g., `JetBrains Mono`) for logs/code, sans-serif (Inter) for UI

(Open to adjustment — let me know if you want a specific palette like your Maroon/Cream theme from R Agent Cloud instead.)

\---

## 11\. Folder Structure (Suggested)

```
secureway/
├── frontend/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (auth)/register/
│   │   ├── app/dashboard/
│   │   ├── app/projects/
│   │   ├── app/projects/\[id]/
│   │   ├── app/alerts/
│   │   ├── app/analytics/
│   │   └── app/settings/
│   ├── components/
│   │   ├── ui/ (shadcn)
│   │   ├── charts/
│   │   ├── pipeline/
│   │   └── alerts/
│   ├── lib/
│   │   ├── api.ts (TanStack Query hooks)
│   │   ├── ws.ts (WebSocket client)
│   │   └── store.ts (Zustand)
│   └── types/
│
└── backend/
    ├── main.go
    ├── handlers/
    │   ├── auth.go
    │   ├── projects.go
    │   ├── scans.go
    │   └── alerts.go
    ├── middleware/
    │   └── jwt.go
    ├── models/
    ├── services/
    │   └── mock\_scanner.go
    ├── ws/
    │   └── hub.go
    └── db/
```

\---

## 12\. Open Decisions (for you to confirm before/while building)

1. **Database**: SQLite (zero-setup, fast for prototype) vs PostgreSQL (closer to production)?
2. **Go framework**: Fiber (faster, Express-like) vs Gin (more popular, more docs/examples)?
3. **Multi-tenancy**: Single org per deployment, or multi-org from day one?
4. **Vulnerability template pool size**: \~15-20 templates enough for believable variety, or want more (\~40+)?
5. **Pipeline visualization style**: Step-based horizontal stepper (like GitHub Actions) vs vertical log console vs both?

\---

## 13\. Out of Scope (for this prototype)

* Real GitHub OAuth / webhook signature verification
* Real static/dynamic code analysis tools
* Payment/billing integration
* Email delivery (notifications stay in-app only)
* Multi-region/scaling concerns

