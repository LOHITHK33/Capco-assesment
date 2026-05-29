import { useEffect, useState } from "react";
import type { MeetingsResponse, Meeting, Source } from "./types";
import SummaryBar from "./components/SummaryBar";
import FilterBar from "./components/FilterBar";
import MeetingCard from "./components/MeetingCard";
import SearchSortBar, { type SortOption } from "./components/SearchSortBar";

type FilterOption = "all" | Source | "conflicts" | "issues" | "duplicates";

const FILTER_LABELS: Record<FilterOption, string> = {
  all: "All",
  both: "Matched",
  crm_only: "CRM Only",
  cal_only: "Calendar Only",
  conflicts: "Conflicts",
  issues: "Data Issues",
  duplicates: "Duplicates",
};

export default function App() {
  const [data, setData] = useState<MeetingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("date-desc");
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

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

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  if (loading)
    return (
      <div className="app">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading meetings…</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="app">
        <div className="empty-state">
          <span className="empty-state-icon">⚠️</span>
          <p>Error: {error}</p>
        </div>
      </div>
    );

  if (!data) return null;

  // 1. Source / status filter
  const byFilter = data.meetings.filter((m: Meeting) => {
    switch (filter) {
      case "all":       return true;
      case "both":      return m.source === "both";
      case "crm_only":  return m.source === "crm_only";
      case "cal_only":  return m.source === "cal_only";
      case "conflicts": return m.conflicts.length > 0;
      case "issues":    return m.data_quality.crm.length > 0 || m.data_quality.cal.length > 0;
      case "duplicates":return m.is_duplicate;
      default:          return true;
    }
  });

  // 2. Search
  const q = search.trim().toLowerCase();
  const bySearch = q
    ? byFilter.filter(
        (m) =>
          m.subject?.toLowerCase().includes(q) ||
          m.client_name?.toLowerCase().includes(q) ||
          m.client_company?.toLowerCase().includes(q) ||
          m.relationship_owner?.toLowerCase().includes(q),
      )
    : byFilter;

  // 3. Sort
  const sorted = [...bySearch].sort((a, b) => {
    switch (sort) {
      case "date-asc":       return (a.date ?? "").localeCompare(b.date ?? "");
      case "date-desc":      return (b.date ?? "").localeCompare(a.date ?? "");
      case "client-az":      return (a.client_name ?? "").localeCompare(b.client_name ?? "");
      case "client-za":      return (b.client_name ?? "").localeCompare(a.client_name ?? "");
      case "conflicts-desc": return b.conflicts.length - a.conflicts.length;
      default:               return 0;
    }
  });

  const counts = {
    all:        data.meetings.length,
    both:       data.meetings.filter((m) => m.source === "both").length,
    crm_only:   data.meetings.filter((m) => m.source === "crm_only").length,
    cal_only:   data.meetings.filter((m) => m.source === "cal_only").length,
    conflicts:  data.meetings.filter((m) => m.conflicts.length > 0).length,
    issues:     data.meetings.filter((m) => m.data_quality.crm.length > 0 || m.data_quality.cal.length > 0).length,
    duplicates: data.meetings.filter((m) => m.is_duplicate).length,
  };

  const isFiltered = filter !== "all" || q;

  return (
    <div className="app">
      <div className="app-header">
        <div className="header-content">
          <div className="header-icon">🔄</div>
          <div className="header-text">
            <h1>Event Sync Service</h1>
            <p>Reconciled view of CRM and Calendar meetings</p>
          </div>
          <button
            className="dark-toggle"
            onClick={() => setDarkMode((d) => !d)}
            title="Toggle dark mode"
          >
            <span>{darkMode ? "☀️" : "🌙"}</span>
            <span>{darkMode ? "Light" : "Dark"}</span>
          </button>
        </div>
      </div>

      <SummaryBar summary={data.summary} />
      <FilterBar active={filter} onChange={setFilter} counts={counts} />
      <SearchSortBar search={search} onSearch={setSearch} sort={sort} onSort={setSort} />

      <div className="results-info">
        <span className="results-count">
          Showing <strong>{sorted.length}</strong> of{" "}
          <strong>{data.meetings.length}</strong> meetings
        </span>
        {isFiltered && (
          <span className="results-filter-label">
            {filter !== "all" && `${FILTER_LABELS[filter]}`}
            {filter !== "all" && q && " · "}
            {q && `"${search}"`}
          </span>
        )}
      </div>

      <div className="meeting-list">
        {sorted.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🔍</span>
            <p>No meetings match your search or filter.</p>
          </div>
        ) : (
          sorted.map((m) => (
            <MeetingCard key={m.id} meeting={m} searchQuery={search} />
          ))
        )}
      </div>
    </div>
  );
}
