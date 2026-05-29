import type { Meeting, Conflict } from "../types";

interface Props {
  meeting: Meeting;
}

function ConflictItem({ conflict }: { conflict: Conflict }) {
  const severityLabel =
    conflict.severity === "high" ? "High" : conflict.severity === "low" ? "Low" : "Medium";

  return (
    <div className={`conflict-item ${conflict.severity}`}>
      <span className="conflict-severity-tag">{severityLabel}</span>
      <div className="conflict-description">{conflict.description}</div>
      <div className="conflict-values">
        {conflict.crm_value && (
          <span>
            <strong>CRM:</strong> {conflict.crm_value}
          </span>
        )}
        {conflict.cal_value && (
          <span>
            <strong>Calendar:</strong> {conflict.cal_value}
          </span>
        )}
      </div>
    </div>
  );
}

function RawCRMRecord({ meeting }: { meeting: Meeting }) {
  const r = meeting.crm_record;
  if (!r) return <p className="detail-row"><span className="value">No CRM record</span></p>;
  return (
    <>
      <div className="detail-row"><span className="field">ID</span><span className="value">{r.crm_id}</span></div>
      <div className="detail-row"><span className="field">Subject</span><span className="value">{r.subject ?? "—"}</span></div>
      <div className="detail-row"><span className="field">Client</span><span className="value">{r.client_name ?? "—"}</span></div>
      <div className="detail-row"><span className="field">Company</span><span className="value">{r.client_company ?? "—"}</span></div>
      <div className="detail-row"><span className="field">Owner</span><span className="value">{r.relationship_owner ?? "—"}</span></div>
      <div className="detail-row"><span className="field">Date</span><span className="value">{r.meeting_date ?? "—"}</span></div>
      <div className="detail-row"><span className="field">Time</span><span className="value">{r.meeting_time ?? "—"}</span></div>
      <div className="detail-row"><span className="field">Type</span><span className="value">{r.meeting_type ?? "—"}</span></div>
      <div className="detail-row"><span className="field">Location</span><span className="value">{r.location ?? "—"}</span></div>
      <div className="detail-row"><span className="field">Status</span><span className="value">{r.status ?? "—"}</span></div>
      <div className="detail-row"><span className="field">Notes</span><span className="value">{r.notes ?? "—"}</span></div>
    </>
  );
}

function RawCalRecord({ meeting }: { meeting: Meeting }) {
  const r = meeting.cal_record;
  if (!r) return <p className="detail-row"><span className="value">No Calendar record</span></p>;
  return (
    <>
      <div className="detail-row"><span className="field">ID</span><span className="value">{r.event_id}</span></div>
      <div className="detail-row"><span className="field">Title</span><span className="value">{r.title ?? "—"}</span></div>
      <div className="detail-row"><span className="field">Organizer</span><span className="value">{r.organizer ?? "—"}</span></div>
      <div className="detail-row"><span className="field">Start</span><span className="value">{r.start_time ?? "—"}</span></div>
      <div className="detail-row"><span className="field">End</span><span className="value">{r.end_time ?? "—"}</span></div>
      <div className="detail-row"><span className="field">Location</span><span className="value">{r.location ?? "—"}</span></div>
      <div className="detail-row"><span className="field">Status</span><span className="value">{r.status ?? "—"}</span></div>
      <div className="detail-row"><span className="field">Recurring</span><span className="value">{r.is_recurring ? "Yes" : "No"}</span></div>
      <div className="detail-row">
        <span className="field">Attendees</span>
        <span className="value">{r.attendees.length > 0 ? r.attendees.join(", ") : "—"}</span>
      </div>
      <div className="detail-row"><span className="field">Description</span><span className="value">{r.description ?? "—"}</span></div>
    </>
  );
}

export default function DetailPanel({ meeting }: Props) {
  const allIssues = [...meeting.data_quality.crm, ...meeting.data_quality.cal];

  return (
    <div className="detail-panel">
      <div className="detail-grid">
        <div className="detail-col">
          <div className="detail-col-header">
            <div className="detail-col-icon crm-icon">💼</div>
            <h4>CRM Record</h4>
          </div>
          <RawCRMRecord meeting={meeting} />
        </div>
        <div className="detail-col">
          <div className="detail-col-header">
            <div className="detail-col-icon cal-icon">📅</div>
            <h4>Calendar Record</h4>
          </div>
          <RawCalRecord meeting={meeting} />
        </div>
      </div>

      {meeting.conflicts.length > 0 && (
        <div className="conflicts-section">
          <div className="section-header">
            <span className="section-dot" />
            <h4>Conflicts ({meeting.conflicts.length})</h4>
          </div>
          {meeting.conflicts.map((c, i) => (
            <ConflictItem key={i} conflict={c} />
          ))}
        </div>
      )}

      {allIssues.length > 0 && (
        <div className="issues-section">
          <div className="section-header">
            <span className="section-dot issues" />
            <h4>Data Quality Issues ({allIssues.length})</h4>
          </div>
          {allIssues.map((issue, i) => (
            <div key={i} className="issue-item">
              <span className="issue-dot" />
              {issue}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
