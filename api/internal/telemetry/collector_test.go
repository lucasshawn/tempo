package telemetry_test

import (
	"sync"
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
	if m.NumCPU == 0 {
		t.Errorf("expected non-zero NumCPU")
	}
	if m.DiskTotalBytes == 0 || m.DiskFreeBytes == 0 {
		t.Errorf("expected non-zero disk metrics")
	}
	if m.EndpointHits["/api/v1/timeline"] != 1 {
		t.Errorf("expected 1 hit for /api/v1/timeline, got %d", m.EndpointHits["/api/v1/timeline"])
	}
	if m.EndpointHits["/unknown"] != 1 {
		t.Errorf("expected 1 hit for /unknown, got %d", m.EndpointHits["/unknown"])
	}
	if m.EndpointHits["/api/v1/traces"] != 1 {
		t.Errorf("expected 1 hit for /api/v1/traces, got %d", m.EndpointHits["/api/v1/traces"])
	}
	if m.UptimeSeconds <= 0 {
		t.Errorf("expected positive UptimeSeconds, got %d", m.UptimeSeconds)
	}
	if m.RequestsPerMin <= 0 {
		t.Errorf("expected positive RequestsPerMin, got %f", m.RequestsPerMin)
	}
}

func TestCollector_StatusCodeBreakdown(t *testing.T) {
	rb := telemetry.NewRingBuffer(100)
	collector := telemetry.NewCollector(rb)

	// 2xx
	collector.RecordRequest(200, 1*time.Millisecond, "/a")
	collector.RecordRequest(201, 1*time.Millisecond, "/a")
	collector.RecordRequest(204, 1*time.Millisecond, "/a")

	// 3xx (redirects)
	collector.RecordRequest(301, 1*time.Millisecond, "/redirect")
	collector.RecordRequest(302, 1*time.Millisecond, "/redirect")

	// 4xx
	collector.RecordRequest(400, 1*time.Millisecond, "/b")
	collector.RecordRequest(401, 1*time.Millisecond, "/b")
	collector.RecordRequest(403, 1*time.Millisecond, "/b")
	collector.RecordRequest(404, 1*time.Millisecond, "/b")

	// 5xx
	collector.RecordRequest(500, 1*time.Millisecond, "/c")
	collector.RecordRequest(502, 1*time.Millisecond, "/c")
	collector.RecordRequest(503, 1*time.Millisecond, "/c")

	m := collector.GetMetrics()
	if m.TotalRequests != 12 {
		t.Fatalf("expected 12 total requests, got %d", m.TotalRequests)
	}
	if m.Status2xx != 3 {
		t.Errorf("expected 3 2xx requests, got %d", m.Status2xx)
	}
	if m.Status4xx != 4 {
		t.Errorf("expected 4 4xx requests, got %d", m.Status4xx)
	}
	if m.Status5xx != 3 {
		t.Errorf("expected 3 5xx requests, got %d", m.Status5xx)
	}
	if m.EndpointHits["/a"] != 3 {
		t.Errorf("expected 3 hits for /a, got %d", m.EndpointHits["/a"])
	}
	if m.EndpointHits["/redirect"] != 2 {
		t.Errorf("expected 2 hits for /redirect, got %d", m.EndpointHits["/redirect"])
	}
}

func TestCollector_EndpointHitsMapIsolation(t *testing.T) {
	rb := telemetry.NewRingBuffer(100)
	collector := telemetry.NewCollector(rb)

	collector.RecordRequest(200, 1*time.Millisecond, "/endpoint")
	m1 := collector.GetMetrics()
	m1.EndpointHits["/endpoint"] = 999
	m1.EndpointHits["/mutated"] = 100

	m2 := collector.GetMetrics()
	if m2.EndpointHits["/endpoint"] != 1 {
		t.Errorf("expected endpoint hits to be isolated from map mutation, got %d", m2.EndpointHits["/endpoint"])
	}
	if _, exists := m2.EndpointHits["/mutated"]; exists {
		t.Errorf("expected mutated key not to exist in internal map")
	}
}

func TestCollector_Concurrency(t *testing.T) {
	rb := telemetry.NewRingBuffer(1000)
	collector := telemetry.NewCollector(rb)
	var wg sync.WaitGroup

	numWriters := 20
	requestsPerWriter := 100

	for i := 0; i < numWriters; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for j := 0; j < requestsPerWriter; j++ {
				status := 200
				if j%3 == 0 {
					status = 404
				} else if j%5 == 0 {
					status = 500
				}
				collector.RecordRequest(status, 2*time.Millisecond, "/api/resource")
			}
		}(i)
	}

	numReaders := 10
	for i := 0; i < numReaders; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 50; j++ {
				_ = collector.GetMetrics()
			}
		}()
	}

	wg.Wait()

	m := collector.GetMetrics()
	expectedTotal := int64(numWriters * requestsPerWriter)
	if m.TotalRequests != expectedTotal {
		t.Fatalf("expected %d total requests, got %d", expectedTotal, m.TotalRequests)
	}
	if m.EndpointHits["/api/resource"] != expectedTotal {
		t.Fatalf("expected %d hits for /api/resource, got %d", expectedTotal, m.EndpointHits["/api/resource"])
	}
}
