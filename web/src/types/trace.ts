export type MediaType = 'photo' | 'video' | 'audio' | 'note' | 'connections';

export interface TraceConnection {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

export interface TraceMediaItem {
  id: string;
  type: MediaType;
  timestamp: string;
  url?: string;
  posterUrl?: string;
  duration?: string;
  waveform?: number[];
  transcript?: string;
  text?: string;
  people?: TraceConnection[];
}

export interface TraceWeather {
  temperatureF: number;
  condition: string;
  icon?: string;
}

export interface TraceContext {
  id: string;
  title: string;
  locationSubheading: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  weather: TraceWeather;
  isPrivate: boolean;
  feed: TraceMediaItem[];
  category?: string;
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
