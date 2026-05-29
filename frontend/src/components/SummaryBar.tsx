import type { SummaryStats } from "../types";

interface Props {
  summary: SummaryStats;
}

export default function SummaryBar({ summary }: Props) {
  return (
    <div className="summary-bar">
      <div className="stat-box stat-total">
        <span className="stat-icon">📊</span>
        <div className="stat-number">{summary.total}</div>
        <div className="stat-label">Total Meetings</div>
      </div>
      <div className="stat-box stat-matched">
        <span className="stat-icon">🔗</span>
        <div className="stat-number">{summary.matched}</div>
        <div className="stat-label">Matched</div>
      </div>
      <div className="stat-box stat-crm">
        <span className="stat-icon">💼</span>
        <div className="stat-number">{summary.crm_only}</div>
        <div className="stat-label">CRM Only</div>
      </div>
      <div className="stat-box stat-cal">
        <span className="stat-icon">📅</span>
        <div className="stat-number">{summary.cal_only}</div>
        <div className="stat-label">Calendar Only</div>
      </div>
      <div className="stat-box stat-conflicts">
        <span className="stat-icon">⚡</span>
        <div className="stat-number">{summary.with_conflicts}</div>
        <div className="stat-label">Conflicts</div>
      </div>
      <div className="stat-box stat-issues">
        <span className="stat-icon">🚨</span>
        <div className="stat-number">{summary.with_data_issues}</div>
        <div className="stat-label">Data Issues</div>
      </div>
      <div className="stat-box stat-duplicates">
        <span className="stat-icon">⚠️</span>
        <div className="stat-number">{summary.flagged_duplicates}</div>
        <div className="stat-label">Duplicates</div>
      </div>
    </div>
  );
}
