package handlers

import (
	"encoding/json"
	"fmt"
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
