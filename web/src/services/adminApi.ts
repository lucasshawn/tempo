import { AdminLogEntry, AdminSystemMetrics } from '../types/admin';

const API_BASE = '/api/v1';

function getAuthHeaders(token: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token.startsWith('key:')) {
    headers['X-Admin-Key'] = token.slice(4);
  } else {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

async function handleResponse<T>(res: Response, defaultErrorMessage: string): Promise<T> {
  if (!res.ok) {
    let errorMsg = `${defaultErrorMessage} (${res.status} ${res.statusText})`;
    try {
      const data = await res.json();
      if (data && data.error) {
        errorMsg = data.error;
      }
    } catch {
      // Keep default error message
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export async function fetchAdminStats(token: string): Promise<AdminSystemMetrics> {
  const res = await fetch(`${API_BASE}/admin/stats`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse<AdminSystemMetrics>(res, 'Failed to fetch admin stats');
}

export async function fetchAdminLogs(
  token: string,
  limit?: number,
  search?: string,
  statusFilter?: string
): Promise<AdminLogEntry[]> {
  const params = new URLSearchParams();
  if (limit !== undefined && limit > 0) {
    params.set('limit', limit.toString());
  }
  if (search && search.trim()) {
    params.set('filter', search.trim());
  }
  if (statusFilter && statusFilter.trim()) {
    params.set('status', statusFilter.trim());
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/admin/logs${query}`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse<AdminLogEntry[]>(res, 'Failed to fetch admin logs');
}

export async function clearAdminLogs(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/logs/clear`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  await handleResponse<{ status: string }>(res, 'Failed to clear admin logs');
}
