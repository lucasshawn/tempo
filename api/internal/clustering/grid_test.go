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
			expectedAvgLat := (40.71 + 40.75) / 2.0
			expectedAvgLng := (-74.00 + -73.98) / 2.0
			if c.Latitude < expectedAvgLat-0.001 || c.Latitude > expectedAvgLat+0.001 {
				t.Errorf("expected cluster lat ~%f, got %f", expectedAvgLat, c.Latitude)
			}
			if c.Longitude < expectedAvgLng-0.001 || c.Longitude > expectedAvgLng+0.001 {
				t.Errorf("expected cluster lng ~%f, got %f", expectedAvgLng, c.Longitude)
			}
			if c.Bounds.MinLat != 40.71 || c.Bounds.MaxLat != 40.75 {
				t.Errorf("unexpected lat bounds: %+v", c.Bounds)
			}
			if c.Bounds.MinLng != -74.00 || c.Bounds.MaxLng != -73.98 {
				t.Errorf("unexpected lng bounds: %+v", c.Bounds)
			}
			if c.Event != nil {
				t.Errorf("expected multi-item cluster Event to be nil")
			}
		} else if c.Count == 1 {
			if c.IsCluster {
				t.Errorf("expected single trace marker to have isCluster=false")
			}
			if c.Event == nil || c.Event.ID != "3" {
				t.Errorf("expected single trace marker to hold Event ID '3'")
			}
		}
	}
	if !foundCluster {
		t.Errorf("did not find cluster with count 2")
	}
}

func TestClusterTraces_Empty(t *testing.T) {
	clusters := clustering.ClusterTraces([]models.TraceContext{}, 2)
	if clusters == nil {
		t.Fatalf("expected non-nil empty slice")
	}
	if len(clusters) != 0 {
		t.Fatalf("expected 0 clusters, got %d", len(clusters))
	}
}

func TestClusterTraces_SingleTrace(t *testing.T) {
	now := time.Now()
	tr := models.TraceContext{
		ID:        "single-1",
		Title:     "Single Probe",
		Latitude:  37.7749,
		Longitude: -122.4194,
		Timestamp: now,
	}

	clusters := clustering.ClusterTraces([]models.TraceContext{tr}, 5)
	if len(clusters) != 1 {
		t.Fatalf("expected 1 marker, got %d", len(clusters))
	}
	c := clusters[0]
	if c.IsCluster {
		t.Errorf("expected isCluster=false for single trace")
	}
	if c.Count != 1 {
		t.Errorf("expected count=1, got %d", c.Count)
	}
	if c.Latitude != tr.Latitude || c.Longitude != tr.Longitude {
		t.Errorf("expected coords (%f, %f), got (%f, %f)", tr.Latitude, tr.Longitude, c.Latitude, c.Longitude)
	}
	if c.Event == nil || c.Event.ID != tr.ID {
		t.Errorf("expected attached event ID %s", tr.ID)
	}
}

func TestClusterTraces_ZoomResolution(t *testing.T) {
	now := time.Now()
	// Two points 0.2 degrees apart
	t1 := models.TraceContext{ID: "1", Latitude: 40.0, Longitude: -74.0, Timestamp: now}
	t2 := models.TraceContext{ID: "2", Latitude: 40.2, Longitude: -74.0, Timestamp: now}

	// At low zoom (zoom=4, grid=4.0 deg), they should group into 1 cluster
	cLow := clustering.ClusterTraces([]models.TraceContext{t1, t2}, 4)
	if len(cLow) != 1 {
		t.Fatalf("expected 1 cluster at zoom 4, got %d", len(cLow))
	}
	if cLow[0].Count != 2 {
		t.Errorf("expected count 2 at zoom 4, got %d", cLow[0].Count)
	}

	// At high zoom (zoom=12, grid=0.02 deg), they should split into 2 separate markers
	cHigh := clustering.ClusterTraces([]models.TraceContext{t1, t2}, 12)
	if len(cHigh) != 2 {
		t.Fatalf("expected 2 markers at zoom 12, got %d", len(cHigh))
	}
}
