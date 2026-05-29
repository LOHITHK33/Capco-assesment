import type { Source } from "../types";

type FilterOption = "all" | Source | "conflicts" | "issues" | "duplicates";

interface Props {
  active: FilterOption;
  onChange: (filter: FilterOption) => void;
  counts: {
    all: number;
    both: number;
    crm_only: number;
    cal_only: number;
    conflicts: number;
    issues: number;
    duplicates: number;
  };
}

const FILTERS: { key: FilterOption; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "⊞" },
  { key: "both", label: "Matched", icon: "🔗" },
  { key: "crm_only", label: "CRM Only", icon: "💼" },
  { key: "cal_only", label: "Calendar Only", icon: "📅" },
  { key: "conflicts", label: "Conflicts", icon: "⚡" },
  { key: "issues", label: "Data Issues", icon: "🚨" },
  { key: "duplicates", label: "Duplicates", icon: "⚠️" },
];

export default function FilterBar({ active, onChange, counts }: Props) {
  return (
    <div className="filter-bar">
      {FILTERS.map(({ key, label, icon }) => (
        <button
          key={key}
          className={`filter-btn ${active === key ? "active" : ""}`}
          onClick={() => onChange(key)}
        >
          <span>{icon}</span>
          {label}
          <span className="count-badge">{counts[key]}</span>
        </button>
      ))}
    </div>
  );
}
