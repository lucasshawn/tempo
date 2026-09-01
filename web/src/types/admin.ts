export interface AdminLogEntry {
  id: string;
  timestamp: string;
  clientIp: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userAgent: string;
  bytesWritten: number;
}

export interface AdminSystemMetrics {
  uptimeSeconds: number;
  startTime: string;
  allocBytes: number;
  sysBytes: number;
  numGc: number;
  numGoroutine: number;
  numCpu: number;
  diskTotalBytes: number;
  diskFreeBytes: number;
  diskUsedBytes: number;
  diskUsedPercent: number;
  totalRequests: number;
  status2xx: number;
  status4xx: number;
  status5xx: number;
  requestsPerMin: number;
  endpointHits: Record<string, number>;
}
