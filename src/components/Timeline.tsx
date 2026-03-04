"use client";

import { Task } from "@/types/task";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { TypeIcon } from "@/components/TaskTable";

interface TimelineProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
}

/* Status → bar colour */
const BAR_COLORS: Record<string, string> = {
  Backlog: "#52525b",
  "To Do": "#71717a",
  "In Progress": "#3b82f6",
  "In Review": "#a855f7",
  Done: "#22c55e",
  Cancelled: "#ef4444",
};

/* Issue-type outline (left border accent on the bar) */
const TYPE_ACCENT: Record<string, string> = {
  Epic: "#a855f7",
  Task: "#3b82f6",
  Subtask: "#22c55e",
  Test: "#f97316",
};

interface TreeNode {
  task: Task;
  children: TreeNode[];
}

/* ─── helpers ──────────────────────────────────────────────── */
const DAY_PX = 3; // pixels per day
const ROW_H = 38;
const HEADER_H = 48;
const SPRINT_H = 28;
const LEFT_W = 370;

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/* ─── Component ────────────────────────────────────────────── */
export default function Timeline({ tasks, onEdit }: TimelineProps) {
  /* expanded state — start with all parents open */
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const keys = new Set<string>();
    tasks.forEach((t) => {
      if (tasks.some((c) => c.parentKey === t.issueKey)) keys.add(t.issueKey);
    });
    return keys;
  });

  const chartRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const keys = new Set(
      tasks
        .filter((t) => tasks.some((c) => c.parentKey === t.issueKey))
        .map((t) => t.issueKey)
    );
    setExpanded(keys);
  }, [tasks]);

  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  /* ── tree build ─────────────────────────────────────────── */
  const tree = useMemo(() => {
    const byKey = new Map<string, Task>();
    tasks.forEach((t) => byKey.set(t.issueKey, t));
    const childrenOf = new Map<string, Task[]>();
    const roots: Task[] = [];
    tasks.forEach((t) => {
      if (t.parentKey && byKey.has(t.parentKey)) {
        const arr = childrenOf.get(t.parentKey) || [];
        arr.push(t);
        childrenOf.set(t.parentKey, arr);
      } else {
        roots.push(t);
      }
    });
    const build = (items: Task[]): TreeNode[] =>
      items.map((t) => ({
        task: t,
        children: build(childrenOf.get(t.issueKey) || []),
      }));
    return build(roots);
  }, [tasks]);

  /* ── flatten ────────────────────────────────────────────── */
  const rows = useMemo(() => {
    const result: { task: Task; depth: number; hasChildren: boolean }[] = [];
    const walk = (nodes: TreeNode[], depth: number) => {
      nodes.forEach((n) => {
        const hc = n.children.length > 0;
        result.push({ task: n.task, depth, hasChildren: hc });
        if (hc && expanded.has(n.task.issueKey)) walk(n.children, depth + 1);
      });
    };
    walk(tree, 0);
    return result;
  }, [tree, expanded]);

  /* ── time range ─────────────────────────────────────────── */
  const { origin, totalDays, months, todayPx } = useMemo(() => {
    const dates: Date[] = [];
    tasks.forEach((t) => {
      const c = parseDate(t.created);
      const d = parseDate(t.dueDate);
      if (c) dates.push(c);
      if (d) dates.push(d);
    });
    if (dates.length === 0) {
      const now = new Date();
      dates.push(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      dates.push(new Date(now.getFullYear(), now.getMonth() + 4, 0));
    }
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));

    const origin = new Date(min.getFullYear(), min.getMonth() - 1, 1);
    const end = new Date(max.getFullYear(), max.getMonth() + 3, 0);
    const totalDays = Math.max(diffDays(origin, end), 30);

    /* month labels */
    const months: { label: string; offset: number; width: number }[] = [];
    const cur = new Date(origin);
    while (cur < end) {
      const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      const mEnd = next > end ? end : next;
      const daysInMonth = diffDays(cur, mEnd);
      if (daysInMonth > 0) {
        months.push({
          label: cur.toLocaleString("en", { month: "long" }),
          offset: diffDays(origin, cur) * DAY_PX,
          width: daysInMonth * DAY_PX,
        });
      }
      cur.setTime(next.getTime());
    }

    const todayPx = diffDays(origin, new Date()) * DAY_PX;
    return { origin, totalDays, months, todayPx };
  }, [tasks]);

  const chartWidth = totalDays * DAY_PX;

  /* ── sprints ────────────────────────────────────────────── */
  const sprints = useMemo(() => {
    const map = new Map<string, { min: Date; max: Date }>();
    tasks.forEach((t) => {
      if (!t.sprint) return;
      const ds = [parseDate(t.created), parseDate(t.dueDate)].filter(
        Boolean
      ) as Date[];
      if (ds.length === 0) return;
      const existing = map.get(t.sprint);
      if (existing) {
        ds.forEach((d) => {
          if (d < existing.min) existing.min = new Date(d);
          if (d > existing.max) existing.max = new Date(d);
        });
      } else {
        map.set(t.sprint, {
          min: new Date(Math.min(...ds.map((d) => d.getTime()))),
          max: new Date(Math.max(...ds.map((d) => d.getTime()))),
        });
      }
    });
    return [...map.entries()]
      .map(([name, { min, max }]) => ({
        name,
        left: diffDays(origin, min) * DAY_PX,
        width: Math.max(diffDays(min, max) * DAY_PX, 50),
      }))
      .sort((a, b) => a.left - b.left);
  }, [tasks, origin]);

  const hasSprints = sprints.length > 0;

  /* ── scroll to today ────────────────────────────────────── */
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.scrollLeft = Math.max(0, todayPx - 300);
    }
  }, [todayPx]);

  /* ── sync vertical scroll between left & right panels ──── */
  const leftBodyRef = useRef<HTMLDivElement>(null);
  const rightBodyRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const syncScroll = useCallback(
    (source: "left" | "right") => {
      if (syncing.current) return;
      syncing.current = true;
      const from = source === "left" ? leftBodyRef.current : rightBodyRef.current;
      const to = source === "left" ? rightBodyRef.current : leftBodyRef.current;
      if (from && to) to.scrollTop = from.scrollTop;
      requestAnimationFrame(() => {
        syncing.current = false;
      });
    },
    []
  );

  /* ── bar calculator ─────────────────────────────────────── */
  const getBar = useCallback(
    (task: Task) => {
      const start = parseDate(task.created);
      const end = parseDate(task.dueDate);
      if (!start && !end) return null;

      const barStart = start || end!;
      const barEnd = end || new Date(barStart.getTime() + 14 * 86400000);
      const left = diffDays(origin, barStart) * DAY_PX;
      const width = Math.max(diffDays(barStart, barEnd) * DAY_PX, 12);
      const color = BAR_COLORS[task.status] || "#52525b";
      return { left, width, color };
    },
    [origin]
  );

  /* ── empty state ────────────────────────────────────────── */
  if (tasks.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <p className="text-sm text-[var(--text-muted)]">No issues found</p>
      </div>
    );
  }

  const bodyH = rows.length * ROW_H;

  return (
    <div className="animate-fade-in">
      {/* Expand / Collapse */}
      <div className="flex items-center gap-2 mb-2">
        <button onClick={expandAll} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors px-2 py-1 rounded hover:bg-[var(--bg-hover)]">Expand All</button>
        <span className="text-[var(--border-light)]">|</span>
        <button onClick={collapseAll} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors px-2 py-1 rounded hover:bg-[var(--bg-hover)]">Collapse All</button>
      </div>

      <div className="border border-[var(--border)] rounded-lg overflow-hidden flex" style={{ maxHeight: "calc(100vh - 340px)" }}>
        {/* ── LEFT PANEL ────────────────────────────────────── */}
        <div className="flex-shrink-0 border-r border-[var(--border)] flex flex-col" style={{ width: LEFT_W }}>
          {/* Header row */}
          <div
            className="bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center px-4 flex-shrink-0"
            style={{ height: HEADER_H }}
          >
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Work
            </span>
          </div>

          {/* Sprint placeholder row */}
          {hasSprints && (
            <div
              className="bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center px-4 flex-shrink-0"
              style={{ height: SPRINT_H }}
            >
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                Sprints
              </span>
            </div>
          )}

          {/* Scrollable task rows */}
          <div
            ref={leftBodyRef}
            className="overflow-y-auto overflow-x-hidden flex-1"
            onScroll={() => syncScroll("left")}
          >
            {rows.map(({ task, depth, hasChildren }) => (
              <div
                key={`l-${task.sheet}-${task.rowNumber}`}
                className="flex items-center border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group"
                style={{ height: ROW_H, paddingLeft: 12 + depth * 20 }}
                onClick={() => onEdit(task)}
              >
                {hasChildren ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(task.issueKey);
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--border)] flex-shrink-0 text-[var(--text-muted)] mr-1"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform duration-150 ${expanded.has(task.issueKey) ? "rotate-90" : ""}`}
                    >
                      <polyline points="9 6 15 12 9 18" />
                    </svg>
                  </button>
                ) : (
                  <span className="w-5 mr-1 flex-shrink-0" />
                )}
                <TypeIcon type={task.issueType} />
                <span className="text-[var(--accent)] font-mono text-[11px] ml-1.5 flex-shrink-0">
                  {task.issueKey}
                </span>
                <span className="text-xs text-[var(--text)] ml-2 truncate">
                  {task.summary}
                </span>
                {task.status === "Done" && (
                  <span className="ml-auto mr-2 px-1.5 py-0.5 text-[9px] font-bold bg-green-500/20 text-green-400 rounded uppercase flex-shrink-0">
                    Done
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL (chart) ───────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Month header — horizontally scrollable, fixed vertically */}
          <div
            ref={chartRef}
            className="overflow-x-auto flex-shrink-0"
            onScroll={(e) => {
              /* keep chart body in sync horizontally */
              if (rightBodyRef.current)
                rightBodyRef.current.scrollLeft = (e.target as HTMLElement).scrollLeft;
            }}
          >
            <div style={{ width: chartWidth }} className="relative">
              {/* Month headers */}
              <div
                className="flex border-b border-[var(--border)] bg-[var(--bg-card)]"
                style={{ height: HEADER_H }}
              >
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-r border-[var(--border)] flex items-end pb-2 px-3"
                    style={{ left: m.offset, width: m.width }}
                  >
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Sprint bars */}
              {hasSprints && (
                <div
                  className="relative border-b border-[var(--border)] bg-[var(--bg-card)]"
                  style={{ height: SPRINT_H }}
                >
                  {sprints.map((s) => (
                    <div
                      key={s.name}
                      className="absolute top-[3px] rounded border border-[var(--border-light)] bg-[var(--bg-hover)] flex items-center px-2 overflow-hidden"
                      style={{
                        left: s.left,
                        width: s.width,
                        height: SPRINT_H - 6,
                      }}
                    >
                      <span className="text-[10px] text-[var(--text-secondary)] whitespace-nowrap">
                        {s.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chart body — scrolls both ways */}
          <div
            ref={rightBodyRef}
            className="overflow-auto flex-1"
            onScroll={(e) => {
              syncScroll("right");
              /* keep header in sync horizontally */
              if (chartRef.current)
                chartRef.current.scrollLeft = (e.target as HTMLElement).scrollLeft;
            }}
          >
            <div style={{ width: chartWidth, height: bodyH }} className="relative">
              {/* Month grid columns */}
              {months.map((m, i) => (
                <div
                  key={`g-${i}`}
                  className="absolute top-0 border-r border-[var(--border)]"
                  style={{
                    left: m.offset + m.width,
                    height: bodyH,
                  }}
                />
              ))}

              {/* Task rows + bars */}
              {rows.map(({ task }, i) => {
                const bar = getBar(task);
                const top = i * ROW_H;
                return (
                  <div
                    key={`r-${task.sheet}-${task.rowNumber}`}
                    className="absolute w-full border-b border-[var(--border)] hover:bg-[var(--bg-hover)]/40 transition-colors"
                    style={{ top, height: ROW_H }}
                  >
                    {bar && (
                      <div
                        className="absolute rounded-md cursor-pointer hover:brightness-125 transition-all flex items-center px-2 overflow-hidden shadow-sm"
                        style={{
                          top: 7,
                          height: ROW_H - 14,
                          left: bar.left,
                          width: bar.width,
                          backgroundColor: bar.color,
                          borderLeft: `3px solid ${TYPE_ACCENT[task.issueType] || bar.color}`,
                        }}
                        onClick={() => onEdit(task)}
                        title={`${task.issueKey}: ${task.summary}\nStatus: ${task.status}\n${task.created ? `Start: ${task.created}` : ""}${task.dueDate ? `\nDue: ${task.dueDate}` : ""}`}
                      >
                        {bar.width > 80 && (
                          <span className="text-[10px] text-white font-medium truncate">
                            {task.summary}
                          </span>
                        )}
                      </div>
                    )}

                    {/* No-date indicator */}
                    {!bar && (
                      <div
                        className="absolute top-2.5 flex items-center gap-1 text-[var(--text-muted)]"
                        style={{ left: todayPx + 8 }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span className="text-[10px]">No dates</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Today line */}
              {todayPx > 0 && todayPx < chartWidth && (
                <div
                  className="absolute top-0 w-0.5 bg-blue-400/80 z-10 pointer-events-none"
                  style={{ left: todayPx, height: bodyH }}
                >
                  <div className="absolute -top-0 -left-[4px] w-[9px] h-[9px] rounded-full bg-blue-400 border-2 border-blue-300" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
