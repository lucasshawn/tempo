package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"tempo-api/internal/handlers"
	"tempo-api/internal/models"
	"tempo-api/internal/store"
	"tempo-api/internal/telemetry"
)

func TestHealthCheck(t *testing.T) {
	st := store.NewTraceStore(nil)
	router := handlers.NewRouter(st)

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	if contentType := rec.Header().Get("Content-Type"); !strings.Contains(contentType, "application/json") {
		t.Errorf("expected Content-Type application/json, got %s", contentType)
	}

	if allowOrigin := rec.Header().Get("Access-Control-Allow-Origin"); allowOrigin != "*" {
		t.Errorf("expected Access-Control-Allow-Origin: *, got %s", allowOrigin)
	}

	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if body["status"] != "ok" || body["service"] != "tempo-api" {
		t.Errorf("unexpected health check payload: %+v", body)
	}
}

func TestCORSPreflight(t *testing.T) {
	st := store.NewTraceStore(nil)
	router := handlers.NewRouter(st)

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/traces", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK && rec.Code != http.StatusNoContent {
		t.Fatalf("expected status 200 or 204 for OPTIONS, got %d", rec.Code)
	}

	if allowOrigin := rec.Header().Get("Access-Control-Allow-Origin"); allowOrigin != "*" {
		t.Errorf("expected Access-Control-Allow-Origin: *, got %s", allowOrigin)
	}

	if allowMethods := rec.Header().Get("Access-Control-Allow-Methods"); !strings.Contains(allowMethods, "GET") || !strings.Contains(allowMethods, "POST") {
		t.Errorf("expected Access-Control-Allow-Methods to include GET, POST, got %s", allowMethods)
	}
}

func TestTimelineHandler(t *testing.T) {
	now := time.Date(2024, 6, 7, 10, 0, 0, 0, time.UTC)
	st := store.NewTraceStore([]models.TraceContext{
		{ID: "t1", Latitude: 30, Longitude: -90, Timestamp: now},
		{ID: "t2", Latitude: 40, Longitude: -74, Timestamp: now.Add(30 * time.Minute)},
	})
	router := handlers.NewRouter(st)

	t.Run("GET timeline success", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/timeline", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", rec.Code)
		}

		if contentType := rec.Header().Get("Content-Type"); !strings.Contains(contentType, "application/json") {
			t.Errorf("expected Content-Type application/json, got %s", contentType)
		}

		var summary models.TimelineSummary
		if err := json.NewDecoder(rec.Body).Decode(&summary); err != nil {
			t.Fatalf("failed to decode timeline response: %v", err)
		}

		if summary.TotalEvents != 2 {
			t.Errorf("expected TotalEvents=2, got %d", summary.TotalEvents)
		}
		if len(summary.TimeSlices) != 2 {
			t.Errorf("expected 2 time slices, got %d", len(summary.TimeSlices))
		}
	})

	t.Run("Method Not Allowed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/api/v1/timeline", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected 405 Method Not Allowed, got %d", rec.Code)
		}
	})
}

func TestTracesHandler_Get(t *testing.T) {
	baseTime := time.Date(2024, 6, 7, 10, 0, 0, 0, time.UTC)
	st := store.NewTraceStore([]models.TraceContext{
		{ID: "tc-001", Title: "Probe 1", Latitude: 40.71, Longitude: -74.00, Timestamp: baseTime},
		{ID: "tc-002", Title: "Probe 2", Latitude: 40.72, Longitude: -74.01, Timestamp: baseTime},
		{ID: "tc-003", Title: "Probe 3", Latitude: 37.77, Longitude: -122.41, Timestamp: baseTime.Add(2 * time.Hour)},
	})
	router := handlers.NewRouter(st)

	t.Run("GET traces with time and zoom", func(t *testing.T) {
		timeQuery := baseTime.Format(time.RFC3339)
		req := httptest.NewRequest(http.MethodGet, "/api/v1/traces?time="+timeQuery+"&zoom=2", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", rec.Code)
		}

		if contentType := rec.Header().Get("Content-Type"); !strings.Contains(contentType, "application/json") {
			t.Errorf("expected Content-Type application/json, got %s", contentType)
		}

		var resp models.ClusteredResponse
		if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if resp.TotalEvents != 2 {
			t.Errorf("expected 2 matching events within window, got %d", resp.TotalEvents)
		}
		if len(resp.Clusters) == 0 {
			t.Errorf("expected at least 1 cluster, got 0")
		}
	})

	t.Run("GET traces without query params (defaults)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/traces", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", rec.Code)
		}

		var resp models.ClusteredResponse
		if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		// Falls back to closest trace when targetTime is now and no exact window matches
		if resp.TotalEvents == 0 {
			t.Errorf("expected closest trace match, got 0")
		}
	})
}

func TestTracesHandler_Post(t *testing.T) {
	st := store.NewTraceStore(nil)
	router := handlers.NewRouter(st)

	t.Run("POST trace valid payload", func(t *testing.T) {
		payload := models.TraceContext{
			ID:        "custom-001",
			Title:     "Custom Ingested Probe",
			Latitude:  51.5074,
			Longitude: -0.1278,
			Timestamp: time.Date(2024, 6, 7, 12, 0, 0, 0, time.UTC),
			Region:    "Europe - West",
			Category:  "deployment",
			Metadata: map[string]interface{}{
				"node": "eu-west-1",
			},
		}

		data, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/traces", bytes.NewReader(data))
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusCreated {
			t.Fatalf("expected status 201 Created, got %d", rec.Code)
		}

		if contentType := rec.Header().Get("Content-Type"); !strings.Contains(contentType, "application/json") {
			t.Errorf("expected Content-Type application/json, got %s", contentType)
		}

		var created models.TraceContext
		if err := json.NewDecoder(rec.Body).Decode(&created); err != nil {
			t.Fatalf("failed to decode created trace: %v", err)
		}

		if created.ID != "custom-001" {
			t.Errorf("expected ID custom-001, got %s", created.ID)
		}
		if created.Title != "Custom Ingested Probe" {
			t.Errorf("expected Title 'Custom Ingested Probe', got %s", created.Title)
		}

		// Verify it was added to store
		summary := st.GetTimelineSummary()
		if summary.TotalEvents != 1 {
			t.Errorf("expected store to have 1 event, got %d", summary.TotalEvents)
		}
	})

	t.Run("POST trace generates ID and timestamp if missing", func(t *testing.T) {
		rawJSON := `{"title": "No ID Probe", "latitude": 10.0, "longitude": 20.0, "region": "Test", "category": "mesh-sync"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/traces", strings.NewReader(rawJSON))
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusCreated {
			t.Fatalf("expected status 201 Created, got %d", rec.Code)
		}

		var created models.TraceContext
		if err := json.NewDecoder(rec.Body).Decode(&created); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if created.ID == "" {
			t.Errorf("expected auto-generated ID, got empty string")
		}
		if created.Timestamp.IsZero() {
			t.Errorf("expected auto-generated timestamp, got zero time")
		}
	})

	t.Run("POST trace invalid JSON returns 400", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/traces", strings.NewReader("invalid json {"))
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400 Bad Request, got %d", rec.Code)
		}
	})

	t.Run("Unsupported method returns 405", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/traces", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected 405 Method Not Allowed, got %d", rec.Code)
		}
	})
}

func TestAdminEndpoints_StatsAndLogs(t *testing.T) {
	st := store.NewTraceStore(nil)
	router := handlers.NewRouter(st)

	// Unauthenticated stats request -> 401
	req1 := httptest.NewRequest(http.MethodGet, "/api/v1/admin/stats", nil)
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	if w1.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for unauthenticated request, got %d", w1.Code)
	}

	// Authenticated request with dev key -> 200
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/admin/stats", nil)
	req2.Header.Set("X-Admin-Key", "lucasshawn@gmail.com")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200 for authenticated request, got %d", w2.Code)
	}

	var stats telemetry.SystemMetrics
	if err := json.NewDecoder(w2.Body).Decode(&stats); err != nil {
		t.Fatalf("failed to decode stats JSON: %v", err)
	}
	if stats.UptimeSeconds <= 0 {
		t.Errorf("expected positive uptime, got %d", stats.UptimeSeconds)
	}

	// Logs request -> 200
	req3 := httptest.NewRequest(http.MethodGet, "/api/v1/admin/logs?limit=50", nil)
	req3.Header.Set("X-Admin-Key", "lucasshawn@gmail.com")
	w3 := httptest.NewRecorder()
	router.ServeHTTP(w3, req3)
	if w3.Code != http.StatusOK {
		t.Fatalf("expected 200 for logs request, got %d", w3.Code)
	}

	var logs []telemetry.LogEntry
	if err := json.NewDecoder(w3.Body).Decode(&logs); err != nil {
		t.Fatalf("failed to decode logs JSON: %v", err)
	}
	if len(logs) == 0 {
		t.Errorf("expected logged requests in ring buffer, got 0")
	}
}

func TestAdminEndpoints_ClearLogs(t *testing.T) {
	st := store.NewTraceStore(nil)
	router := handlers.NewRouter(st)

	// Make a request to generate a log entry
	reqHealth := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	wHealth := httptest.NewRecorder()
	router.ServeHTTP(wHealth, reqHealth)

	// Verify unauthenticated clear -> 401
	reqClearUnauth := httptest.NewRequest(http.MethodPost, "/api/v1/admin/logs/clear", nil)
	wClearUnauth := httptest.NewRecorder()
	router.ServeHTTP(wClearUnauth, reqClearUnauth)
	if wClearUnauth.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for unauthenticated clear, got %d", wClearUnauth.Code)
	}

	// Authenticated clear -> 200
	reqClear := httptest.NewRequest(http.MethodPost, "/api/v1/admin/logs/clear", nil)
	reqClear.Header.Set("X-Admin-Key", "lucasshawn@gmail.com")
	wClear := httptest.NewRecorder()
	router.ServeHTTP(wClear, reqClear)
	if wClear.Code != http.StatusOK {
		t.Fatalf("expected 200 for clear logs, got %d", wClear.Code)
	}

	// Fetch logs -> should not contain /healthz
	reqLogs := httptest.NewRequest(http.MethodGet, "/api/v1/admin/logs", nil)
	reqLogs.Header.Set("X-Admin-Key", "lucasshawn@gmail.com")
	wLogs := httptest.NewRecorder()
	router.ServeHTTP(wLogs, reqLogs)
	if wLogs.Code != http.StatusOK {
		t.Fatalf("expected 200 for logs, got %d", wLogs.Code)
	}

	var logs []telemetry.LogEntry
	if err := json.NewDecoder(wLogs.Body).Decode(&logs); err != nil {
		t.Fatalf("failed to decode logs JSON: %v", err)
	}
	for _, l := range logs {
		if l.Path == "/healthz" {
			t.Errorf("expected /healthz to be cleared from logs, but found it")
		}
	}
}

func TestAdminEndpoints_MethodNotAllowed(t *testing.T) {
	st := store.NewTraceStore(nil)
	router := handlers.NewRouter(st)

	tests := []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/api/v1/admin/stats"},
		{http.MethodDelete, "/api/v1/admin/stats"},
		{http.MethodPost, "/api/v1/admin/logs"},
		{http.MethodDelete, "/api/v1/admin/logs"},
		{http.MethodGet, "/api/v1/admin/logs/clear"},
		{http.MethodPut, "/api/v1/admin/logs/clear"},
	}

	for _, tc := range tests {
		req := httptest.NewRequest(tc.method, tc.path, nil)
		req.Header.Set("X-Admin-Key", "lucasshawn@gmail.com")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected 405 Method Not Allowed for %s %s, got %d", tc.method, tc.path, w.Code)
		}
	}
}

func TestTelemetryMiddleware_ClientIPAndHeaders(t *testing.T) {
	st := store.NewTraceStore(nil)
	router := handlers.NewRouter(st)

	// Send request with CF-Connecting-IP
	req1 := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	req1.Header.Set("CF-Connecting-IP", "203.0.113.195")
	req1.Header.Set("User-Agent", "TempoProber/1.0")
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)

	// Send request with X-Forwarded-For
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/timeline", nil)
	req2.Header.Set("X-Forwarded-For", "198.51.100.22, 10.0.0.1")
	req2.Header.Set("User-Agent", "TestClient/2.0")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	// Check logs via admin endpoint
	reqLogs := httptest.NewRequest(http.MethodGet, "/api/v1/admin/logs?limit=10", nil)
	reqLogs.Header.Set("X-Admin-Key", "lucasshawn@gmail.com")
	wLogs := httptest.NewRecorder()
	router.ServeHTTP(wLogs, reqLogs)

	var logs []telemetry.LogEntry
	if err := json.NewDecoder(wLogs.Body).Decode(&logs); err != nil {
		t.Fatalf("failed to decode logs: %v", err)
	}

	foundCF := false
	foundXFF := false
	for _, l := range logs {
		if l.ClientIP == "203.0.113.195" && l.Path == "/healthz" && l.UserAgent == "TempoProber/1.0" {
			foundCF = true
		}
		if l.ClientIP == "198.51.100.22" && l.Path == "/api/v1/timeline" && l.UserAgent == "TestClient/2.0" {
			foundXFF = true
		}
	}

	if !foundCF {
		t.Errorf("expected to find log entry with CF-Connecting-IP 203.0.113.195")
	}
	if !foundXFF {
		t.Errorf("expected to find log entry with X-Forwarded-For IP 198.51.100.22")
	}
}

func TestAdminEndpoints_LogFiltering(t *testing.T) {
	st := store.NewTraceStore(nil)
	router := handlers.NewRouter(st)

	// Generate a 404
	req404 := httptest.NewRequest(http.MethodPut, "/healthz", nil)
	w404 := httptest.NewRecorder()
	router.ServeHTTP(w404, req404)

	// Generate a 200
	req200 := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	w200 := httptest.NewRecorder()
	router.ServeHTTP(w200, req200)

	// Test status filter "errors"
	reqErrLogs := httptest.NewRequest(http.MethodGet, "/api/v1/admin/logs?status=errors", nil)
	reqErrLogs.Header.Set("X-Admin-Key", "lucasshawn@gmail.com")
	wErrLogs := httptest.NewRecorder()
	router.ServeHTTP(wErrLogs, reqErrLogs)

	var errLogs []telemetry.LogEntry
	if err := json.NewDecoder(wErrLogs.Body).Decode(&errLogs); err != nil {
		t.Fatalf("failed to decode err logs: %v", err)
	}
	for _, l := range errLogs {
		if l.StatusCode < 400 {
			t.Errorf("expected only error status codes >= 400, got %d", l.StatusCode)
		}
	}

	// Test search filter
	reqSearch := httptest.NewRequest(http.MethodGet, "/api/v1/admin/logs?filter=healthz", nil)
	reqSearch.Header.Set("X-Admin-Key", "lucasshawn@gmail.com")
	wSearch := httptest.NewRecorder()
	router.ServeHTTP(wSearch, reqSearch)

	var searchLogs []telemetry.LogEntry
	if err := json.NewDecoder(wSearch.Body).Decode(&searchLogs); err != nil {
		t.Fatalf("failed to decode search logs: %v", err)
	}
	for _, l := range searchLogs {
		if !strings.Contains(l.Path, "healthz") && !strings.Contains(l.ClientIP, "healthz") {
			t.Errorf("expected search match for 'healthz', got path %s", l.Path)
		}
	}
}

