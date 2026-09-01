package generator

import (
	"fmt"
	"math/rand"
	"time"

	"tempo-api/internal/models"
)

type hubLocation struct {
	title              string
	locationSubheading string
	region             string
	lat                float64
	lng                float64
	weatherTemp        int
	weatherCondition   string
	weatherIcon        string
	photoURL           string
	photoCaption       string
	audioTranscript    string
	audioDuration      string
	noteText           string
	videoPosterURL     string
	connections        []models.TraceConnection
}

var hubLocations = []hubLocation{
	{
		title:              "Point Reyes Headlands",
		locationSubheading: "MARIN COUNTY, CALIFORNIA",
		region:             "North America - West",
		lat:                38.0001,
		lng:                -123.0012,
		weatherTemp:        54,
		weatherCondition:   "Dense Fog",
		weatherIcon:        "cloud-fog",
		photoURL:           "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop",
		photoCaption:       "Coastal bluff overlooking the Pacific shroud",
		audioTranscript:    "Fog rolling in over the bluffs. The trail disappears and everything slows down. A reminder to breathe and listen to the swell.",
		audioDuration:      "0:45",
		noteText:           "The air here smells of salt, wild fennel, and damp cypress needles. Solitude feels expansive rather than lonely.",
		videoPosterURL:     "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop",
		connections: []models.TraceConnection{
			{ID: "c1", Name: "Elena Rostova", AvatarURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop", Role: "Field Botanist"},
			{ID: "c2", Name: "Marcus Vance", AvatarURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop", Role: "Sound Archivist"},
		},
	},
	{
		title:              "SoHo Historic Cast Iron District",
		locationSubheading: "NEW YORK, NY",
		region:             "North America - East",
		lat:                40.7233,
		lng:                -74.0030,
		weatherTemp:        71,
		weatherCondition:   "Partly Cloudy",
		weatherIcon:        "cloud-sun",
		photoURL:           "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&auto=format&fit=crop",
		photoCaption:       "Morning light casting geometric shadows across Greene Street",
		audioTranscript:    "Cobblestones rattling beneath delivery carts. The distant hum of the subway ventilating warm air into the crisp morning.",
		audioDuration:      "0:32",
		noteText:           "Found an antique printing press blueprint in the basement studio. Paper preserved with linseed oil from 1892.",
		videoPosterURL:     "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&auto=format&fit=crop",
		connections: []models.TraceConnection{
			{ID: "c3", Name: "Julian Croft", AvatarURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop", Role: "Printmaker"},
		},
	},
	{
		title:              "Zilker Botanical Sanctuary",
		locationSubheading: "AUSTIN, TEXAS",
		region:             "North America - Central",
		lat:                30.2669,
		lng:                -97.7728,
		weatherTemp:        83,
		weatherCondition:   "Sunny",
		weatherIcon:        "sun",
		photoURL:           "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop",
		photoCaption:       "Koi pond reflections under cedar canopies",
		audioTranscript:    "Cicadas building into an afternoon chorus. Barton Creek rushing faintly beyond the limestone ridge.",
		audioDuration:      "0:58",
		noteText:           "Limestone warmed by four hours of direct sun. The heat radiates upward like an ancient furnace.",
		videoPosterURL:     "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop",
		connections: []models.TraceConnection{
			{ID: "c4", Name: "Maya Lin", AvatarURL: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop", Role: "Ecologist"},
			{ID: "c5", Name: "David Chen", AvatarURL: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&auto=format&fit=crop", Role: "Hydrogeologist"},
		},
	},
	{
		title:              "South Beach Coastal Promenade",
		locationSubheading: "MIAMI BEACH, FLORIDA",
		region:             "North America - South",
		lat:                25.7907,
		lng:                -80.1300,
		weatherTemp:        81,
		weatherCondition:   "Humid & Bright",
		weatherIcon:        "sun",
		photoURL:           "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=800&auto=format&fit=crop",
		photoCaption:       "Pastel lifeguard station against turquoise swells",
		audioTranscript:    "Atlantic waves breaking rhythmically with a soft hiss over crushed shell sand.",
		audioDuration:      "0:40",
		noteText:           "Art deco neon tubes flickering to life as twilight turns from periwinkle to deep indigo.",
		videoPosterURL:     "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&auto=format&fit=crop",
		connections: []models.TraceConnection{
			{ID: "c6", Name: "Sofia Morales", AvatarURL: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop", Role: "Architect"},
		},
	},
	{
		title:              "El Yunque Cloud Forest Ridge",
		locationSubheading: "RÍO GRANDE, PUERTO RICO",
		region:             "Caribbean",
		lat:                18.3150,
		lng:                -65.7960,
		weatherTemp:        76,
		weatherCondition:   "Passing Mist",
		weatherIcon:        "cloud-rain",
		photoURL:           "https://images.unsplash.com/photo-1511497584788-87676104235f?w=800&auto=format&fit=crop",
		photoCaption:       "Tree ferns emerging from mountain cloud banks",
		audioTranscript:    "Coquí frogs calling in counterpoint beneath large palm fronds dripping with fresh rainwater.",
		audioDuration:      "1:05",
		noteText:           "Dense canopy filters sunlight into emerald shafts. The forest floor is soft with moss and decomposing mahogany leaves.",
		videoPosterURL:     "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&auto=format&fit=crop",
		connections: []models.TraceConnection{
			{ID: "c7", Name: "Carlos Vega", AvatarURL: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop", Role: "Canopy Researcher"},
		},
	},
	{
		title:              "Battersea Thames Promenade",
		locationSubheading: "LONDON, UNITED KINGDOM",
		region:             "Europe - West",
		lat:                51.4820,
		lng:                -0.1448,
		weatherTemp:        62,
		weatherCondition:   "Breezy Overcast",
		weatherIcon:        "cloud",
		photoURL:           "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop",
		photoCaption:       "Thames tidal reflections against brick power station towers",
		audioTranscript:    "River clippers engine drone mixing with seagulls crying above the pier.",
		audioDuration:      "0:36",
		noteText:           "Low tide reveals ancient gravel beds and Victorian pottery shards along the mudflats.",
		videoPosterURL:     "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=800&auto=format&fit=crop",
		connections: []models.TraceConnection{
			{ID: "c8", Name: "Oliver Wright", AvatarURL: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop", Role: "Urban Historian"},
		},
	},
	{
		title:              "Kreuzberg Canal Promenade",
		locationSubheading: "BERLIN, GERMANY",
		region:             "Europe - Central",
		lat:                52.4987,
		lng:                13.4180,
		weatherTemp:        64,
		weatherCondition:   "Mild & Clear",
		weatherIcon:        "cloud-sun",
		photoURL:           "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&auto=format&fit=crop",
		photoCaption:       "Willows dipping into Landwehrkanal water steps",
		audioTranscript:    "Bicycle bells chiming on cobblestone banks, ambient chatter from riverside cafés.",
		audioDuration:      "0:44",
		noteText:           "The evening golden light settles across chestnut trees. Swan gliding silently towards the lock.",
		videoPosterURL:     "https://images.unsplash.com/photo-1509299349698-dd22323b5963?w=800&auto=format&fit=crop",
		connections: []models.TraceConnection{
			{ID: "c9", Name: "Hannah Schmidt", AvatarURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop", Role: "Photographer"},
		},
	},
	{
		title:              "Gion Bamboo Path & Shrine",
		locationSubheading: "KYOTO, JAPAN",
		region:             "Asia - East",
		lat:                35.0037,
		lng:                135.7772,
		weatherTemp:        67,
		weatherCondition:   "Clear",
		weatherIcon:        "sun",
		photoURL:           "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop",
		photoCaption:       "Lanterns illuminating moss-lined stone paths",
		audioTranscript:    "Wind whispering through tall bamboo stalks, wooden clappers in the distance.",
		audioDuration:      "0:52",
		noteText:           "Incense of cedar and sandalwood lingering in the damp evening air. Stone basins filled with fresh spring water.",
		videoPosterURL:     "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop",
		connections: []models.TraceConnection{
			{ID: "c10", Name: "Kenji Sato", AvatarURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop", Role: "Garden Master"},
		},
	},
	{
		title:              "Marina Bay Coastal Gardens",
		locationSubheading: "DOWNTOWN CORE, SINGAPORE",
		region:             "Asia - South",
		lat:                1.2868,
		lng:                103.8545,
		weatherTemp:        88,
		weatherCondition:   "Tropical Warmth",
		weatherIcon:        "sun",
		photoURL:           "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&auto=format&fit=crop",
		photoCaption:       "Supertrees illuminated against twilight harbor",
		audioTranscript:    "Warm tropical wind swirling through glass domes, gentle spray from the cloud forest waterfall.",
		audioDuration:      "0:41",
		noteText:           "Bromeliads and orchids clinging to vertical steel towers. A striking harmony of nature and structural design.",
		videoPosterURL:     "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=800&auto=format&fit=crop",
		connections: []models.TraceConnection{
			{ID: "c11", Name: "Li Wei", AvatarURL: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop", Role: "Landscape Architect"},
		},
	},
	{
		title:              "Vila Madalena Arts Enclave",
		locationSubheading: "SÃO PAULO, BRAZIL",
		region:             "Latin America",
		lat:                -23.5558,
		lng:                -46.6908,
		weatherTemp:        75,
		weatherCondition:   "Golden Hour",
		weatherIcon:        "sun",
		photoURL:           "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&auto=format&fit=crop",
		photoCaption:       "Vibrant murals lining Beco do Batman alleyways",
		audioTranscript:    "Acoustic bossa nova guitar strumming from an open doorway, street artists discussing pigment mixtures.",
		audioDuration:      "0:49",
		noteText:           "Layers of paint three decades thick peeling back like tree rings. Every corner tells a story of reinvention.",
		videoPosterURL:     "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=800&auto=format&fit=crop",
		connections: []models.TraceConnection{
			{ID: "c12", Name: "Thiago Silva", AvatarURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop", Role: "Muralist"},
		},
	},
}

var sampleWaveforms = [][]float64{
	{0.2, 0.45, 0.7, 0.9, 0.65, 0.8, 0.4, 0.3, 0.6, 0.85, 0.7, 0.5, 0.35, 0.6, 0.9, 0.75, 0.4, 0.25, 0.5, 0.7},
	{0.15, 0.3, 0.55, 0.85, 0.95, 0.7, 0.4, 0.6, 0.75, 0.9, 0.8, 0.5, 0.3, 0.45, 0.8, 0.65, 0.35, 0.2, 0.4, 0.6},
	{0.3, 0.5, 0.8, 0.6, 0.75, 0.9, 0.85, 0.4, 0.3, 0.65, 0.8, 0.7, 0.45, 0.35, 0.6, 0.85, 0.7, 0.4, 0.25, 0.15},
}

func GenerateSeedTraces(count int) []models.TraceContext {
	r := rand.New(rand.NewSource(42)) // deterministic seed
	baseTime := time.Date(2024, 6, 7, 10, 0, 0, 0, time.UTC)

	categories := []string{"exploration", "archive", "field-notes", "acoustic", "observation"}
	traces := make([]models.TraceContext, count)

	for i := 0; i < count; i++ {
		hub := hubLocations[i%len(hubLocations)]
		// Add slight jitter to coordinate
		latJitter := (r.Float64() - 0.5) * 0.05
		lngJitter := (r.Float64() - 0.5) * 0.05

		// Slices across distinct intervals (every 15-30 minutes across 8 hours)
		minuteOffset := (i % 16) * 30
		ts := baseTime.Add(time.Duration(minuteOffset) * time.Minute)

		cat := categories[i%len(categories)]
		isPrivate := (i%2 == 1)
		traceID := fmt.Sprintf("tc-%04d", i+1)

		waveform := sampleWaveforms[i%len(sampleWaveforms)]

		// Generate strictly chronological multi-medium feed items
		feed := []models.TraceMediaItem{
			{
				ID:        fmt.Sprintf("%s-m1", traceID),
				Type:      models.MediaTypePhoto,
				Timestamp: ts.Add(2 * time.Minute),
				URL:       hub.photoURL,
				Text:      hub.photoCaption,
			},
			{
				ID:         fmt.Sprintf("%s-m2", traceID),
				Type:       models.MediaTypeAudio,
				Timestamp:  ts.Add(7 * time.Minute),
				URL:        "https://actions.google.com/sounds/v1/ambiences/waves_crashing_on_rock_beach.ogg",
				Duration:   hub.audioDuration,
				Waveform:   waveform,
				Transcript: hub.audioTranscript,
				Text:       "Field Audio Capture",
			},
			{
				ID:        fmt.Sprintf("%s-m3", traceID),
				Type:      models.MediaTypeNote,
				Timestamp: ts.Add(15 * time.Minute),
				Text:      hub.noteText,
			},
			{
				ID:        fmt.Sprintf("%s-m4", traceID),
				Type:      models.MediaTypeConnections,
				Timestamp: ts.Add(24 * time.Minute),
				People:    hub.connections,
			},
			{
				ID:        fmt.Sprintf("%s-m5", traceID),
				Type:      models.MediaTypeVideo,
				Timestamp: ts.Add(35 * time.Minute),
				URL:       "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
				PosterURL: hub.videoPosterURL,
				Duration:  "0:18",
				Text:      "Site Visual Log",
			},
		}

		traces[i] = models.TraceContext{
			ID:                 traceID,
			Title:              hub.title,
			LocationSubheading: hub.locationSubheading,
			Latitude:           hub.lat + latJitter,
			Longitude:          hub.lng + lngJitter,
			Timestamp:          ts,
			Weather: models.TraceWeather{
				TemperatureF: hub.weatherTemp,
				Condition:    hub.weatherCondition,
				Icon:         hub.weatherIcon,
			},
			IsPrivate: isPrivate,
			Feed:      feed,
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
