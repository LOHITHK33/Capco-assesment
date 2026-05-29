export type Source = "both" | "crm_only" | "cal_only";
export type Severity = "high" | "medium" | "low";

export interface Conflict {
  field: string;
  crm_value: string | null;
  cal_value: string | null;
  description: string;
  severity: Severity;
}

export interface DataQuality {
  crm: string[];
  cal: string[];
}

export interface CRMRecord {
  crm_id: string;
  subject: string | null;
  client_name: string | null;
  client_company: string | null;
  relationship_owner: string | null;
  meeting_date: string | null;
  meeting_time: string | null;
  meeting_type: string | null;
  location: string | null;
  notes: string | null;
  status: string | null;
}

export interface CalRecord {
  event_id: string;
  title: string | null;
  organizer: string | null;
  attendees: string[];
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  is_recurring: boolean;
  status: string | null;
}

export interface Meeting {
  id: string;
  source: Source;
  subject: string | null;
  date: string | null;
  time: string | null;
  client_name: string | null;
  client_company: string | null;
  relationship_owner: string | null;
  meeting_type: string | null;
  status: string | null;
  location: string | null;
  attendees: string[];
  is_recurring: boolean;
  conflicts: Conflict[];
  data_quality: DataQuality;
  is_duplicate: boolean;
  duplicate_reason: string | null;
  crm_record: CRMRecord | null;
  cal_record: CalRecord | null;
}

export interface SummaryStats {
  total: number;
  matched: number;
  crm_only: number;
  cal_only: number;
  with_conflicts: number;
  with_data_issues: number;
  flagged_duplicates: number;
}

export interface MeetingsResponse {
  meetings: Meeting[];
  summary: SummaryStats;
}
