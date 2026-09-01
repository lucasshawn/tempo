package telemetry

import (
	"math"
	"runtime"
	"sync"
	"sync/atomic"
	"time"
)

type SystemMetrics struct {
	UptimeSeconds   int64            `json:"uptimeSeconds"`
	StartTime       time.Time        `json:"startTime"`
	AllocBytes      uint64           `json:"allocBytes"`
	SysBytes        uint64           `json:"sysBytes"`
	NumGC           uint32           `json:"numGc"`
	NumGoroutine    int              `json:"numGoroutine"`
	NumCPU          int              `json:"numCpu"`
	DiskTotalBytes  uint64           `json:"diskTotalBytes"`
	DiskFreeBytes   uint64           `json:"diskFreeBytes"`
	DiskUsedBytes   uint64           `json:"diskUsedBytes"`
	DiskUsedPercent float64          `json:"diskUsedPercent"`
	TotalRequests   int64            `json:"totalRequests"`
	Status2xx       int64            `json:"status2xx"`
	Status4xx       int64            `json:"status4xx"`
	Status5xx       int64            `json:"status5xx"`
	RequestsPerMin  float64          `json:"requestsPerMin"`
	EndpointHits    map[string]int64 `json:"endpointHits"`
}

type Collector struct {
	ringBuffer    *RingBuffer
	startTime     time.Time
	totalRequests atomic.Int64
	status2xx     atomic.Int64
	status4xx     atomic.Int64
	status5xx     atomic.Int64
	mu            sync.RWMutex
	endpointHits  map[string]int64
}

func NewCollector(rb *RingBuffer) *Collector {
	return &Collector{
		ringBuffer:   rb,
		startTime:    time.Now().UTC(),
		endpointHits: make(map[string]int64),
	}
}

func (c *Collector) RecordRequest(statusCode int, duration time.Duration, path string) {
	c.totalRequests.Add(1)
	if statusCode >= 200 && statusCode < 300 {
		c.status2xx.Add(1)
	} else if statusCode >= 400 && statusCode < 500 {
		c.status4xx.Add(1)
	} else if statusCode >= 500 {
		c.status5xx.Add(1)
	}

	c.mu.Lock()
	c.endpointHits[path]++
	c.mu.Unlock()
}

func (c *Collector) GetMetrics() SystemMetrics {
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	now := time.Now().UTC()
	uptime := int64(now.Sub(c.startTime).Seconds())
	if uptime <= 0 {
		uptime = 1
	}

	totalReq := c.totalRequests.Load()
	rpm := float64(totalReq) / (float64(uptime) / 60.0)

	diskTotal, diskFree, diskUsed, diskPercent := getDiskUsage()

	c.mu.RLock()
	hitsCopy := make(map[string]int64, len(c.endpointHits))
	for k, v := range c.endpointHits {
		hitsCopy[k] = v
	}
	c.mu.RUnlock()

	return SystemMetrics{
		UptimeSeconds:   uptime,
		StartTime:       c.startTime,
		AllocBytes:      memStats.Alloc,
		SysBytes:        memStats.Sys,
		NumGC:           memStats.NumGC,
		NumGoroutine:    runtime.NumGoroutine(),
		NumCPU:          runtime.NumCPU(),
		DiskTotalBytes:  diskTotal,
		DiskFreeBytes:   diskFree,
		DiskUsedBytes:   diskUsed,
		DiskUsedPercent: diskPercent,
		TotalRequests:   totalReq,
		Status2xx:       c.status2xx.Load(),
		Status4xx:       c.status4xx.Load(),
		Status5xx:       c.status5xx.Load(),
		RequestsPerMin:  math.Round(rpm*100) / 100,
		EndpointHits:    hitsCopy,
	}
}
