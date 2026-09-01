package clustering

import (
	"fmt"
	"math"
	"tempo-api/internal/models"
)

func getGridSize(zoom int) float64 {
	// Degrees per cell based on zoom level (e.g. 500sqmi ~ 3-5 deg at global zoom 2)
	switch {
	case zoom <= 2:
		return 8.0
	case zoom <= 4:
		return 4.0
	case zoom <= 6:
		return 1.5
	case zoom <= 8:
		return 0.5
	case zoom <= 10:
		return 0.1
	default:
		return 0.02
	}
}

func ClusterTraces(traces []models.TraceContext, zoom int) []models.TraceCluster {
	if len(traces) == 0 {
		return []models.TraceCluster{}
	}

	gridSize := getGridSize(zoom)
	type cellAccumulator struct {
		traces []models.TraceContext
		sumLat float64
		sumLng float64
		minLat float64
		minLng float64
		maxLat float64
		maxLng float64
	}

	grid := make(map[string]*cellAccumulator)

	for _, tr := range traces {
		cellX := int(math.Floor(tr.Longitude / gridSize))
		cellY := int(math.Floor(tr.Latitude / gridSize))
		key := fmt.Sprintf("%d:%d", cellX, cellY)

		acc, exists := grid[key]
		if !exists {
			acc = &cellAccumulator{
				traces: []models.TraceContext{},
				minLat: tr.Latitude,
				minLng: tr.Longitude,
				maxLat: tr.Latitude,
				maxLng: tr.Longitude,
			}
			grid[key] = acc
		}

		acc.traces = append(acc.traces, tr)
		acc.sumLat += tr.Latitude
		acc.sumLng += tr.Longitude
		if tr.Latitude < acc.minLat {
			acc.minLat = tr.Latitude
		}
		if tr.Latitude > acc.maxLat {
			acc.maxLat = tr.Latitude
		}
		if tr.Longitude < acc.minLng {
			acc.minLng = tr.Longitude
		}
		if tr.Longitude > acc.maxLng {
			acc.maxLng = tr.Longitude
		}
	}

	clusters := make([]models.TraceCluster, 0, len(grid))
	idx := 0
	for key, acc := range grid {
		count := len(acc.traces)
		avgLat := acc.sumLat / float64(count)
		avgLng := acc.sumLng / float64(count)

		if count == 1 {
			tr := acc.traces[0]
			clusters = append(clusters, models.TraceCluster{
				ID:        fmt.Sprintf("single-%s", tr.ID),
				Latitude:  tr.Latitude,
				Longitude: tr.Longitude,
				Count:     1,
				IsCluster: false,
				Bounds: models.ClusterBounds{
					MinLat: tr.Latitude,
					MinLng: tr.Longitude,
					MaxLat: tr.Latitude,
					MaxLng: tr.Longitude,
				},
				Event: &tr,
			})
		} else {
			clusters = append(clusters, models.TraceCluster{
				ID:        fmt.Sprintf("cluster-%s-%d", key, idx),
				Latitude:  avgLat,
				Longitude: avgLng,
				Count:     count,
				IsCluster: true,
				Bounds: models.ClusterBounds{
					MinLat: acc.minLat,
					MinLng: acc.minLng,
					MaxLat: acc.maxLat,
					MaxLng: acc.maxLng,
				},
			})
		}
		idx++
	}

	return clusters
}
