import { User, Project, ScanJob, Vulnerability, Alert } from '../types';

export const API_BASE_URL = 'http://localhost:8080/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  } else if (!options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  auth: {
    register: (data: any) => request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    login: (data: any) => request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    me: () => request<User>('/auth/me'),
  },
  projects: {
    list: () => request<Project[]>('/projects'),
    create: (data: { name: string; repo_url: string; language: string }) => request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    get: (id: string) => request<Project>(`/projects/${id}`),
    delete: (id: string) => request<{ message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    }),
    generateToken: (id: string) => request<{ token: string; file_content: string }>(`/projects/${id}/generate-token`, {
      method: 'POST',
    }),
    verifyOwnership: (id: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return request<{ message: string; project: Project }>(`/projects/${id}/verify`, {
        method: 'POST',
        body: formData,
      });
    },
    getGatePolicy: (id: string) => request<{
      project_id: string;
      block_on_critical: boolean;
      block_on_high: boolean;
      max_allowed_medium: number;
    }>(`/projects/${id}/gate-policy`),
    updateGatePolicy: (id: string, data: {
      block_on_critical: boolean;
      block_on_high: boolean;
      max_allowed_medium: number;
    }) => request<any>(`/projects/${id}/gate-policy`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  },
  scans: {
    trigger: (projectId: string, triggerType: 'manual' | 'mock_push' = 'manual') => request<ScanJob>(`/projects/${projectId}/trigger`, {
      method: 'POST',
      body: JSON.stringify({ trigger_type: triggerType }),
    }),
    get: (id: string) => request<ScanJob>(`/scans/${id}`),
    getVulnerabilities: (id: string) => request<Vulnerability[]>(`/scans/${id}/vulnerabilities`),
    updateVulnerability: (vulnId: string, status: string) => request<Vulnerability>(`/vulnerabilities/${vulnId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  },
  alerts: {
    list: () => request<Alert[]>('/alerts'),
    read: (id: string) => request<Alert>(`/alerts/${id}/read`, {
      method: 'PATCH',
    }),
  },
  analytics: {
    overview: () => request<{
      total_projects: number;
      active_scans: number;
      open_vulnerabilities: number;
      critical_alerts: number;
      severity_count: Record<string, number>;
      recent_scans: ScanJob[];
    }>('/analytics/overview'),
    trends: () => request<{
      date: string;
      critical: number;
      high: number;
      medium: number;
      low: number;
    }[]>('/analytics/trends'),
  },
  org: {
    members: () => request<any[]>('/org/members'),
    updateRole: (id: string, role: string) => request<any>(`/org/members/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
    deleteMember: (id: string) => request<any>(`/org/members/${id}`, {
      method: 'DELETE',
    }),
  },
  audit: {
    list: (page = 1, limit = 20) => request<{
      total: number;
      page: number;
      limit: number;
      entries: any[];
    }>(`/audit-log?page=${page}&limit=${limit}`),
  },
};
