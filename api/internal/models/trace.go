package models

import "time"

type TraceContext struct {
	ID        string                 `json:"id"`
	Title     string                 `json:"title"`
	Latitude  float64                `json:"latitude"`
	Longitude float64                `json:"longitude"`
	Timestamp time.Time              `json:"timestamp"`
	Region    string                 `json:"region"`
	Category  string                 `json:"category"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
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
