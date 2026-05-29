import { useState } from "react";
import type { Meeting, Source } from "../types";
import DetailPanel from "./DetailPanel";

interface Props {
  meeting: Meeting;
}

function sourceBadge(source: Source) {
  const map: Record<Source, { label: string; className: string }> = {
    both: { label: "Matched", className: "badge badge-both" },
    crm_only: { label: "CRM Only", className: "badge badge-crm" },
    cal_only: { label: "Calendar Only", className: "badge badge-cal" },
  };
  const { label, className } = map[source];
  return <span className={className}>{label}</span>;
}

export default function MeetingCard({ meeting }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`meeting-card ${expanded ? "expanded" : ""}`}
      onClick={() => setExpanded((prev) => !prev)}
    >
      <div className="card-top">
        <div className="card-subject">
          {meeting.subject ?? "Untitled Meeting"}
        </div>
        {sourceBadge(meeting.source)}
      </div>

      <div className="card-meta">
        {meeting.date && <span>📅 {meeting.date}</span>}
        {meeting.time && <span>🕐 {meeting.time}</span>}
        {meeting.client_name && <span>👤 {meeting.client_name}</span>}
        {meeting.client_company && <span>🏢 {meeting.client_company}</span>}
        {meeting.location && <span>📍 {meeting.location}</span>}
        {meeting.relationship_owner && (
          <span>👔 {meeting.relationship_owner}</span>
        )}
        {meeting.status && <span>Status: {meeting.status}</span>}
      </div>

      <div className="card-badges">
        {meeting.conflicts.length > 0 && (
          <span className="badge badge-conflict">
            ⚠ {meeting.conflicts.length} Conflict
            {meeting.conflicts.length > 1 ? "s" : ""}
          </span>
        )}
        {(meeting.data_quality.crm.length > 0 ||
          meeting.data_quality.cal.length > 0) && (
          <span className="badge badge-issue">✗ Data Issues</span>
        )}
        {meeting.is_duplicate && (
          <span className="badge badge-duplicate">Duplicate</span>
        )}
        {meeting.is_recurring && (
          <span className="badge badge-recurring">Recurring</span>
        )}
      </div>

      {expanded && <DetailPanel meeting={meeting} />}
    </div>
  );
}
