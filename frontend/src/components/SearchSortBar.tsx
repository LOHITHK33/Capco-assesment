export type SortOption =
  | "date-desc"
  | "date-asc"
  | "client-az"
  | "client-za"
  | "conflicts-desc";

interface Props {
  search: string;
  onSearch: (v: string) => void;
  sort: SortOption;
  onSort: (v: SortOption) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc",      label: "📅 Date — Newest First" },
  { value: "date-asc",       label: "📅 Date — Oldest First" },
  { value: "client-az",      label: "👤 Client Name — A → Z" },
  { value: "client-za",      label: "👤 Client Name — Z → A" },
  { value: "conflicts-desc", label: "⚡ Most Conflicts First" },
];

export default function SearchSortBar({ search, onSearch, sort, onSort }: Props) {
  return (
    <div className="search-sort-bar">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          type="text"
          placeholder="Search by subject, client, company, owner…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        {search && (
          <button className="search-clear" onClick={() => onSearch("")} title="Clear search">
            ✕
          </button>
        )}
      </div>

      <select
        className="sort-select"
        value={sort}
        onChange={(e) => onSort(e.target.value as SortOption)}
      >
        {SORT_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </div>
  );
}
