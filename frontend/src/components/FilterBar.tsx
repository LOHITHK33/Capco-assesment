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

const FILTERS: { key: FilterOption; label: string }[] = [
  { key: "all", label: "All" },
  { key: "both", label: "Matched" },
  { key: "crm_only", label: "CRM Only" },
  { key: "cal_only", label: "Calendar Only" },
  { key: "conflicts", label: "Conflicts" },
  { key: "issues", label: "Data Issues" },
  { key: "duplicates", label: "Duplicates" },
];

export default function FilterBar({ active, onChange, counts }: Props) {
  return (
    <div className="filter-bar">
      {FILTERS.map(({ key, label }) => (
        <button
          key={key}
          className={`filter-btn ${active === key ? "active" : ""}`}
          onClick={() => onChange(key)}
        >
          {label} ({counts[key]})
        </button>
      ))}
    </div>
  );
}
