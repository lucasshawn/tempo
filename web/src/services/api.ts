import { ClusteredResponse, TimelineSummary, TraceContext } from '../types/trace';

const API_BASE = '/api/v1';

export async function fetchTimelineSummary(): Promise<TimelineSummary> {
  const res = await fetch(`${API_BASE}/timeline`);
  if (!res.ok) throw new Error(`Failed to fetch timeline: ${res.statusText}`);
  return res.json();
}

export async function fetchTraces(timeIso: string, zoom: number): Promise<ClusteredResponse> {
  const url = `${API_BASE}/traces?time=${encodeURIComponent(timeIso)}&zoom=${zoom}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch traces: ${res.statusText}`);
  return res.json();
}

export async function createTrace(trace: Partial<TraceContext>): Promise<TraceContext> {
  const res = await fetch(`${API_BASE}/traces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trace),
  });
  if (!res.ok) throw new Error(`Failed to create trace: ${res.statusText}`);
  return res.json();
}
