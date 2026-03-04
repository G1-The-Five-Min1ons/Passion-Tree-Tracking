"use client";

interface FilterBarProps {
  filters: {
    status: string;
    sprint: string;
    assignee: string;
    search: string;
  };
  sprints: string[];
  assignees: string[];
  onFilterChange: (filters: {
    status: string;
    sprint: string;
    assignee: string;
    search: string;
  }) => void;
}

const STATUSES = [
  "Backlog",
  "To Do",
  "In Progress",
  "In Review",
  "Done",
  "Cancelled",
];

export default function FilterBar({
  filters,
  sprints,
  assignees,
  onFilterChange,
}: FilterBarProps) {
  const set = (key: string, value: string) =>
    onFilterChange({ ...filters, [key]: value });

  const activeCount = [
    filters.status,
    filters.sprint,
    filters.assignee,
  ].filter(Boolean).length;

  return (
    <div className="flex items-center gap-3 mb-4 animate-fade-in">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search issues..."
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="w-full h-8 pl-8 pr-3 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>

      {/* Status Filter */}
      <select
        value={filters.status}
        onChange={(e) => set("status", e.target.value)}
        className="h-8 px-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer pr-7"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2371717a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 8px center",
        }}
      >
        <option value="">All Statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Sprint Filter */}
      <select
        value={filters.sprint}
        onChange={(e) => set("sprint", e.target.value)}
        className="h-8 px-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer pr-7"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2371717a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 8px center",
        }}
      >
        <option value="">All Sprints</option>
        {sprints.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Assignee Filter */}
      <select
        value={filters.assignee}
        onChange={(e) => set("assignee", e.target.value)}
        className="h-8 px-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer pr-7"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2371717a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 8px center",
        }}
      >
        <option value="">All Assignees</option>
        {assignees.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      {/* Clear */}
      {activeCount > 0 && (
        <button
          onClick={() =>
            onFilterChange({
              status: "",
              sprint: "",
              assignee: "",
              search: filters.search,
            })
          }
          className="h-8 px-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          Clear filters ({activeCount})
        </button>
      )}
    </div>
  );
}
