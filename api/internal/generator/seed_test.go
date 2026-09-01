package generator_test

import (
	"testing"
	"tempo-api/internal/generator"
)

func TestGenerateSeedTraces(t *testing.T) {
	count := 50
	traces := generator.GenerateSeedTraces(count)
	if len(traces) != count {
		t.Fatalf("expected %d traces, got %d", count, len(traces))
	}
	for i, tr := range traces {
		if tr.ID == "" {
			t.Errorf("trace %d has empty ID", i)
		}
		if tr.Latitude < -90 || tr.Latitude > 90 {
			t.Errorf("trace %d has invalid latitude: %f", i, tr.Latitude)
		}
		if tr.Longitude < -180 || tr.Longitude > 180 {
			t.Errorf("trace %d has invalid longitude: %f", i, tr.Longitude)
		}
		if tr.Timestamp.IsZero() {
			t.Errorf("trace %d has zero timestamp", i)
		}
	}
}
