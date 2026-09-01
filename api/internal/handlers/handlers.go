package handlers

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"tempo-api/internal/auth"
	"tempo-api/internal/models"
	"tempo-api/internal/store"
	"tempo-api/internal/telemetry"
)

type Handler struct {
	store      *store.TraceStore
	collector  *telemetry.Collector
	ringBuffer *telemetry.RingBuffer
	auth       *auth.GoogleAuth
}

// NewRouter creates a new http.Handler with default telemetry and Google auth configuration.
func NewRouter(st *store.TraceStore) http.Handler {
	rb := telemetry.NewRingBuffer(1000)
	collector := telemetry.NewCollector(rb)
	ga := auth.NewGoogleAuth(nil)
	return NewRouterWithDeps(st, rb, collector, ga)
}

// NewRouterWithDeps creates a new http.Handler with explicit dependencies.
func NewRouterWithDeps(st *store.TraceStore, rb *telemetry.RingBuffer, collector *telemetry.Collector, ga *auth.GoogleAuth) http.Handler {
	h := &Handler{
		store:      st,
		collector:  collector,
		ringBuffer: rb,
		auth:       ga,
	}
	mux := http.NewServeMux()

	// Public routes
	mux.HandleFunc("/healthz", h.handleHealth)
	mux.HandleFunc("/api/v1/timeline", h.handleTimeline)
	mux.HandleFunc("/api/v1/traces", h.handleTraces)

	// Protected admin routes
	mux.Handle("/api/v1/admin/stats", ga.Middleware(http.HandlerFunc(h.handleAdminStats)))
	mux.Handle("/api/v1/admin/logs", ga.Middleware(http.HandlerFunc(h.handleAdminLogs)))
	mux.Handle("/api/v1/admin/logs/clear", ga.Middleware(http.HandlerFunc(h.handleAdminLogsClear)))

	return telemetryMiddleware(rb, collector, corsMiddleware(mux))
}

type responseWriter struct {
	http.ResponseWriter
	statusCode   int
	bytesWritten int64
	wroteHeader  bool
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{
		ResponseWriter: w,
		statusCode:     http.StatusOK,
	}
}

func (rw *responseWriter) WriteHeader(code int) {
	if !rw.wroteHeader {
		rw.statusCode = code
		rw.wroteHeader = true
		rw.ResponseWriter.WriteHeader(code)
	}
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if !rw.wroteHeader {
		rw.WriteHeader(http.StatusOK)
	}
	n, err := rw.ResponseWriter.Write(b)
	rw.bytesWritten += int64(n)
	return n, err
}

func getClientIP(r *http.Request) string {
	if cf := r.Header.Get("CF-Connecting-IP"); cf != "" {
		return strings.TrimSpace(cf)
	}
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			ip := strings.TrimSpace(parts[0])
			if ip != "" {
				return ip
			}
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && host != "" {
		return host
	}
	return r.RemoteAddr
}

func telemetryMiddleware(rb *telemetry.RingBuffer, col *telemetry.Collector, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now().UTC()
		rw := newResponseWriter(w)

		next.ServeHTTP(rw, r)

		duration := time.Since(start)
		durationMs := float64(duration.Microseconds()) / 1000.0
		clientIP := getClientIP(r)

		entry := telemetry.LogEntry{
			ID:           fmt.Sprintf("req-%d", time.Now().UnixNano()),
			Timestamp:    start,
			ClientIP:     clientIP,
			Method:       r.Method,
			Path:         r.URL.Path,
			StatusCode:   rw.statusCode,
			DurationMs:   durationMs,
			UserAgent:    r.UserAgent(),
			BytesWritten: rw.bytesWritten,
		}

		if col != nil {
			col.RecordRequest(rw.statusCode, duration, r.URL.Path)
		}
		if rb != nil {
			rb.Add(entry)
		}
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (h *Handler) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "tempo-api"})
}

func (h *Handler) handleTimeline(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	summary := h.store.GetTimelineSummary()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(summary)
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
			} else if parsedNano, err := time.Parse(time.RFC3339Nano, timeStr); err == nil {
				targetTime = parsedNano
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
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(resp)

	case http.MethodPost:
		var tr models.TraceContext
		if err := json.NewDecoder(r.Body).Decode(&tr); err != nil {
			http.Error(w, "Invalid JSON payload: "+err.Error(), http.StatusBadRequest)
			return
		}
		if tr.ID == "" {
			tr.ID = fmt.Sprintf("tc-%s", strconv.FormatInt(time.Now().UnixNano(), 36))
		}
		if tr.Timestamp.IsZero() {
			tr.Timestamp = time.Now().UTC()
		}
		h.store.AddTrace(tr)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(tr)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *Handler) handleAdminStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	metrics := h.collector.GetMetrics()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(metrics)
}

func (h *Handler) handleAdminLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	limit := 100
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	search := r.URL.Query().Get("filter")
	if search == "" {
		search = r.URL.Query().Get("search")
	}

	statusFilter := r.URL.Query().Get("status")
	if statusFilter == "" {
		statusFilter = r.URL.Query().Get("statusFilter")
	}

	logs := h.ringBuffer.GetRecent(limit, search, statusFilter)
	if logs == nil {
		logs = []telemetry.LogEntry{}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(logs)
}

func (h *Handler) handleAdminLogsClear(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	h.ringBuffer.Clear()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "cleared"})
}
