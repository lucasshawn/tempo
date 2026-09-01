package store_test

import (
	"sync"
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
	if !summary.StartTime.Equal(t1) {
		t.Errorf("expected startTime %v, got %v", t1, summary.StartTime)
	}
	if !summary.EndTime.Equal(t2) {
		t.Errorf("expected endTime %v, got %v", t2, summary.EndTime)
	}

	resp := st.GetTracesForTimeSlice(t1, 2)
	if resp.TotalEvents != 1 {
		t.Errorf("expected 1 event at t1 slice, got %d", resp.TotalEvents)
	}
	if len(resp.Clusters) != 1 {
		t.Errorf("expected 1 cluster/marker at t1 slice, got %d", len(resp.Clusters))
	}
}

func TestStore_Empty(t *testing.T) {
	st := store.NewTraceStore(nil)
	summary := st.GetTimelineSummary()
	if summary.TotalEvents != 0 {
		t.Errorf("expected 0 total events in empty store, got %d", summary.TotalEvents)
	}

	resp := st.GetTracesForTimeSlice(time.Now().UTC(), 2)
	if resp.TotalEvents != 0 {
		t.Errorf("expected 0 events for time slice in empty store, got %d", resp.TotalEvents)
	}
	if len(resp.Clusters) != 0 {
		t.Errorf("expected 0 clusters in empty store, got %d", len(resp.Clusters))
	}
}

func TestStore_AddTrace(t *testing.T) {
	t1 := time.Date(2024, 6, 7, 12, 0, 0, 0, time.UTC)
	t2 := time.Date(2024, 6, 7, 14, 0, 0, 0, time.UTC)
	tMid := time.Date(2024, 6, 7, 13, 0, 0, 0, time.UTC)

	st := store.NewTraceStore([]models.TraceContext{
		{ID: "1", Latitude: 40.0, Longitude: -70.0, Timestamp: t1},
		{ID: "2", Latitude: 41.0, Longitude: -71.0, Timestamp: t2},
	})

	st.AddTrace(models.TraceContext{
		ID:        "mid",
		Latitude:  40.5,
		Longitude: -70.5,
		Timestamp: tMid,
	})

	summary := st.GetTimelineSummary()
	if summary.TotalEvents != 3 {
		t.Fatalf("expected 3 total events after adding trace, got %d", summary.TotalEvents)
	}
	if len(summary.TimeSlices) != 3 {
		t.Fatalf("expected 3 slices, got %d", len(summary.TimeSlices))
	}
	// Verify slices are ordered chronologically
	if !summary.TimeSlices[0].Equal(t1) || !summary.TimeSlices[1].Equal(tMid) || !summary.TimeSlices[2].Equal(t2) {
		t.Errorf("slices not in chronological order: %+v", summary.TimeSlices)
	}
}

func TestStore_ClosestFallback(t *testing.T) {
	t1 := time.Date(2024, 6, 7, 10, 0, 0, 0, time.UTC)
	t2 := time.Date(2024, 6, 7, 15, 0, 0, 0, time.UTC)

	st := store.NewTraceStore([]models.TraceContext{
		{ID: "1", Latitude: 40.0, Longitude: -70.0, Timestamp: t1},
		{ID: "2", Latitude: 41.0, Longitude: -71.0, Timestamp: t2},
	})

	// Query at 10:10 UTC (within 15-min window of 10:00)
	respNear := st.GetTracesForTimeSlice(time.Date(2024, 6, 7, 10, 10, 0, 0, time.UTC), 2)
	if respNear.TotalEvents != 1 {
		t.Errorf("expected 1 event within 10-min delta, got %d", respNear.TotalEvents)
	}

	// Query at 11:00 UTC (no events within 15-min window, closest is 10:00 with 1hr diff vs 15:00 with 4hr diff)
	respFar := st.GetTracesForTimeSlice(time.Date(2024, 6, 7, 11, 0, 0, 0, time.UTC), 2)
	if respFar.TotalEvents != 1 {
		t.Fatalf("expected 1 event from closest fallback, got %d", respFar.TotalEvents)
	}
	if len(respFar.Clusters) != 1 || respFar.Clusters[0].Event == nil || respFar.Clusters[0].Event.ID != "1" {
		t.Errorf("expected closest trace '1', got %+v", respFar.Clusters)
	}
}

func TestStore_ConcurrentAccess(t *testing.T) {
	st := store.NewTraceStore(nil)
	baseTime := time.Date(2024, 6, 7, 10, 0, 0, 0, time.UTC)

	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			st.AddTrace(models.TraceContext{
				ID:        string(rune('a' + idx)),
				Latitude:  float64(idx),
				Longitude: float64(idx),
				Timestamp: baseTime.Add(time.Duration(idx) * time.Minute),
			})
		}(i)
	}

	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_ = st.GetTimelineSummary()
			_ = st.GetTracesForTimeSlice(baseTime, 2)
		}()
	}

	wg.Wait()

	summary := st.GetTimelineSummary()
	if summary.TotalEvents != 20 {
		t.Errorf("expected 20 events after concurrent writes, got %d", summary.TotalEvents)
	}
}
