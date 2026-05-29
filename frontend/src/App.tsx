import { useEffect, useState } from "react";
import type { MeetingsResponse, Meeting, Source } from "./types";
import SummaryBar from "./components/SummaryBar";
import FilterBar from "./components/FilterBar";
import MeetingCard from "./components/MeetingCard";

type FilterOption = "all" | Source | "conflicts" | "issues" | "duplicates";

export default function App() {
  const [data, setData] = useState<MeetingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>("all");

  useEffect(() => {
    fetch("/api/meetings")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        return res.json() as Promise<MeetingsResponse>;
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <div className="app">
        <p className="empty-state">Loading meetings...</p>
      </div>
    );
  if (error)
    return (
      <div className="app">
        <p className="empty-state">Error: {error}</p>
      </div>
    );
  if (!data) return null;

  const filtered = data.meetings.filter((m: Meeting) => {
    switch (filter) {
      case "all":
        return true;
      case "both":
        return m.source === "both";
      case "crm_only":
        return m.source === "crm_only";
      case "cal_only":
        return m.source === "cal_only";
      case "conflicts":
        return m.conflicts.length > 0;
      case "issues":
        return m.data_quality.crm.length > 0 || m.data_quality.cal.length > 0;
      case "duplicates":
        return m.is_duplicate;
      default:
        return true;
    }
  });

  const counts = {
    all: data.meetings.length,
    both: data.meetings.filter((m) => m.source === "both").length,
    crm_only: data.meetings.filter((m) => m.source === "crm_only").length,
    cal_only: data.meetings.filter((m) => m.source === "cal_only").length,
    conflicts: data.meetings.filter((m) => m.conflicts.length > 0).length,
    issues: data.meetings.filter(
      (m) => m.data_quality.crm.length > 0 || m.data_quality.cal.length > 0,
    ).length,
    duplicates: data.meetings.filter((m) => m.is_duplicate).length,
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>Event Sync Service</h1>
        <p>Reconciled view of CRM and Calendar meetings</p>
      </div>

      <SummaryBar summary={data.summary} />
      <FilterBar active={filter} onChange={setFilter} counts={counts} />

      <div className="meeting-list">
        {filtered.length === 0 ? (
          <p className="empty-state">No meetings match this filter.</p>
        ) : (
          filtered.map((m) => <MeetingCard key={m.id} meeting={m} />)
        )}
      </div>
    </div>
  );
}
