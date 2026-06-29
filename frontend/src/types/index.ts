export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'developer' | 'viewer';
  org_id: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  repo_url: string;
  language: string;
  last_scan_id: string;
  last_scan_at: string;
  created_at: string;
}

export interface ScanJob {
  id: string;
  project_id: string;
  project?: Project;
  status: 'queued' | 'building' | 'scanning' | 'analyzing' | 'completed' | 'failed';
  trigger_type: 'manual' | 'mock_push';
  gate_passed: boolean;
  error_reason?: string;
  started_at: string;
  finished_at: string;
  created_at: string;
}

export interface Vulnerability {
  id: string;
  scan_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  file_path: string;
  line: number;
  description: string;
  remediation: string;
  status: 'open' | 'resolved' | 'ignored' | 'false_positive';
  detected_at: string;
}

export interface Alert {
  id: string;
  project_id: string;
  project?: Project;
  scan_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  read: boolean;
  created_at: string;
}
