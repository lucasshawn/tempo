package generator

import (
	"fmt"
	"math/rand"
	"time"

	"tempo-api/internal/models"
)

func GenerateSeedTraces(count int) []models.TraceContext {
	r := rand.New(rand.NewSource(42)) // deterministic seed
	baseTime := time.Date(2024, 6, 7, 10, 0, 0, 0, time.UTC)

	// Anchors across global hubs (Americas, Europe, Asia, etc.)
	hubs := []struct {
		region string
		lat    float64
		lng    float64
	}{
		{"North America - East", 40.7128, -74.0060},
		{"North America - West", 37.7749, -122.4194},
		{"North America - Central", 30.2672, -97.7431},
		{"North America - South", 25.7617, -80.1918},
		{"Caribbean", 18.2208, -66.5901},
		{"Europe - West", 51.5074, -0.1278},
		{"Europe - Central", 52.5200, 13.4050},
		{"Asia - East", 35.6762, 139.6503},
		{"Asia - South", 1.3521, 103.8198},
		{"Latin America", -23.5505, -46.6333},
	}

	categories := []string{"deployment", "telemetry", "mesh-sync", "edge-probe", "anomaly"}
	traces := make([]models.TraceContext, count)

	for i := 0; i < count; i++ {
		hub := hubs[i%len(hubs)]
		// Add slight jitter to coordinate
		latJitter := (r.Float64() - 0.5) * 4.0
		lngJitter := (r.Float64() - 0.5) * 6.0

		// Slices across distinct intervals (every 15-30 minutes across 8 hours)
		minuteOffset := (i % 16) * 30
		ts := baseTime.Add(time.Duration(minuteOffset) * time.Minute)

		cat := categories[r.Intn(len(categories))]
		traces[i] = models.TraceContext{
			ID:        fmt.Sprintf("tc-%04d", i+1),
			Title:     fmt.Sprintf("%s Node Probe #%d", hub.region, i+1),
			Latitude:  hub.lat + latJitter,
			Longitude: hub.lng + lngJitter,
			Timestamp: ts,
			Region:    hub.region,
			Category:  cat,
			Metadata: map[string]interface{}{
				"status":    "active",
				"latencyMs": 20 + r.Intn(100),
				"severity":  "info",
			},
		}
	}

	return traces
}
