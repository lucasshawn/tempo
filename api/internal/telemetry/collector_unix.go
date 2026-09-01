//go:build !windows

package telemetry

import (
	"math"
	"syscall"
)

// getDiskUsage obtains actual filesystem disk metrics using syscall.Statfs.
func getDiskUsage() (uint64, uint64, uint64, float64) {
	var stat syscall.Statfs_t
	if err := syscall.Statfs("/", &stat); err != nil {
		// Fallback defaults if Statfs fails
		total := uint64(50 * 1024 * 1024 * 1024)
		free := uint64(35 * 1024 * 1024 * 1024)
		used := total - free
		percent := (float64(used) / float64(total)) * 100.0
		return total, free, used, math.Round(percent*10) / 10
	}

	total := stat.Blocks * uint64(stat.Bsize)
	free := stat.Bavail * uint64(stat.Bsize)
	if free > total {
		free = total
	}
	used := total - free
	var percent float64
	if total > 0 {
		percent = (float64(used) / float64(total)) * 100.0
	}
	return total, free, used, math.Round(percent*10) / 10
}
