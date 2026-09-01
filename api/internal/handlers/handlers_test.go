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
