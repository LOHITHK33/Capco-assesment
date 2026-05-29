import { useState } from "react";
import type { Meeting, Source } from "../types";
import DetailPanel from "./DetailPanel";

interface Props {
  meeting: Meeting;
  searchQuery?: string;
}

function sourceBadge(source: Source) {
  const map: Record<Source, { label: string; className: string; icon: string }> = {
    both: { label: "Matched", className: "badge badge-both", icon: "🔗" },
    crm_only: { label: "CRM Only", className: "badge badge-crm", icon: "💼" },
    cal_only: { label: "Calendar Only", className: "badge badge-cal", icon: "📅" },
  };
  const { label, className, icon } = map[source];
  return <span className={className}>{icon} {label}</span>;
}

function highlight(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function MeetingCard({ meeting, searchQuery = "" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasConflict = meeting.conflicts.length > 0;

  const cardClass = [
    "meeting-card",
    `source-${meeting.source}`,
    hasConflict ? "has-conflict" : "",
    expanded ? "expanded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass} onClick={() => setExpanded((prev) => !prev)}>
      <div className="card-top">
        <div className="card-subject">
          {highlight(meeting.subject ?? "Untitled Meeting", searchQuery)}
        </div>
        <div className="card-right">
          {sourceBadge(meeting.source)}
          <div className="expand-chevron">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      <div className="card-meta">
        {meeting.date && (
          <span className="card-meta-item">
            <span className="card-meta-icon">📅</span>
            {meeting.date}
          </span>
        )}
        {meeting.time && (
          <span className="card-meta-item">
            <span className="card-meta-icon">🕐</span>
            {meeting.time}
          </span>
        )}
        {meeting.client_name && (
          <span className="card-meta-item">
            <span className="card-meta-icon">👤</span>
            {meeting.client_name}
          </span>
        )}
        {meeting.client_company && (
          <span className="card-meta-item">
            <span className="card-meta-icon">🏢</span>
            {meeting.client_company}
          </span>
        )}
        {meeting.location && (
          <span className="card-meta-item">
            <span className="card-meta-icon">📍</span>
            {meeting.location}
          </span>
        )}
        {meeting.relationship_owner && (
          <span className="card-meta-item">
            <span className="card-meta-icon">👔</span>
            {meeting.relationship_owner}
          </span>
        )}
        {meeting.status && (
          <span className="card-meta-item">
            <span className="card-meta-icon">●</span>
            {meeting.status}
          </span>
        )}
      </div>

      <div className="card-badges">
        {meeting.conflicts.length > 0 && (
          <span className="badge badge-conflict">
            ⚡ {meeting.conflicts.length} Conflict{meeting.conflicts.length > 1 ? "s" : ""}
          </span>
        )}
        {(meeting.data_quality.crm.length > 0 || meeting.data_quality.cal.length > 0) && (
          <span className="badge badge-issue">🚨 Data Issues</span>
        )}
        {meeting.is_duplicate && (
          <span className="badge badge-duplicate">⚠️ Duplicate</span>
        )}
        {meeting.is_recurring && (
          <span className="badge badge-recurring">🔁 Recurring</span>
        )}
      </div>

      {expanded && <DetailPanel meeting={meeting} />}
    </div>
  );
}
