package models

import "time"

type MediaType string

const (
	MediaTypePhoto       MediaType = "photo"
	MediaTypeVideo       MediaType = "video"
	MediaTypeAudio       MediaType = "audio"
	MediaTypeNote        MediaType = "note"
	MediaTypeConnections MediaType = "connections"
)

type TraceConnection struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatarUrl,omitempty"`
	Role      string `json:"role,omitempty"`
}

type TraceMediaItem struct {
	ID         string            `json:"id"`
	Type       MediaType         `json:"type"`
	Timestamp  time.Time         `json:"timestamp"`
	URL        string            `json:"url,omitempty"`
	PosterURL  string            `json:"posterUrl,omitempty"`
	Duration   string            `json:"duration,omitempty"`
	Waveform   []float64         `json:"waveform,omitempty"`
	Transcript string            `json:"transcript,omitempty"`
	Text       string            `json:"text,omitempty"`
	People     []TraceConnection `json:"people,omitempty"`
}

type TraceWeather struct {
	TemperatureF int    `json:"temperatureF"`
	Condition    string `json:"condition"`
	Icon         string `json:"icon,omitempty"`
}

type TraceContext struct {
	ID                 string                 `json:"id"`
	Title              string                 `json:"title"`
	LocationSubheading string                 `json:"locationSubheading"`
	Latitude           float64                `json:"latitude"`
	Longitude          float64                `json:"longitude"`
	Timestamp          time.Time              `json:"timestamp"`
	Weather            TraceWeather           `json:"weather"`
	IsPrivate          bool                   `json:"isPrivate"`
	Feed               []TraceMediaItem       `json:"feed"`
	Region             string                 `json:"region,omitempty"`
	Category           string                 `json:"category,omitempty"`
	Metadata           map[string]interface{} `json:"metadata,omitempty"`
}

type ClusterBounds struct {
	MinLat float64 `json:"minLat"`
	MinLng float64 `json:"minLng"`
	MaxLat float64 `json:"maxLat"`
	MaxLng float64 `json:"maxLng"`
}

type TraceCluster struct {
	ID        string        `json:"id"`
	Latitude  float64       `json:"latitude"`
	Longitude float64       `json:"longitude"`
	Count     int           `json:"count"`
	IsCluster bool          `json:"isCluster"`
	Bounds    ClusterBounds `json:"bounds"`
	Event     *TraceContext `json:"event,omitempty"`
}

type ClusteredResponse struct {
	Time        time.Time      `json:"time"`
	TotalEvents int            `json:"totalEvents"`
	Clusters    []TraceCluster `json:"clusters"`
}

type TimelineSummary struct {
	StartTime   time.Time   `json:"startTime"`
	EndTime     time.Time   `json:"endTime"`
	TimeSlices  []time.Time `json:"timeSlices"`
	TotalEvents int         `json:"totalEvents"`
}
