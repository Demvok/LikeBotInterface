// API models for LikeBot

export interface Account {
  phone_number: string;
  account_id?: string;
  session_name?: string;
}

export interface Post {
  post_id?: number;
  message_link: string;
  chat_id?: number;
  message_id?: number;
  validated?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TaskAction {
  type: 'react' | 'comment';
  palette?: 'positive' | 'negative';
  content?: string;
}

export type TaskStatus = 'PENDING' | 'RUNNING' | 'PAUSED' | 'FINISHED' | 'CRASHED';

export interface Task {
  task_id?: number;
  name: string;
  description?: string;
  post_ids: number[];
  accounts: string[];
  action: TaskAction;
  status?: TaskStatus;
  created_at?: string;
  updated_at?: string;
}

export interface Run {
  run_id: string;
  task_id: number;
  started_at: string;
  finished_at: string;
  status: string;
  event_count: number;
  meta: any;
}

export interface Stats {
  accounts: { total: number };
  posts: { total: number; validated: number; unvalidated: number };
  tasks: { total: number; by_status: Record<string, number> };
}

export interface ReportEvent {
  datetime: number;
  message: string;
  details: string;
  client: string;
  message_link: string;
  palette: 'positive' | 'negative';
  error: string | null;
}

export interface TaskReport {
  task_id: number;
  report: ReportEvent[];
  run_id: string | null;
}

export interface ApiError {
  detail: string;
}
