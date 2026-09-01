# Design Specification: Admin Telemetry & Live Log Dashboard (`/admin`)

**Date**: 2026-09-01  
**Status**: Approved  
**Author**: Shawn Lucas & Antigravity  

---

## 1. Overview & Goals

As Tempo is exposed via a persistent public Cloudflare tunnel, real-time observability over incoming traffic, API usage patterns, and server health is essential. This design establishes a secure `/admin` endpoint and dashboard providing:

1. **Live Access & Request Logging**: Capturing every incoming HTTP request (Client IP, HTTP method, endpoint, status code, latency, user agent) in a thread-safe in-memory ring buffer (up to 1,000 recent events).
2. **System Health & Resource Metrics**: Monitoring Go runtime memory allocation (HeapAlloc, Sys, GC stats), active Goroutines, CPU cores, filesystem disk storage usage, and server uptime.
3. **API Usage Telemetry**: Tracking total requests, requests per minute (RPM), HTTP status code distribution (2xx, 4xx, 5xx), error rates, and endpoint hit distributions.
4. **Google OAuth 2.0 Security Gate**: Restricting access exclusively to authorized Google accounts (whitelisted to `lucasshawn@gmail.com`) using Google Identity Services and backend token validation.

---

## 2. Architecture & Data Flow

```
[ Visitor / Admin Browser ]
            │
    (Cloudflare Tunnel)
            │
            ▼
   [ tempo-web (Nginx) ] ── (Static Assets / SPA Fallback) ──► [ React Admin SPA ]
            │                                                         │ (Sign in with Google)
    (Proxy /api/ to :8080)                                             │
            ▼                                                         ▼
   [ tempo-api (Go Server) ] ◄── (Bearer <Google_ID_Token>) ──────────┘
      ├── Telemetry Logger Middleware (Captures IP, status, duration, user agent)
      ├── In-Memory Ring Buffer (Holds last 1,000 log entries)
      ├── System Metrics Collector (runtime.MemStats, goroutines, disk usage)
      └── Google Token Validator (Validates JWT, verifies email == "lucasshawn@gmail.com")
```

---

## 3. Backend Implementation (`tempo-api`)

### 3.1. Telemetry Collector (`internal/telemetry/collector.go`)
- **`LogEntry` Model**:
  ```go
  type LogEntry struct {
      ID           string    `json:"id"`
      Timestamp    time.Time `json:"timestamp"`
      ClientIP     string    `json:"clientIp"`
      Method       string    `json:"method"`
      Path         string    `json:"path"`
      StatusCode   int       `json:"statusCode"`
      DurationMs   float64   `json:"durationMs"`
      UserAgent    string    `json:"userAgent"`
      BytesWritten int64     `json:"bytesWritten"`
  }
  ```
- **`SystemMetrics` Model**:
  ```go
  type SystemMetrics struct {
      UptimeSeconds   int64              `json:"uptimeSeconds"`
      StartTime       time.Time          `json:"startTime"`
      AllocBytes      uint64             `json:"allocBytes"`
      SysBytes        uint64             `json:"sysBytes"`
      NumGC           uint32             `json:"numGc"`
      NumGoroutine    int                `json:"numGoroutine"`
      NumCPU          int                `json:"numCpu"`
      DiskTotalBytes  uint64             `json:"diskTotalBytes"`
      DiskFreeBytes   uint64             `json:"diskFreeBytes"`
      DiskUsedBytes   uint64             `json:"diskUsedBytes"`
      DiskUsedPercent float64            `json:"diskUsedPercent"`
      TotalRequests   int64              `json:"totalRequests"`
      Status2xx       int64              `json:"status2xx"`
      Status4xx       int64              `json:"status4xx"`
      Status5xx       int64              `json:"status5xx"`
      RequestsPerMin  float64            `json:"requestsPerMin"`
      EndpointHits    map[string]int64   `json:"endpointHits"`
  }
  ```
- **Ring Buffer**: Thread-safe circular buffer with mutex synchronization holding up to 1,000 log entries.
- **Disk Usage**: Uses `syscall.Statfs` / `os.Stat` on the root filesystem `/`.

### 3.2. Google OAuth Token Verification (`internal/auth/google.go`)
- **`GoogleAuthMiddleware`**:
  - Reads `Authorization: Bearer <id_token>` header.
  - Queries Google's token validation endpoint (`https://oauth2.googleapis.com/tokeninfo?id_token=<id_token>`) with caching/verification.
  - Verifies:
    1. Token is not expired (`exp > now`).
    2. Email matches the authorized whitelist from environment variable `AUTHORIZED_ADMIN_EMAILS` (default: `lucasshawn@gmail.com`).
    3. `email_verified == "true"`.
  - Supports an optional development/override bypass key (`X-Admin-Key`) for local scripting/diagnostics.
  - Returns `401 Unauthorized` if token is missing/expired, or `403 Forbidden` if the Google email is not authorized.

### 3.3. Admin API Endpoints
1. `GET /api/v1/admin/stats` — Returns `SystemMetrics` payload.
2. `GET /api/v1/admin/logs?limit=100&filter=&status=` — Returns filtered `[]LogEntry`.
3. `POST /api/v1/admin/logs/clear` — Clears in-memory ring buffer.

---

## 4. Frontend Implementation (`tempo-web`)

### 4.1. Navigation & Routing
- Route `/admin` dynamically renders the `<AdminPortal />` component.
- The top header (`<Header />`) includes an Admin icon button to toggle between the interactive World Map (`/`) and Admin Telemetry (`/admin`).

### 4.2. Google Sign-In & Authentication State
- Renders Google Identity Services (GIS) button using official Google Sign-In SDK.
- Allows configuring Google Client ID via environment variable `VITE_GOOGLE_CLIENT_ID` or through an on-screen configuration modal (persisted to `localStorage`).
- Persists valid Google ID token in `sessionStorage` and attaches it to all `/api/v1/admin/*` API calls.
- Shows unauthorized banner if an unapproved Google email logs in.
- Header displays authenticated user profile (avatar + `lucasshawn@gmail.com` + Sign Out button).

### 4.3. Dashboard Layout & Visual Components
- **Top Status & Controls**:
  - Live heartbeat indicator (🟢 LIVE / 🔴 DISCONNECTED).
  - Auto-refresh selector (`Off`, `1s`, `3s`, `5s`).
  - Manual Refresh button.
  - Clear Logs button.
- **System Stat Gauges**:
  - Memory: Heap Allocated (MB), System Reserved (MB), GC runs.
  - CPU & Concurrency: Active Goroutines count, CPU cores.
  - Disk Storage: Total, Used, Free with colorized visual progress bar.
  - API Health: Total Requests, Uptime, Requests/min, Error Rate percentage.
- **HTTP Status Code Breakdown**:
  - Color-coded summary pill showing count and percentages for 2xx (Success), 4xx (Client Errors), 5xx (Server Errors).
- **Searchable & Filterable Live Log Console**:
  - Real-time search by IP address, endpoint path, or user-agent.
  - Filter pills: `All Logs`, `Errors Only (4xx/5xx)`, `API Endpoints Only`.
  - Color-coded status badges, formatted timestamps, and latency pills.

---

## 5. Kubernetes & Nginx Configuration

- **`web/nginx.conf`**:
  - Maintains SPA fallback `try_files $uri $uri/ /index.html;` so `/admin` loads seamlessly on direct navigation and refresh.
  - Proxies `/api/` to `http://tempo-api-service:8080/api/` passing `Authorization`, `CF-Connecting-IP`, and `X-Forwarded-For` headers.
- **`k8s/api-deployment.yaml`**:
  - Injects `AUTHORIZED_ADMIN_EMAILS="lucasshawn@gmail.com"`.

---

## 6. Verification & Testing Plan

1. **Backend Automated Tests**:
   - `internal/telemetry`: Concurrency, buffer wrap-around (1,000 items), metric aggregation, disk usage collector.
   - `internal/auth`: Valid token acceptance, expired token rejection (`401`), non-whitelisted email rejection (`403`).
2. **Frontend UI Tests**:
   - Unauthenticated state shows Google login gate.
   - Authenticated state renders stat cards and log table.
   - Filter and search operations correctly refine visible log entries.
3. **Live Tunnel End-to-End Verification**:
   - Test protected endpoint `/api/v1/admin/stats` via Cloudflare tunnel.
   - Navigate to `https://used-earl-consortium-talked.trycloudflare.com/admin` in browser.
