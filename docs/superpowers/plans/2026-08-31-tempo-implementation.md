# Tempo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy Tempo—an interactive temporal-spatial trace context visualization web application with vintage cartographic styling, dynamic spatial clustering, timeline scrubber, Go API backend, and Minikube Kubernetes deployment.

**Architecture:** A decoupled microservice architecture consisting of a high-performance Go REST API (`tempo-api`) with in-memory spatial grid clustering, a React + TypeScript + Leaflet frontend (`tempo-web`) styled after the antique parchment reference design, and Kubernetes manifests for local deployment on Minikube.

**Tech Stack:** Go 1.21+, React 18, TypeScript, Vite, Leaflet, CSS3 Custom Properties, Docker, Minikube, Kubectl.

## Global Constraints

- Repository root is `C:\Users\lucas\tempo`.
- Frontend design and palette must faithfully reflect `docs/assets/reference-ui.png` (parchment landmasses, muted slate waters, celestial coordinate circle, gold single-event rings, dark charcoal/gold numbered cluster badges, floating glassmorphic date pill, timeline slider with playback controls).
- Backend must be written in standard Go with zero external C-dependencies for clean cross-compilation into scratch/alpine containers.
- All code, configuration, Dockerfiles, and manifests must reside within the `tempo` repository.

---

### Task 1: Go Backend Data Model & Mock Generator

**Files:**
- Create: `api/go.mod`
- Create: `api/internal/models/trace.go`
- Create: `api/internal/generator/seed.go`
- Test: `api/internal/generator/seed_test.go`

**Interfaces:**
- Produces: `models.TraceContext`, `models.TimelineSummary`, `generator.GenerateSeedTraces(count int) []models.TraceContext`

- [ ] **Step 1: Write the failing test for seed generator**

```go
// api/internal/generator/seed_test.go
package generator_test

import (
	"testing"
	"tempo-api/internal/generator"
)

func TestGenerateSeedTraces(t *testing.T) {
	count := 50
	traces := generator.GenerateSeedTraces(count)
	if len(traces) != count {
		t.Fatalf("expected %d traces, got %d", count, len(traces))
	}
	for i, tr := range traces {
		if tr.ID == "" {
			t.Errorf("trace %d has empty ID", i)
		}
		if tr.Latitude < -90 || tr.Latitude > 90 {
			t.Errorf("trace %d has invalid latitude: %f", i, tr.Latitude)
		}
		if tr.Longitude < -180 || tr.Longitude > 180 {
			t.Errorf("trace %d has invalid longitude: %f", i, tr.Longitude)
		}
		if tr.Timestamp.IsZero() {
			t.Errorf("trace %d has zero timestamp", i)
		}
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:\Users\lucas\tempo\api; go test ./internal/generator/...`
Expected: FAIL (missing module/package)

- [ ] **Step 3: Implement data models and seed generator**

Create `api/go.mod`:
```go
module tempo-api

go 1.21
```

Create `api/internal/models/trace.go`:
```go
package models

import "time"

type TraceContext struct {
	ID        string                 `json:"id"`
	Title     string                 `json:"title"`
	Latitude  float64                `json:"latitude"`
	Longitude float64                `json:"longitude"`
	Timestamp time.Time              `json:"timestamp"`
	Region    string                 `json:"region"`
	Category  string                 `json:"category"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

type ClusterBounds struct {
	MinLat float64 `json:"minLat"`
	MinLng float64 `json:"minLng"`
	MaxLat float64 `json:"maxLat"`
	MaxLng float64 `json:"maxLng"`
}

type TraceCluster struct {
	ID        string         `json:"id"`
	Latitude  float64        `json:"latitude"`
	Longitude float64        `json:"longitude"`
	Count     int            `json:"count"`
	IsCluster bool           `json:"isCluster"`
	Bounds    ClusterBounds  `json:"bounds"`
	Event     *TraceContext  `json:"event,omitempty"`
}

type ClusteredResponse struct {
	Time        time.Time      `json:"time"`
	TotalEvents int            `json:"totalEvents"`
	Clusters    []TraceCluster `json:"clusters"`
}

type TimelineSummary struct {
	StartTime   time.Time   `json:"startTime"`
	EndTime     time.Time   `json:"endTime"`
	TimeSlices  []time.Time `json:"timeSlices"`
	TotalEvents int         `json:"totalEvents"`
}
```

Create `api/internal/generator/seed.go`:
```go
package generator

import (
	"fmt"
	"math/rand"
	"time"
	"tempo-api/internal/models"
)

func GenerateSeedTraces(count int) []models.TraceContext {
	r := rand.New(rand.NewSource(42)) // deterministic seed
	baseTime := time.Date(2024, 6, 7, 10, 0, 0, 0, time.UTC)

	// Anchors across global hubs (Americas, Europe, Asia, etc.)
	hubs := []struct {
		region string
		lat    float64
		lng    float64
	}{
		{"North America - East", 40.7128, -74.0060},
		{"North America - West", 37.7749, -122.4194},
		{"North America - Central", 30.2672, -97.7431},
		{"North America - South", 25.7617, -80.1918},
		{"Caribbean", 18.2208, -66.5901},
		{"Europe - West", 51.5074, -0.1278},
		{"Europe - Central", 52.5200, 13.4050},
		{"Asia - East", 35.6762, 139.6503},
		{"Asia - South", 1.3521, 103.8198},
		{"Latin America", -23.5505, -46.6333},
	}

	categories := []string{"deployment", "telemetry", "mesh-sync", "edge-probe", "anomaly"}
	traces := make([]models.TraceContext, count)

	for i := 0; i < count; i++ {
		hub := hubs[i%len(hubs)]
		// Add slight jitter to coordinate
		latJitter := (r.Float64() - 0.5) * 4.0
		lngJitter := (r.Float64() - 0.5) * 6.0
		
		// Slices across distinct intervals (every 15-30 minutes across 8 hours)
		minuteOffset := (i % 16) * 30
		ts := baseTime.Add(time.Duration(minuteOffset) * time.Minute)

		cat := categories[r.Intn(len(categories))]
		traces[i] = models.TraceContext{
			ID:        fmt.Sprintf("tc-%04d", i+1),
			Title:     fmt.Sprintf("%s Node Probe #%d", hub.region, i+1),
			Latitude:  hub.lat + latJitter,
			Longitude: hub.lng + lngJitter,
			Timestamp: ts,
			Region:    hub.region,
			Category:  cat,
			Metadata: map[string]interface{}{
				"status":    "active",
				"latencyMs": 20 + r.Intn(100),
				"severity":  "info",
			},
		}
	}

	return traces
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:\Users\lucas\tempo\api; go test ./internal/generator/... -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/go.mod api/internal/models/ api/internal/generator/
git commit -m "feat(api): add trace models and deterministic seed generator"
```

---

### Task 2: Spatial Grid Clustering Engine & Store

**Files:**
- Create: `api/internal/clustering/grid.go`
- Test: `api/internal/clustering/grid_test.go`
- Create: `api/internal/store/store.go`
- Test: `api/internal/store/store_test.go`

**Interfaces:**
- Produces: `clustering.ClusterTraces(traces []models.TraceContext, zoomLevel int) []models.TraceCluster`
- Produces: `store.NewTraceStore(initial []models.TraceContext) *TraceStore`
- Produces: `store.GetTimelineSummary() models.TimelineSummary`
- Produces: `store.GetTracesForTimeSlice(target time.Time, zoom int) models.ClusteredResponse`

- [ ] **Step 1: Write the failing tests for clustering and store**

```go
// api/internal/clustering/grid_test.go
package clustering_test

import (
	"testing"
	"time"
	"tempo-api/internal/clustering"
	"tempo-api/internal/models"
)

func TestClusterTraces_Grouping(t *testing.T) {
	now := time.Now()
	// Two points close together in NYC
	t1 := models.TraceContext{ID: "1", Latitude: 40.71, Longitude: -74.00, Timestamp: now}
	t2 := models.TraceContext{ID: "2", Latitude: 40.75, Longitude: -73.98, Timestamp: now}
	// One point in London
	t3 := models.TraceContext{ID: "3", Latitude: 51.50, Longitude: -0.12, Timestamp: now}

	// At low zoom (global level zoom = 2), NYC points should form 1 cluster of 2
	clusters := clustering.ClusterTraces([]models.TraceContext{t1, t2, t3}, 2)
	if len(clusters) != 2 {
		t.Fatalf("expected 2 clusters/markers at zoom 2, got %d", len(clusters))
	}

	foundCluster := false
	for _, c := range clusters {
		if c.Count == 2 {
			foundCluster = true
			if !c.IsCluster {
				t.Errorf("expected isCluster to be true for count 2")
			}
		}
	}
	if !foundCluster {
		t.Errorf("did not find cluster with count 2")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:\Users\lucas\tempo\api; go test ./internal/clustering/...`
Expected: FAIL

- [ ] **Step 3: Implement clustering grid algorithm and store**

Create `api/internal/clustering/grid.go`:
```go
package clustering

import (
	"fmt"
	"math"
	"tempo-api/internal/models"
)

func getGridSize(zoom int) float64 {
	// Degrees per cell based on zoom level (e.g. 500sqmi ~ 3-5 deg at global zoom 2)
	switch {
	case zoom <= 2:
		return 8.0
	case zoom <= 4:
		return 4.0
	case zoom <= 6:
		return 1.5
	case zoom <= 8:
		return 0.5
	case zoom <= 10:
		return 0.1
	default:
		return 0.02
	}
}

func ClusterTraces(traces []models.TraceContext, zoom int) []models.TraceCluster {
	if len(traces) == 0 {
		return []models.TraceCluster{}
	}

	gridSize := getGridSize(zoom)
	type cellAccumulator struct {
		traces   []models.TraceContext
		sumLat   float64
		sumLng   float64
		minLat   float64
		minLng   float64
		maxLat   float64
		maxLng   float64
	}

	grid := make(map[string]*cellAccumulator)

	for _, tr := range traces {
		cellX := int(math.Floor(tr.Longitude / gridSize))
		cellY := int(math.Floor(tr.Latitude / gridSize))
		key := fmt.Sprintf("%d:%d", cellX, cellY)

		acc, exists := grid[key]
		if !exists {
			acc = &cellAccumulator{
				traces: []models.TraceContext{},
				minLat: tr.Latitude,
				minLng: tr.Longitude,
				maxLat: tr.Latitude,
				maxLng: tr.Longitude,
			}
			grid[key] = acc
		}

		acc.traces = append(acc.traces, tr)
		acc.sumLat += tr.Latitude
		acc.sumLng += tr.Longitude
		if tr.Latitude < acc.minLat {
			acc.minLat = tr.Latitude
		}
		if tr.Latitude > acc.maxLat {
			acc.maxLat = tr.Latitude
		}
		if tr.Longitude < acc.minLng {
			acc.minLng = tr.Longitude
		}
		if tr.Longitude > acc.maxLng {
			acc.maxLng = tr.Longitude
		}
	}

	clusters := make([]models.TraceCluster, 0, len(grid))
	idx := 0
	for key, acc := range grid {
		count := len(acc.traces)
		avgLat := acc.sumLat / float64(count)
		avgLng := acc.sumLng / float64(count)

		if count == 1 {
			tr := acc.traces[0]
			clusters = append(clusters, models.TraceCluster{
				ID:        fmt.Sprintf("single-%s", tr.ID),
				Latitude:  tr.Latitude,
				Longitude: tr.Longitude,
				Count:     1,
				IsCluster: false,
				Bounds: models.ClusterBounds{
					MinLat: tr.Latitude,
					MinLng: tr.Longitude,
					MaxLat: tr.Latitude,
					MaxLng: tr.Longitude,
				},
				Event: &tr,
			})
		} else {
			clusters = append(clusters, models.TraceCluster{
				ID:        fmt.Sprintf("cluster-%s-%d", key, idx),
				Latitude:  avgLat,
				Longitude: avgLng,
				Count:     count,
				IsCluster: true,
				Bounds: models.ClusterBounds{
					MinLat: acc.minLat,
					MinLng: acc.minLng,
					MaxLat: acc.maxLat,
					MaxLng: acc.maxLng,
				},
			})
		}
		idx++
	}

	return clusters
}
```

Create `api/internal/store/store.go`:
```go
package store

import (
	"sort"
	"sync"
	"time"
	"tempo-api/internal/clustering"
	"tempo-api/internal/models"
)

type TraceStore struct {
	mu     sync.RWMutex
	traces []models.TraceContext
}

func NewTraceStore(initial []models.TraceContext) *TraceStore {
	s := &TraceStore{traces: make([]models.TraceContext, len(initial))}
	copy(s.traces, initial)
	s.sortTraces()
	return s
}

func (s *TraceStore) sortTraces() {
	sort.Slice(s.traces, func(i, j int) bool {
		return s.traces[i].Timestamp.Before(s.traces[j].Timestamp)
	})
}

func (s *TraceStore) AddTrace(tr models.TraceContext) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.traces = append(s.traces, tr)
	s.sortTraces()
}

func (s *TraceStore) GetTimelineSummary() models.TimelineSummary {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if len(s.traces) == 0 {
		now := time.Now().UTC()
		return models.TimelineSummary{
			StartTime:   now,
			EndTime:     now,
			TimeSlices:  []time.Time{now},
			TotalEvents: 0,
		}
	}

	sliceMap := make(map[int64]time.Time)
	for _, tr := range s.traces {
		// Round to nearest minute for discrete slices
		rounded := tr.Timestamp.Truncate(time.Minute)
		sliceMap[rounded.Unix()] = rounded
	}

	slices := make([]time.Time, 0, len(sliceMap))
	for _, t := range sliceMap {
		slices = append(slices, t)
	}
	sort.Slice(slices, func(i, j int) bool {
		return slices[i].Before(slices[j])
	})

	return models.TimelineSummary{
		StartTime:   s.traces[0].Timestamp,
		EndTime:     s.traces[len(s.traces)-1].Timestamp,
		TimeSlices:  slices,
		TotalEvents: len(s.traces),
	}
}

func (s *TraceStore) GetTracesForTimeSlice(target time.Time, zoom int) models.ClusteredResponse {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if len(s.traces) == 0 {
		return models.ClusteredResponse{
			Time:        target,
			TotalEvents: 0,
			Clusters:    []models.TraceCluster{},
		}
	}

	// Match traces within a 15-minute window of the target slice
	const window = 15 * time.Minute
	matched := make([]models.TraceContext, 0)

	for _, tr := range s.traces {
		diff := tr.Timestamp.Sub(target)
		if diff < 0 {
			diff = -diff
		}
		if diff <= window {
			matched = append(matched, tr)
		}
	}

	// If no exact window matches, find closest
	if len(matched) == 0 && len(s.traces) > 0 {
		var closest models.TraceContext
		minDiff := time.Duration(1<<63 - 1)
		for _, tr := range s.traces {
			diff := tr.Timestamp.Sub(target)
			if diff < 0 {
				diff = -diff
			}
			if diff < minDiff {
				minDiff = diff
				closest = tr
			}
		}
		matched = append(matched, closest)
	}

	clusters := clustering.ClusterTraces(matched, zoom)

	return models.ClusteredResponse{
		Time:        target,
		TotalEvents: len(matched),
		Clusters:    clusters,
	}
}
```

Create `api/internal/store/store_test.go`:
```go
package store_test

import (
	"testing"
	"time"
	"tempo-api/internal/models"
	"tempo-api/internal/store"
)

func TestStore_TimelineAndSlices(t *testing.T) {
	t1 := time.Date(2024, 6, 7, 12, 0, 0, 0, time.UTC)
	t2 := time.Date(2024, 6, 7, 13, 0, 0, 0, time.UTC)

	traces := []models.TraceContext{
		{ID: "1", Latitude: 40.0, Longitude: -70.0, Timestamp: t1},
		{ID: "2", Latitude: 41.0, Longitude: -71.0, Timestamp: t2},
	}

	st := store.NewTraceStore(traces)
	summary := st.GetTimelineSummary()

	if summary.TotalEvents != 2 {
		t.Fatalf("expected 2 total events, got %d", summary.TotalEvents)
	}
	if len(summary.TimeSlices) != 2 {
		t.Fatalf("expected 2 distinct slices, got %d", len(summary.TimeSlices))
	}

	resp := st.GetTracesForTimeSlice(t1, 2)
	if resp.TotalEvents != 1 {
		t.Errorf("expected 1 event at t1 slice, got %d", resp.TotalEvents)
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd C:\Users\lucas\tempo\api; go test ./internal/... -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/internal/clustering/ api/internal/store/
git commit -m "feat(api): implement spatial grid clustering and time-slice store"
```

---

### Task 3: REST API Handlers, Routing & Main Entrypoint

**Files:**
- Create: `api/internal/handlers/handlers.go`
- Test: `api/internal/handlers/handlers_test.go`
- Create: `api/cmd/server/main.go`

**Interfaces:**
- Produces: `handlers.NewRouter(store *store.TraceStore) http.Handler`
- Endpoints:
  - `GET /healthz`
  - `GET /api/v1/timeline`
  - `GET /api/v1/traces`
  - `POST /api/v1/traces`

- [ ] **Step 1: Write the failing tests for API handlers**

```go
// api/internal/handlers/handlers_test.go
package handlers_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"tempo-api/internal/handlers"
	"tempo-api/internal/models"
	"tempo-api/internal/store"
)

func TestHealthCheck(t *testing.T) {
	st := store.NewTraceStore(nil)
	router := handlers.NewRouter(st)

	req := httptest.NewRequest("GET", "/healthz", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
}

func TestTimelineHandler(t *testing.T) {
	now := time.Now().UTC()
	st := store.NewTraceStore([]models.TraceContext{
		{ID: "t1", Latitude: 30, Longitude: -90, Timestamp: now},
	})
	router := handlers.NewRouter(st)

	req := httptest.NewRequest("GET", "/api/v1/timeline", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:\Users\lucas\tempo\api; go test ./internal/handlers/...`
Expected: FAIL

- [ ] **Step 3: Implement handlers, CORS middleware, and main server**

Create `api/internal/handlers/handlers.go`:
```go
package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"
	"tempo-api/internal/models"
	"tempo-api/internal/store"
)

type Handler struct {
	store *store.TraceStore
}

func NewRouter(st *store.TraceStore) http.Handler {
	h := &Handler{store: st}
	mux := http.NewServeMux()

	mux.HandleFunc("/healthz", h.handleHealth)
	mux.HandleFunc("/api/v1/timeline", h.handleTimeline)
	mux.HandleFunc("/api/v1/traces", h.handleTraces)

	return corsMiddleware(mux)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (h *Handler) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "tempo-api"})
}

func (h *Handler) handleTimeline(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	summary := h.store.GetTimelineSummary()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

func (h *Handler) handleTraces(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		timeStr := r.URL.Query().Get("time")
		zoomStr := r.URL.Query().Get("zoom")

		targetTime := time.Now().UTC()
		if timeStr != "" {
			if parsed, err := time.Parse(time.RFC3339, timeStr); err == nil {
				targetTime = parsed
			}
		}

		zoom := 2
		if zoomStr != "" {
			if z, err := strconv.Atoi(zoomStr); err == nil && z >= 0 {
				zoom = z
			}
		}

		resp := h.store.GetTracesForTimeSlice(targetTime, zoom)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)

	case http.MethodPost:
		var tr models.TraceContext
		if err := json.NewDecoder(r.Body).Decode(&tr); err != nil {
			http.Error(w, "Invalid JSON payload: "+err.Error(), http.StatusBadRequest)
			return
		}
		if tr.ID == "" {
			tr.ID = "tc-" + strconv.FormatInt(time.Now().UnixNano(), 36)
		}
		if tr.Timestamp.IsZero() {
			tr.Timestamp = time.Now().UTC()
		}
		h.store.AddTrace(tr)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(tr)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
```

Create `api/cmd/server/main.go`:
```go
package main

import (
	"log"
	"net/http"
	"os"
	"tempo-api/internal/generator"
	"tempo-api/internal/handlers"
	"tempo-api/internal/store"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("Initializing Tempo Trace Store with 80 deterministic global trace contexts...")
	initialTraces := generator.GenerateSeedTraces(80)
	traceStore := store.NewTraceStore(initialTraces)

	router := handlers.NewRouter(traceStore)

	log.Printf("Tempo API server listening on :%s\n", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("Server stopped: %v", err)
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:\Users\lucas\tempo\api; go test ./... -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/internal/handlers/ api/cmd/server/
git commit -m "feat(api): implement REST API endpoints, CORS, and server entrypoint"
```

---

### Task 4: Frontend Scaffolding, Theme & Types

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/vite.config.ts`
- Create: `web/index.html`
- Create: `web/src/types/trace.ts`
- Create: `web/src/styles/theme.css`
- Create: `web/src/services/api.ts`

**Interfaces:**
- Produces: `TimelineSummary`, `ClusteredResponse`, `TraceCluster`, `fetchTimelineSummary()`, `fetchTraces(time, zoom)`

- [ ] **Step 1: Scaffold package.json and install dependencies**

Create `web/package.json`:
```json
{
  "name": "tempo-web",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "leaflet": "^1.9.4",
    "lucide-react": "^0.344.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.8",
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.6"
  }
}
```

- [ ] **Step 2: Run npm install**

Run: `cd C:\Users\lucas\tempo\web; npm install`
Expected: packages installed successfully

- [ ] **Step 3: Create configuration files, TypeScript definitions, and API client**

Create `web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

Create `web/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
});
```

Create `web/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Tempo — Global Trace Contexts</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `web/src/types/trace.ts`:
```typescript
export interface TraceContext {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  region: string;
  category: string;
  metadata?: Record<string, any>;
}

export interface ClusterBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface TraceCluster {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  isCluster: boolean;
  bounds: ClusterBounds;
  event?: TraceContext;
}

export interface ClusteredResponse {
  time: string;
  totalEvents: number;
  clusters: TraceCluster[];
}

export interface TimelineSummary {
  startTime: string;
  endTime: string;
  timeSlices: string[];
  totalEvents: number;
}
```

Create `web/src/styles/theme.css`:
```css
:root {
  --color-bg-water: #788998;
  --color-land-parchment: #e8dfc8;
  --color-land-border: #cfc2a7;
  --color-gold-bright: #e5c158;
  --color-gold-dark: #b88e28;
  --color-gold-border: #d4af37;
  --color-slate-badge: #242c34;
  --color-text-main: #2b2b2b;
  --color-text-light: #f5f3eb;
  --color-glass-bg: rgba(30, 36, 42, 0.78);
  --color-glass-border: rgba(212, 175, 55, 0.35);
  --font-serif-display: 'Cinzel', serif, Georgia;
  --font-sans-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

body, html, #root {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--color-bg-water);
  font-family: var(--font-sans-body);
  user-select: none;
}

/* Vintage parchment filter for map tiles */
.vintage-parchment-tiles {
  filter: sepia(0.35) contrast(0.95) brightness(1.02) hue-rotate(-12deg);
}

/* Orbit circle overlay */
.orbital-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(85vw, 680px);
  height: min(85vw, 680px);
  border: 1.5px dashed rgba(255, 255, 255, 0.45);
  border-radius: 50%;
  pointer-events: none;
  z-index: 500;
  box-shadow: 0 0 40px rgba(255, 255, 255, 0.05);
}

/* Marker Styling */
.marker-cluster-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, #2d3742 0%, #1c232b 100%);
  border: 2px solid var(--color-gold-bright);
  outline: 3px solid rgba(212, 175, 55, 0.35);
  border-radius: 50%;
  color: #ffffff;
  font-weight: 600;
  font-size: 15px;
  font-family: var(--font-sans-body);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45), 0 0 12px rgba(229, 193, 88, 0.35);
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.marker-cluster-badge:hover {
  transform: scale(1.12);
}

.marker-single-ring {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid var(--color-gold-bright);
  background: rgba(229, 193, 88, 0.15);
  box-shadow: 0 0 10px rgba(229, 193, 88, 0.4);
}

.marker-single-ring::after {
  content: '';
  width: 6px;
  height: 6px;
  background: var(--color-gold-bright);
  border-radius: 50%;
  box-shadow: 0 0 4px #fff;
}
```

Create `web/src/services/api.ts`:
```typescript
import { ClusteredResponse, TimelineSummary, TraceContext } from '../types/trace';

const API_BASE = '/api/v1';

export async function fetchTimelineSummary(): Promise<TimelineSummary> {
  const res = await fetch(`${API_BASE}/timeline`);
  if (!res.ok) throw new Error(`Failed to fetch timeline: ${res.statusText}`);
  return res.json();
}

export async function fetchTraces(timeIso: string, zoom: number): Promise<ClusteredResponse> {
  const url = `${API_BASE}/traces?time=${encodeURIComponent(timeIso)}&zoom=${zoom}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch traces: ${res.statusText}`);
  return res.json();
}

export async function createTrace(trace: Partial<TraceContext>): Promise<TraceContext> {
  const res = await fetch(`${API_BASE}/traces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trace),
  });
  if (!res.ok) throw new Error(`Failed to create trace: ${res.statusText}`);
  return res.json();
}
```

- [ ] **Step 4: Build TypeScript verification**

Run: `cd C:\Users\lucas\tempo\web; npm run build`
Expected: Compile check passes

- [ ] **Step 5: Commit**

```bash
git add web/
git commit -m "feat(web): scaffold Vite project, theme, types, and API client"
```

---

### Task 5: World Map Component & Bespoke Markers

**Files:**
- Create: `web/src/components/WorldMap.tsx`
- Create: `web/src/components/ClusterMarker.tsx`
- Modify: `web/src/App.tsx`

**Interfaces:**
- Produces: `<WorldMap clusters={clusters} zoom={zoom} onZoomChange={setZoom} onSelectCluster={...} />`

- [ ] **Step 1: Implement ClusterMarker generator with Leaflet DivIcons**

Create `web/src/components/ClusterMarker.tsx`:
```typescript
import L from 'leaflet';
import { TraceCluster } from '../types/trace';

export function createClusterIcon(cluster: TraceCluster): L.DivIcon {
  if (!cluster.isCluster) {
    return L.divIcon({
      className: 'custom-single-marker',
      html: `<div class="marker-single-ring" style="width: 22px; height: 22px;"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }

  // Size badge according to count magnitude
  const size = Math.min(54, Math.max(34, 30 + Math.floor(Math.log10(cluster.count + 1) * 12)));

  return L.divIcon({
    className: 'custom-cluster-marker',
    html: `<div class="marker-cluster-badge" style="width: ${size}px; height: ${size}px;">${cluster.count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
```

- [ ] **Step 2: Implement WorldMap Leaflet Component with custom cartography styling**

Create `web/src/components/WorldMap.tsx`:
```tsx
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { TraceCluster } from '../types/trace';
import { createClusterIcon } from './ClusterMarker';

interface WorldMapProps {
  clusters: TraceCluster[];
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onSelectCluster?: (cluster: TraceCluster) => void;
}

export const WorldMap: React.FC<WorldMapProps> = ({
  clusters,
  zoom,
  onZoomChange,
  onSelectCluster,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [38.0, -95.0], // Centered on North America initially as in mockup
      zoom: 3,
      minZoom: 2,
      maxZoom: 10,
      zoomControl: false,
      attributionControl: false,
    });

    // Clean cartographic tile layer with warm parchment filter
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
      className: 'vintage-parchment-tiles',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Subtle country labels
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
      className: 'vintage-parchment-tiles',
      subdomains: 'abcd',
      maxZoom: 19,
      opacity: 0.65,
    }).addTo(map);

    const markerGroup = L.layerGroup().addTo(map);
    markerGroupRef.current = markerGroup;

    map.on('zoomend', () => {
      onZoomChange(map.getZoom());
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers on clusters change
  useEffect(() => {
    if (!mapInstanceRef.current || !markerGroupRef.current) return;

    markerGroupRef.current.clearLayers();

    clusters.forEach((c) => {
      const icon = createClusterIcon(c);
      const marker = L.marker([c.latitude, c.longitude], { icon });

      marker.on('click', () => {
        if (onSelectCluster) {
          onSelectCluster(c);
        }
        if (c.isCluster && mapInstanceRef.current) {
          mapInstanceRef.current.setView([c.latitude, c.longitude], mapInstanceRef.current.getZoom() + 1);
        }
      });

      markerGroupRef.current?.addLayer(marker);
    });
  }, [clusters, onSelectCluster]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      <div className="orbital-ring" />
    </div>
  );
};
```

- [ ] **Step 3: Verify build**

Run: `cd C:\Users\lucas\tempo\web; npm run build`
Expected: Compile check passes

- [ ] **Step 4: Commit**

```bash
git add web/src/components/WorldMap.tsx web/src/components/ClusterMarker.tsx
git commit -m "feat(web): add WorldMap component with custom vintage styling and cluster markers"
```

---

### Task 6: Timeline Overlay, Scrubber, Header & Full Integration

**Files:**
- Create: `web/src/components/Header.tsx`
- Create: `web/src/components/TimelineOverlay.tsx`
- Create: `web/src/App.tsx`
- Create: `web/src/main.tsx`

**Interfaces:**
- Full user interface matching reference mockup: Header, Map, Floating Date/Time Badge, Timeline Scrubber with event snapping, and Play/Pause controller.

- [ ] **Step 1: Implement Header component**

Create `web/src/components/Header.tsx`:
```tsx
import React from 'react';
import { MoreHorizontal } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 1000,
      pointerEvents: 'none',
    }}>
      {/* Left Astro/Compass Symbol */}
      <div style={{
        pointerEvents: 'auto',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: '1.5px solid var(--color-gold-bright)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}>
        <div style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-gold-bright)',
        }} />
      </div>

      {/* Center Title */}
      <h1 style={{
        fontFamily: 'var(--font-serif-display)',
        fontSize: '18px',
        letterSpacing: '0.35em',
        color: '#2d3339',
        fontWeight: 600,
        textTransform: 'uppercase',
      }}>
        W O R L D
      </h1>

      {/* Right Options */}
      <button style={{
        pointerEvents: 'auto',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: '1.5px solid var(--color-gold-bright)',
        backgroundColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--color-gold-bright)',
      }}>
        <MoreHorizontal size={18} />
      </button>
    </header>
  );
};
```

- [ ] **Step 2: Implement TimelineOverlay component**

Create `web/src/components/TimelineOverlay.tsx`:
```tsx
import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface TimelineOverlayProps {
  timeSlices: string[];
  currentIndex: number;
  isPlaying: boolean;
  onIndexChange: (index: number) => void;
  onTogglePlay: () => void;
  onReset: () => void;
}

export const TimelineOverlay: React.FC<TimelineOverlayProps> = ({
  timeSlices,
  currentIndex,
  isPlaying,
  onIndexChange,
  onTogglePlay,
  onReset,
}) => {
  const currentIso = timeSlices[currentIndex] || new Date().toISOString();
  const dateObj = new Date(currentIso);

  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();

  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingBottom: '32px',
      zIndex: 1000,
      pointerEvents: 'none',
      gap: '14px',
    }}>
      {/* Floating Date/Time Badge */}
      <div style={{
        pointerEvents: 'auto',
        backgroundColor: 'var(--color-glass-bg)',
        border: '1px solid var(--color-glass-border)',
        borderRadius: '24px',
        padding: '8px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      }}>
        <span style={{
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '0.08em',
        }}>
          {formattedDate}
        </span>
        <span style={{
          color: '#cbd5e1',
          fontSize: '13px',
          fontWeight: 400,
        }}>
          {formattedTime}
        </span>
      </div>

      {/* Horizontal Scrubber */}
      <div style={{
        pointerEvents: 'auto',
        width: 'min(90vw, 560px)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        height: '24px',
      }}>
        {/* Track Line */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '2px',
          backgroundColor: 'rgba(255, 255, 255, 0.45)',
          borderRadius: '1px',
        }} />

        {/* Discrete Ticks for Slices */}
        {timeSlices.map((_, i) => {
          const pct = timeSlices.length > 1 ? (i / (timeSlices.length - 1)) * 100 : 50;
          const isPassed = i <= currentIndex;
          return (
            <div
              key={i}
              onClick={() => onIndexChange(i)}
              style={{
                position: 'absolute',
                left: `${pct}%`,
                transform: 'translateX(-50%)',
                width: i === currentIndex ? '14px' : '6px',
                height: i === currentIndex ? '14px' : '6px',
                borderRadius: '50%',
                backgroundColor: isPassed ? 'var(--color-gold-bright)' : 'rgba(255,255,255,0.6)',
                border: i === currentIndex ? '2px solid #ffffff' : 'none',
                boxShadow: i === currentIndex ? '0 0 8px var(--color-gold-bright)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            />
          );
        })}

        {/* Native Range for Accessibility & Dragging */}
        <input
          type="range"
          min={0}
          max={Math.max(0, timeSlices.length - 1)}
          value={currentIndex}
          onChange={(e) => onIndexChange(Number(e.target.value))}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            width: '100%',
            opacity: 0,
            cursor: 'pointer',
            height: '24px',
            margin: 0,
          }}
        />
      </div>

      {/* Play/Control Button */}
      <div style={{ display: 'flex', gap: '12px', pointerEvents: 'auto' }}>
        <button
          onClick={onReset}
          title="Reset to first timestamp"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-slate-badge)',
            border: '1.5px solid var(--color-gold-bright)',
            color: 'var(--color-gold-bright)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
          }}
        >
          <RotateCcw size={16} />
        </button>

        <button
          onClick={onTogglePlay}
          title={isPlaying ? 'Pause playback' : 'Play timeline'}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-slate-badge)',
            border: '2px solid var(--color-gold-bright)',
            color: 'var(--color-gold-bright)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
            transition: 'transform 0.15s ease',
          }}
        >
          {isPlaying ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: '2px' }} />}
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Integrate state in App.tsx and main.tsx**

Create `web/src/App.tsx`:
```tsx
import React, { useEffect, useState } from 'react';
import { WorldMap } from './components/WorldMap';
import { Header } from './components/Header';
import { TimelineOverlay } from './components/TimelineOverlay';
import { fetchTimelineSummary, fetchTraces } from './services/api';
import { TimelineSummary, TraceCluster } from './types/trace';

export const App: React.FC = () => {
  const [timeline, setTimeline] = useState<TimelineSummary | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(3);
  const [clusters, setClusters] = useState<TraceCluster[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Initial Timeline Fetch
  useEffect(() => {
    fetchTimelineSummary()
      .then((data) => {
        setTimeline(data);
        if (data.timeSlices.length > 0) {
          setCurrentIndex(0);
        }
      })
      .catch((err) => {
        console.error('Failed to load timeline:', err);
        setError('Failed to connect to Tempo API backend');
      });
  }, []);

  // 2. Fetch Traces on time slice or zoom change
  useEffect(() => {
    if (!timeline || timeline.timeSlices.length === 0) return;

    const currentIso = timeline.timeSlices[currentIndex];
    fetchTraces(currentIso, zoom)
      .then((res) => {
        setClusters(res.clusters);
      })
      .catch((err) => {
        console.error('Failed to load traces:', err);
      });
  }, [timeline, currentIndex, zoom]);

  // 3. Playback timer
  useEffect(() => {
    if (!isPlaying || !timeline || timeline.timeSlices.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= timeline.timeSlices.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1800);

    return () => clearInterval(timer);
  }, [isPlaying, timeline]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Header />
      <WorldMap
        clusters={clusters}
        zoom={zoom}
        onZoomChange={setZoom}
      />
      {timeline && timeline.timeSlices.length > 0 && (
        <TimelineOverlay
          timeSlices={timeline.timeSlices}
          currentIndex={currentIndex}
          isPlaying={isPlaying}
          onIndexChange={(idx) => setCurrentIndex(idx)}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onReset={() => {
            setCurrentIndex(0);
            setIsPlaying(false);
          }}
        />
      )}
      {error && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#991b1b',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: '8px',
          zIndex: 2000,
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}
    </div>
  );
};
```

Create `web/src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/theme.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: Build frontend and verify no TypeScript or bundling errors**

Run: `cd C:\Users\lucas\tempo\web; npm run build`
Expected: PASS (builds into `dist/`)

- [ ] **Step 5: Commit**

```bash
git add web/src/
git commit -m "feat(web): implement Header, TimelineOverlay, and full App integration"
```

---

### Task 7: Dockerfiles & Kubernetes Manifests for Minikube

**Files:**
- Create: `api/Dockerfile`
- Create: `web/Dockerfile`
- Create: `web/nginx.conf`
- Create: `k8s/api-deployment.yaml`
- Create: `k8s/api-service.yaml`
- Create: `k8s/web-deployment.yaml`
- Create: `k8s/web-service.yaml`
- Create: `k8s/kustomization.yaml`

**Interfaces:**
- Single `kubectl apply -k k8s/` to deploy API and Web microservices to Minikube.

- [ ] **Step 1: Create Dockerfiles and Nginx reverse proxy configuration**

Create `api/Dockerfile`:
```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod ./
COPY cmd/ cmd/
COPY internal/ internal/
RUN CGO_ENABLED=0 GOOS=linux go build -o tempo-api ./cmd/server

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/tempo-api /app/tempo-api
EXPOSE 8080
CMD ["/app/tempo-api"]
```

Create `web/nginx.conf`:
```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://tempo-api-service:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Create `web/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 2: Create Kubernetes Manifests**

Create `k8s/api-deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tempo-api
  labels:
    app: tempo-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tempo-api
  template:
    metadata:
      labels:
        app: tempo-api
    spec:
      containers:
        - name: tempo-api
          image: tempo-api:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 3
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 3
            periodSeconds: 5
```

Create `k8s/api-service.yaml`:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: tempo-api-service
  labels:
    app: tempo-api
spec:
  type: ClusterIP
  selector:
    app: tempo-api
  ports:
    - port: 8080
      targetPort: 8080
```

Create `k8s/web-deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tempo-web
  labels:
    app: tempo-web
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tempo-web
  template:
    metadata:
      labels:
        app: tempo-web
    spec:
      containers:
        - name: tempo-web
          image: tempo-web:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80
```

Create `k8s/web-service.yaml`:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: tempo-web-service
  labels:
    app: tempo-web
spec:
  type: NodePort
  selector:
    app: tempo-web
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30080
```

Create `k8s/kustomization.yaml`:
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - api-deployment.yaml
  - api-service.yaml
  - web-deployment.yaml
  - web-service.yaml
```

- [ ] **Step 3: Build Docker images directly into Minikube and apply manifests**

Commands:
- `minikube image build -t tempo-api:latest ./api`
- `minikube image build -t tempo-web:latest ./web`
- `kubectl apply -k ./k8s`
- `kubectl rollout status deployment/tempo-api`
- `kubectl rollout status deployment/tempo-web`

- [ ] **Step 4: Verify pods, services, and curl endpoint**

Run: `kubectl get pods,services`
Expected: All pods Running and Ready.

- [ ] **Step 5: Commit**

```bash
git add api/Dockerfile web/Dockerfile web/nginx.conf k8s/
git commit -m "feat(k8s): add Dockerfiles and Kubernetes manifests for Minikube deployment"
```
