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

		// Apply search filter (IP, Path, UserAgent, Method)
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
