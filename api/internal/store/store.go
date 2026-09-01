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
			TimeSlices:  []time.Time{},
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
