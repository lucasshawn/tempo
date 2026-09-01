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

func TestGenerateSeedTracesRichFields(t *testing.T) {
	traces := generator.GenerateSeedTraces(20)
	if len(traces) == 0 {
		t.Fatalf("expected traces, got 0")
	}

	for i, tr := range traces {
		if tr.Title == "" {
			t.Errorf("trace %d missing Title", i)
		}
		if tr.LocationSubheading == "" {
			t.Errorf("trace %d missing LocationSubheading", i)
		}
		if tr.Weather.TemperatureF == 0 && tr.Weather.Condition == "" {
			t.Errorf("trace %d missing Weather", i)
		}
		if len(tr.Feed) == 0 {
			t.Errorf("trace %d missing Feed items", i)
		}

		// Verify feed is sorted chronologically
		for j := 1; j < len(tr.Feed); j++ {
			if tr.Feed[j].Timestamp.Before(tr.Feed[j-1].Timestamp) {
				t.Errorf("trace %d feed item %d (%v) is before item %d (%v)",
					i, j, tr.Feed[j].Timestamp, j-1, tr.Feed[j-1].Timestamp)
			}
		}
	}
}
