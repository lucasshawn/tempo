export interface TraceContext {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  region: string;
  category: string;
  metadata?: Record<string, any>;
}

export interface ClusterBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface TraceCluster {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  isCluster: boolean;
  bounds: ClusterBounds;
  event?: TraceContext;
}

export interface ClusteredResponse {
  time: string;
  totalEvents: number;
  clusters: TraceCluster[];
}

export interface TimelineSummary {
  startTime: string;
  endTime: string;
  timeSlices: string[];
  totalEvents: number;
}
