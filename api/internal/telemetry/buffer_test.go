package telemetry_test

import (
	"fmt"
	"sync"
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
	if logs[4].ID != "req-3" {
		t.Errorf("expected oldest retained log req-3, got %s", logs[4].ID)
	}
}

func TestRingBuffer_Filter(t *testing.T) {
	rb := telemetry.NewRingBuffer(10)
	rb.Add(telemetry.LogEntry{ID: "1", ClientIP: "1.1.1.1", Method: "GET", Path: "/api/traces", StatusCode: 200, UserAgent: "Mozilla"})
	rb.Add(telemetry.LogEntry{ID: "2", ClientIP: "2.2.2.2", Method: "POST", Path: "/api/timeline", StatusCode: 404, UserAgent: "Curl"})
	rb.Add(telemetry.LogEntry{ID: "3", ClientIP: "1.1.1.1", Method: "DELETE", Path: "/api/v1/admin", StatusCode: 500, UserAgent: "Python"})

	errs := rb.GetRecent(10, "", "errors")
	if len(errs) != 2 {
		t.Fatalf("expected 2 errors (404 and 500), got %d", len(errs))
	}

	search := rb.GetRecent(10, "1.1.1.1", "")
	if len(search) != 2 {
		t.Fatalf("expected 2 logs for IP 1.1.1.1, got %d", len(search))
	}

	searchMethod := rb.GetRecent(10, "POST", "")
	if len(searchMethod) != 1 || searchMethod[0].ID != "2" {
		t.Fatalf("expected 1 log for method POST, got %d", len(searchMethod))
	}

	searchUA := rb.GetRecent(10, "Python", "")
	if len(searchUA) != 1 || searchUA[0].ID != "3" {
		t.Fatalf("expected 1 log for user agent Python, got %d", len(searchUA))
	}
}

func TestRingBuffer_StatusFilters(t *testing.T) {
	rb := telemetry.NewRingBuffer(10)
	rb.Add(telemetry.LogEntry{ID: "1", StatusCode: 200})
	rb.Add(telemetry.LogEntry{ID: "2", StatusCode: 204})
	rb.Add(telemetry.LogEntry{ID: "3", StatusCode: 400})
	rb.Add(telemetry.LogEntry{ID: "4", StatusCode: 404})
	rb.Add(telemetry.LogEntry{ID: "5", StatusCode: 500})
	rb.Add(telemetry.LogEntry{ID: "6", StatusCode: 503})

	twoXX := rb.GetRecent(10, "", "2xx")
	if len(twoXX) != 2 {
		t.Fatalf("expected 2 2xx logs, got %d", len(twoXX))
	}

	fourXX := rb.GetRecent(10, "", "4xx")
	if len(fourXX) != 2 {
		t.Fatalf("expected 2 4xx logs, got %d", len(fourXX))
	}

	fiveXX := rb.GetRecent(10, "", "5xx")
	if len(fiveXX) != 2 {
		t.Fatalf("expected 2 5xx logs, got %d", len(fiveXX))
	}
}

func TestRingBuffer_Clear(t *testing.T) {
	rb := telemetry.NewRingBuffer(5)
	rb.Add(telemetry.LogEntry{ID: "1", StatusCode: 200})
	rb.Add(telemetry.LogEntry{ID: "2", StatusCode: 200})

	if len(rb.GetRecent(10, "", "")) != 2 {
		t.Fatalf("expected 2 logs before clear")
	}

	rb.Clear()

	logs := rb.GetRecent(10, "", "")
	if len(logs) != 0 {
		t.Fatalf("expected 0 logs after clear, got %d", len(logs))
	}
}

func TestRingBuffer_DefaultCapacity(t *testing.T) {
	rb := telemetry.NewRingBuffer(0)
	rb.Add(telemetry.LogEntry{ID: "1", StatusCode: 200})
	logs := rb.GetRecent(10, "", "")
	if len(logs) != 1 {
		t.Fatalf("expected 1 log, got %d", len(logs))
	}
}

func TestRingBuffer_Concurrency(t *testing.T) {
	rb := telemetry.NewRingBuffer(50)
	var wg sync.WaitGroup

	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for j := 0; j < 50; j++ {
				rb.Add(telemetry.LogEntry{
					ID:         fmt.Sprintf("w%d-%d", workerID, j),
					StatusCode: 200,
				})
			}
		}(i)
	}

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 20; j++ {
				_ = rb.GetRecent(10, "", "")
			}
		}()
	}

	wg.Wait()
	logs := rb.GetRecent(100, "", "")
	if len(logs) != 50 {
		t.Fatalf("expected 50 logs at max capacity, got %d", len(logs))
	}
}
