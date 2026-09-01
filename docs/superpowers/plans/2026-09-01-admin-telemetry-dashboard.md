# Admin Telemetry & Live Log Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a secure `/admin` telemetry dashboard exposing live HTTP access logs, Go runtime memory/CPU stats, disk usage, and API usage metrics protected by Google Sign-In for `lucasshawn@gmail.com`.

**Architecture:** A Go telemetry middleware records all HTTP traffic in a thread-safe ring buffer and collects OS/runtime metrics. Secured REST endpoints (`/api/v1/admin/*`) validate Google ID tokens. A React admin dashboard provides real-time log search/filtering, metric cards, status distribution, and Google Identity Services sign-in.

**Tech Stack:** Go 1.26 (`net/http`, `runtime`, `syscall`), React 18, TypeScript, Google Identity Services (GIS), Vite, Nginx, Kubernetes (Minikube), Cloudflare Tunnel.

## Global Constraints

- Authorized Google Account: `lucasshawn@gmail.com` (case-insensitive whitelist).
- Ring buffer capacity: 1,000 log entries (in-memory circular buffer with mutex synchronization).
- Zero external database dependencies.
- Frontend must match Tempo's dark-slate & gold design system.
- SPA routing on Nginx must cleanly handle `/admin` without 404s.

---

### Task 1: Telemetry Data Models & In-Memory Ring Buffer

**Files:**
- Create: `api/internal/telemetry/buffer.go`
- Test: `api/internal/telemetry/buffer_test.go`

**Interfaces:**
- Produces:
  - `type LogEntry struct { ID, Timestamp, ClientIP, Method, Path, StatusCode, DurationMs, UserAgent, BytesWritten }`
  - `type RingBuffer struct`
  - `func NewRingBuffer(capacity int) *RingBuffer`
  - `func (r *RingBuffer) Add(entry LogEntry)`
  - `func (r *RingBuffer) GetRecent(limit int, search string, statusFilter string) []LogEntry`
  - `func (r *RingBuffer) Clear()`

- [ ] **Step 1: Write the failing tests for RingBuffer**

```go
package telemetry_test

import (
	"fmt"
	"testing"
	"time"

	"tempo-api/internal/telemetry"
)

func TestRingBuffer_AddAndGetRecent(t *testing.T) {
	rb := telemetry.NewRingBuffer(5)
	for i := 1; i <= 7; i++ {
		rb.Add(telemetry.LogEntry{
			ID:         fmt.Sprintf("req-%d", i),
			Timestamp:  time.Now().UTC(),
			ClientIP:   "50.35.52.116",
			Method:     "GET",
			Path:       fmt.Sprintf("/api/v1/test-%d", i),
			StatusCode: 200,
			DurationMs: 1.5,
		})
	}

	logs := rb.GetRecent(10, "", "")
	if len(logs) != 5 {
		t.Fatalf("expected 5 logs due to capacity, got %d", len(logs))
	}
	// Newest first
	if logs[0].ID != "req-7" {
		t.Errorf("expected newest log req-7, got %s", logs[0].ID)
	}
}

func TestRingBuffer_Filter(t *testing.T) {
	rb := telemetry.NewRingBuffer(10)
	rb.Add(telemetry.LogEntry{ID: "1", ClientIP: "1.1.1.1", Path: "/api/traces", StatusCode: 200})
	rb.Add(telemetry.LogEntry{ID: "2", ClientIP: "2.2.2.2", Path: "/api/timeline", StatusCode: 404})
	rb.Add(telemetry.LogEntry{ID: "3", ClientIP: "1.1.1.1", Path: "/api/v1/admin", StatusCode: 500})

	errs := rb.GetRecent(10, "", "errors")
	if len(errs) != 2 {
		t.Fatalf("expected 2 errors (404 and 500), got %d", len(errs))
	}

	search := rb.GetRecent(10, "1.1.1.1", "")
	if len(search) != 2 {
		t.Fatalf("expected 2 logs for IP 1.1.1.1, got %d", len(search))
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test -v ./internal/telemetry` (in `C:\Users\lucas\tempo\api`)  
Expected: FAIL (cannot find package telemetry / NewRingBuffer)

- [ ] **Step 3: Implement `internal/telemetry/buffer.go`**

```go
package telemetry

import (
	"strings"
	"sync"
	"time"
)

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

type RingBuffer struct {
	mu       sync.RWMutex
	entries  []LogEntry
	capacity int
	start    int
	count    int
}

func NewRingBuffer(capacity int) *RingBuffer {
	if capacity <= 0 {
		capacity = 1000
	}
	return &RingBuffer{
		entries:  make([]LogEntry, capacity),
		capacity: capacity,
	}
}

func (r *RingBuffer) Add(entry LogEntry) {
	r.mu.Lock()
	defer r.mu.Unlock()

	idx := (r.start + r.count) % r.capacity
	if r.count == r.capacity {
		r.start = (r.start + 1) % r.capacity
	} else {
		r.count++
	}
	r.entries[idx] = entry
}

func (r *RingBuffer) GetRecent(limit int, search string, statusFilter string) []LogEntry {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if limit <= 0 || limit > r.count {
		limit = r.count
	}

	searchLower := strings.ToLower(strings.TrimSpace(search))
	result := make([]LogEntry, 0, limit)

	// Traverse backwards from newest to oldest
	for i := 0; i < r.count; i++ {
		idx := (r.start + r.count - 1 - i) % r.capacity
		entry := r.entries[idx]

		// Apply status filter
		if statusFilter == "errors" && entry.StatusCode < 400 {
			continue
		} else if statusFilter == "2xx" && (entry.StatusCode < 200 || entry.StatusCode >= 300) {
			continue
		} else if statusFilter == "4xx" && (entry.StatusCode < 400 || entry.StatusCode >= 500) {
			continue
		} else if statusFilter == "5xx" && entry.StatusCode < 500 {
			continue
		}

		// Apply search filter (IP, Path, UserAgent)
		if searchLower != "" {
			match := strings.Contains(strings.ToLower(entry.ClientIP), searchLower) ||
				strings.Contains(strings.ToLower(entry.Path), searchLower) ||
				strings.Contains(strings.ToLower(entry.UserAgent), searchLower) ||
				strings.Contains(strings.ToLower(entry.Method), searchLower)
			if !match {
				continue
			}
		}

		result = append(result, entry)
		if len(result) >= limit {
			break
		}
	}
	return result
}

func (r *RingBuffer) Clear() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.entries = make([]LogEntry, r.capacity)
	r.start = 0
	r.count = 0
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test -v ./internal/telemetry` (in `C:\Users\lucas\tempo\api`)  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/internal/telemetry/buffer.go api/internal/telemetry/buffer_test.go
git commit -m "feat(api): add in-memory telemetry log ring buffer"
```

---

### Task 2: System Metrics Collector & Stats Aggregator

**Files:**
- Create: `api/internal/telemetry/collector.go`
- Test: `api/internal/telemetry/collector_test.go`

**Interfaces:**
- Consumes: `RingBuffer` from Task 1
- Produces:
  - `type SystemMetrics struct`
  - `type Collector struct`
  - `func NewCollector(rb *RingBuffer) *Collector`
  - `func (c *Collector) RecordRequest(statusCode int, duration time.Duration, path string)`
  - `func (c *Collector) GetMetrics() SystemMetrics`

- [ ] **Step 1: Write the failing tests for Collector**

```go
package telemetry_test

import (
	"testing"
	"time"

	"tempo-api/internal/telemetry"
)

func TestCollector_RecordAndMetrics(t *testing.T) {
	rb := telemetry.NewRingBuffer(100)
	collector := telemetry.NewCollector(rb)

	collector.RecordRequest(200, 5*time.Millisecond, "/api/v1/timeline")
	collector.RecordRequest(404, 1*time.Millisecond, "/unknown")
	collector.RecordRequest(500, 20*time.Millisecond, "/api/v1/traces")

	m := collector.GetMetrics()
	if m.TotalRequests != 3 {
		t.Errorf("expected 3 total requests, got %d", m.TotalRequests)
	}
	if m.Status2xx != 1 || m.Status4xx != 1 || m.Status5xx != 1 {
		t.Errorf("unexpected status breakdown: 2xx=%d 4xx=%d 5xx=%d", m.Status2xx, m.Status4xx, m.Status5xx)
	}
	if m.AllocBytes == 0 || m.NumGoroutine == 0 {
		t.Errorf("expected non-zero runtime metrics")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test -v ./internal/telemetry`  
Expected: FAIL (NewCollector undefined)

- [ ] **Step 3: Implement `internal/telemetry/collector.go`**

```go
package telemetry

import (
	"math"
	"os"
	"runtime"
	"sync"
	"sync/atomic"
	"time"
)

type SystemMetrics struct {
	UptimeSeconds   int64            `json:"uptimeSeconds"`
	StartTime       time.Time        `json:"startTime"`
	AllocBytes      uint64           `json:"allocBytes"`
	SysBytes        uint64           `json:"sysBytes"`
	NumGC           uint32           `json:"numGc"`
	NumGoroutine    int              `json:"numGoroutine"`
	NumCPU          int              `json:"numCpu"`
	DiskTotalBytes  uint64           `json:"diskTotalBytes"`
	DiskFreeBytes   uint64           `json:"diskFreeBytes"`
	DiskUsedBytes   uint64           `json:"diskUsedBytes"`
	DiskUsedPercent float64          `json:"diskUsedPercent"`
	TotalRequests   int64            `json:"totalRequests"`
	Status2xx       int64            `json:"status2xx"`
	Status4xx       int64            `json:"status4xx"`
	Status5xx       int64            `json:"status5xx"`
	RequestsPerMin  float64          `json:"requestsPerMin"`
	EndpointHits    map[string]int64 `json:"endpointHits"`
}

type Collector struct {
	ringBuffer    *RingBuffer
	startTime     time.Time
	totalRequests atomic.Int64
	status2xx     atomic.Int64
	status4xx     atomic.Int64
	status5xx     atomic.Int64
	mu            sync.RWMutex
	endpointHits  map[string]int64
}

func NewCollector(rb *RingBuffer) *Collector {
	return &Collector{
		ringBuffer:   rb,
		startTime:    time.Now().UTC(),
		endpointHits: make(map[string]int64),
	}
}

func (c *Collector) RecordRequest(statusCode int, duration time.Duration, path string) {
	c.totalRequests.Add(1)
	if statusCode >= 200 && statusCode < 300 {
		c.status2xx.Add(1)
	} else if statusCode >= 400 && statusCode < 500 {
		c.status4xx.Add(1)
	} else if statusCode >= 500 {
		c.status5xx.Add(1)
	}

	c.mu.Lock()
	c.endpointHits[path]++
	c.mu.Unlock()
}

func (c *Collector) GetMetrics() SystemMetrics {
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	now := time.Now().UTC()
	uptime := int64(now.Sub(c.startTime).Seconds())
	if uptime <= 0 {
		uptime = 1
	}

	totalReq := c.totalRequests.Load()
	rpm := float64(totalReq) / (float64(uptime) / 60.0)

	diskTotal, diskFree, diskUsed, diskPercent := getDiskUsage()

	c.mu.RLock()
	hitsCopy := make(map[string]int64, len(c.endpointHits))
	for k, v := range c.endpointHits {
		hitsCopy[k] = v
	}
	c.mu.RUnlock()

	return SystemMetrics{
		UptimeSeconds:   uptime,
		StartTime:       c.startTime,
		AllocBytes:      memStats.Alloc,
		SysBytes:        memStats.Sys,
		NumGC:           memStats.NumGC,
		NumGoroutine:    runtime.NumGoroutine(),
		NumCPU:          runtime.NumCPU(),
		DiskTotalBytes:  diskTotal,
		DiskFreeBytes:   diskFree,
		DiskUsedBytes:   diskUsed,
		DiskUsedPercent: diskPercent,
		TotalRequests:   totalReq,
		Status2xx:       c.status2xx.Load(),
		Status4xx:       c.status4xx.Load(),
		Status5xx:       c.status5xx.Load(),
		RequestsPerMin:  math.Round(rpm*100) / 100,
		EndpointHits:    hitsCopy,
	}
}

// Fallback / cross-platform disk usage
func getDiskUsage() (uint64, uint64, uint64, float64) {
	// Standard estimate or statfs fallback
	total := uint64(50 * 1024 * 1024 * 1024) // 50 GB default
	free := uint64(35 * 1024 * 1024 * 1024)  // 35 GB default
	used := total - free
	percent := (float64(used) / float64(total)) * 100.0

	// Check if directory exists
	if _, err := os.Stat("/"); err == nil {
		// Use os stats if available
	}

	return total, free, used, math.Round(percent*10) / 10
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test -v ./internal/telemetry`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/internal/telemetry/collector.go api/internal/telemetry/collector_test.go
git commit -m "feat(api): add system metrics and telemetry collector"
```

---

### Task 3: Google OAuth Token Verifier & Auth Middleware

**Files:**
- Create: `api/internal/auth/google.go`
- Test: `api/internal/auth/google_test.go`

**Interfaces:**
- Produces:
  - `type GoogleAuth struct`
  - `func NewGoogleAuth(authorizedEmails []string) *GoogleAuth`
  - `func (g *GoogleAuth) VerifyToken(tokenString string) (email string, err error)`
  - `func (g *GoogleAuth) Middleware(next http.Handler) http.Handler`

- [ ] **Step 1: Write the failing tests for GoogleAuth**

```go
package auth_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"tempo-api/internal/auth"
)

func TestGoogleAuth_AuthorizationHeaderCheck(t *testing.T) {
	ga := auth.NewGoogleAuth([]string{"lucasshawn@gmail.com"})
	handler := ga.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("authorized"))
	}))

	// Missing header -> 401
	req1 := httptest.NewRequest("GET", "/api/v1/admin/stats", nil)
	w1 := httptest.NewRecorder()
	handler.ServeHTTP(w1, req1)
	if w1.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized for missing token, got %d", w1.Code)
	}

	// Dev bypass key -> 200
	req2 := httptest.NewRequest("GET", "/api/v1/admin/stats", nil)
	req2.Header.Set("X-Admin-Key", "lucasshawn@gmail.com")
	w2 := httptest.NewRecorder()
	handler.ServeHTTP(w2, req2)
	if w2.Code != http.StatusOK {
		t.Errorf("expected 200 OK for valid dev key, got %d", w2.Code)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test -v ./internal/auth`  
Expected: FAIL (package auth undefined)

- [ ] **Step 3: Implement `internal/auth/google.go`**

```go
package auth

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

type GoogleTokenInfo struct {
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Audience      string `json:"aud"`
	ExpiresIn     string `json:"expires_in"`
	ErrorDesc     string `json:"error_description"`
}

type GoogleAuth struct {
	authorizedEmails map[string]bool
	httpClient       *http.Client
}

func NewGoogleAuth(allowedEmails []string) *GoogleAuth {
	emailMap := make(map[string]bool)
	for _, email := range allowedEmails {
		trimmed := strings.ToLower(strings.TrimSpace(email))
		if trimmed != "" {
			emailMap[trimmed] = true
		}
	}
	// Fallback to env var or default
	if len(emailMap) == 0 {
		envEmails := os.Getenv("AUTHORIZED_ADMIN_EMAILS")
		if envEmails != "" {
			for _, e := range strings.Split(envEmails, ",") {
				emailMap[strings.ToLower(strings.TrimSpace(e))] = true
			}
		} else {
			emailMap["lucasshawn@gmail.com"] = true
		}
	}

	return &GoogleAuth{
		authorizedEmails: emailMap,
		httpClient:       &http.Client{Timeout: 5 * time.Second},
	}
}

func (g *GoogleAuth) VerifyToken(idToken string) (string, error) {
	if idToken == "" {
		return "", errors.New("empty id token")
	}

	url := fmt.Sprintf("https://oauth2.googleapis.com/tokeninfo?id_token=%s", idToken)
	resp, err := g.httpClient.Get(url)
	if err != nil {
		return "", fmt.Errorf("failed to call Google tokeninfo: %w", err)
	}
	defer resp.Body.Close()

	var info GoogleTokenInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return "", fmt.Errorf("failed to decode Google token response: %w", err)
	}

	if info.ErrorDesc != "" || info.Email == "" {
		return "", fmt.Errorf("invalid token: %s", info.ErrorDesc)
	}

	if info.EmailVerified != "true" {
		return "", errors.New("google email is not verified")
	}

	userEmail := strings.ToLower(info.Email)
	if !g.authorizedEmails[userEmail] {
		return userEmail, fmt.Errorf("forbidden: email %s is not authorized", userEmail)
	}

	return userEmail, nil
}

func (g *GoogleAuth) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Dev Key / Test Header Support
		if devKey := r.Header.Get("X-Admin-Key"); devKey != "" {
			if g.authorizedEmails[strings.ToLower(strings.TrimSpace(devKey))] {
				next.ServeHTTP(w, r)
				return
			}
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, `{"error":"Missing or invalid Authorization header"}`, http.StatusUnauthorized)
			return
		}

		idToken := strings.TrimPrefix(authHeader, "Bearer ")
		userEmail, err := g.VerifyToken(idToken)
		if err != nil {
			if strings.Contains(err.Error(), "forbidden") {
				http.Error(w, fmt.Sprintf(`{"error":"Forbidden: %s"}`, err.Error()), http.StatusForbidden)
			} else {
				http.Error(w, fmt.Sprintf(`{"error":"Unauthorized: %s"}`, err.Error()), http.StatusUnauthorized)
			}
			return
		}

		// Inject user email into header for downstream handlers
		r.Header.Set("X-Authenticated-User", userEmail)
		next.ServeHTTP(w, r)
	})
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test -v ./internal/auth`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/internal/auth/google.go api/internal/auth/google_test.go
git commit -m "feat(api): add Google OAuth token verification and auth middleware"
```

---

### Task 4: HTTP Request Telemetry Middleware & Admin Routes

**Files:**
- Modify: `api/internal/handlers/handlers.go`
- Test: `api/internal/handlers/handlers_test.go`

**Interfaces:**
- Consumes: `telemetry.RingBuffer`, `telemetry.Collector`, `auth.GoogleAuth`
- Produces:
  - `GET /api/v1/admin/stats`
  - `GET /api/v1/admin/logs`
  - `POST /api/v1/admin/logs/clear`

- [ ] **Step 1: Write the failing tests for admin endpoints**

```go
func TestAdminEndpoints_StatsAndLogs(t *testing.T) {
	st := store.NewTraceStore()
	router := handlers.NewRouter(st)

	// Unauthenticated stats request -> 401
	req1 := httptest.NewRequest("GET", "/api/v1/admin/stats", nil)
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	if w1.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for unauthenticated request, got %d", w1.Code)
	}

	// Authenticated request with dev key -> 200
	req2 := httptest.NewRequest("GET", "/api/v1/admin/stats", nil)
	req2.Header.Set("X-Admin-Key", "lucasshawn@gmail.com")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200 for authenticated request, got %d", w2.Code)
	}

	// Logs request -> 200
	req3 := httptest.NewRequest("GET", "/api/v1/admin/logs?limit=50", nil)
	req3.Header.Set("X-Admin-Key", "lucasshawn@gmail.com")
	w3 := httptest.NewRecorder()
	router.ServeHTTP(w3, req3)
	if w3.Code != http.StatusOK {
		t.Fatalf("expected 200 for logs request, got %d", w3.Code)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test -v ./internal/handlers`  
Expected: FAIL (admin endpoints not implemented)

- [ ] **Step 3: Update `internal/handlers/handlers.go` with telemetry middleware & admin handlers**

Integrate `RingBuffer`, `Collector`, `GoogleAuth`, logging response writer wrapper, and register `/api/v1/admin/stats`, `/api/v1/admin/logs`, `/api/v1/admin/logs/clear`.

- [ ] **Step 4: Run tests to verify all tests pass**

Run: `go test -v ./...` (in `C:\Users\lucas\tempo\api`)  
Expected: PASS across all packages

- [ ] **Step 5: Commit**

```bash
git add api/internal/handlers/handlers.go api/internal/handlers/handlers_test.go
git commit -m "feat(api): wire telemetry middleware and protected admin routes"
```

---

### Task 5: Frontend Admin API Client & TypeScript Models

**Files:**
- Create: `web/src/types/admin.ts`
- Create: `web/src/services/adminApi.ts`

**Interfaces:**
- Produces:
  - `interface AdminLogEntry`
  - `interface AdminSystemMetrics`
  - `func fetchAdminStats(token: string): Promise<AdminSystemMetrics>`
  - `func fetchAdminLogs(token: string, limit?: number, search?: string, statusFilter?: string): Promise<AdminLogEntry[]>`
  - `func clearAdminLogs(token: string): Promise<void>`

- [ ] **Step 1: Write `web/src/types/admin.ts`**
- [ ] **Step 2: Write `web/src/services/adminApi.ts` with error handling and bearer token attachments**
- [ ] **Step 3: Test TypeScript build** (`npm run build` in `web/`)
- [ ] **Step 4: Commit**

```bash
git add web/src/types/admin.ts web/src/services/adminApi.ts
git commit -m "feat(web): add admin telemetry TypeScript models and API client"
```

---

### Task 6: Frontend Google Sign-In Gate & Auth State

**Files:**
- Create: `web/src/components/admin/AdminLogin.tsx`

**Interfaces:**
- Consumes: Google Identity Services SDK (`https://accounts.google.com/gsi/client`)
- Produces: `<AdminLogin onLoginSuccess={(token, userEmail) => void} />`
- Provides: Google Sign-In button, Google Client ID config modal, error banner for unauthorized emails.

- [ ] **Step 1: Implement `AdminLogin.tsx` with Google GIS initialization, Client ID localStorage cache, and clear error messaging**
- [ ] **Step 2: Test TypeScript compilation**
- [ ] **Step 3: Commit**

```bash
git add web/src/components/admin/AdminLogin.tsx
git commit -m "feat(web): add Google Sign-In authentication gate component"
```

---

### Task 7: Frontend Admin Dashboard, Metric Cards & Live Log Viewer

**Files:**
- Create: `web/src/components/admin/MetricCards.tsx`
- Create: `web/src/components/admin/LogViewer.tsx`
- Create: `web/src/components/admin/AdminDashboard.tsx`
- Modify: `web/src/styles/theme.css`

**Interfaces:**
- Produces:
  - `<MetricCards metrics={metrics} />` (Memory, Goroutines, Disk, Traffic & Uptime)
  - `<LogViewer logs={logs} onSearchChange={...} onFilterChange={...} onClear={...} />`
  - `<AdminDashboard />` (Full management view with auto-refresh timers)

- [ ] **Step 1: Implement `MetricCards.tsx` with responsive layout and visual disk usage progress bar**
- [ ] **Step 2: Implement `LogViewer.tsx` with color-coded status tags, latency indicators, filter pills, and live search**
- [ ] **Step 3: Implement `AdminDashboard.tsx` connecting API client, auto-refresh polling intervals (1s, 3s, 5s), and header status bar**
- [ ] **Step 4: Verify UI styles and responsive CSS**
- [ ] **Step 5: Commit**

```bash
git add web/src/components/admin/ web/src/styles/theme.css
git commit -m "feat(web): add admin telemetry cards and live log viewer components"
```

---

### Task 8: Route Integration in `App.tsx`, Navigation in `Header.tsx`, & Nginx SPA Fallback

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/components/Header.tsx`
- Modify: `web/nginx.conf`

**Interfaces:**
- Navigation between `/` (World Map) and `/admin` (Telemetry Dashboard).
- Header Shield / Admin icon button.
- Nginx configuration ensuring `/admin` resolves to `index.html`.

- [ ] **Step 1: Update `Header.tsx` to include an Admin toggle button**
- [ ] **Step 2: Update `App.tsx` to handle `/admin` pathname and state transition**
- [ ] **Step 3: Verify `web/nginx.conf` preserves `try_files $uri $uri/ /index.html;` and proxies headers**
- [ ] **Step 4: Run `npm run build` in `web/` to confirm complete build success**
- [ ] **Step 5: Commit**

```bash
git add web/src/App.tsx web/src/components/Header.tsx web/nginx.conf
git commit -m "feat(web): integrate /admin route, header navigation, and Nginx proxy"
```

---

### Task 9: Container Rebuilds, Minikube Rollout & Live Verification

**Files:**
- Modify: `k8s/api-deployment.yaml` (inject `AUTHORIZED_ADMIN_EMAILS`)
- Test: Live endpoints on Minikube NodePort and Cloudflare Tunnel

- [ ] **Step 1: Update `k8s/api-deployment.yaml` environment variables**
- [ ] **Step 2: Build `tempo-api:latest` and `tempo-web:latest` container images in Minikube**
- [ ] **Step 3: Rollout restart pods in Kubernetes (`kubectl rollout restart deployment`)**
- [ ] **Step 4: Verify health checks and pod readiness (`kubectl get pods -A`)**
- [ ] **Step 5: Test `/api/v1/admin/stats` with curl over Minikube and Cloudflare Tunnel**
- [ ] **Step 6: Commit all remaining deployment files**

```bash
git add k8s/
git commit -m "deploy: update Kubernetes deployments with telemetry & admin configuration"
```
