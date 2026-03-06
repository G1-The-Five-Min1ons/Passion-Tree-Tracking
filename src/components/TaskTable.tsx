"use client";

import { Task, Status, Priority } from "@/types/task";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";

interface TaskTableProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: Status) => void;
  onFieldChange: (task: Task, field: string, value: string) => void;
  onInsertTask: (sheet: string, insertAfterRow: number, parentKey?: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Backlog: "bg-zinc-600",
  "To Do": "bg-zinc-500",
  "In Progress": "bg-yellow-500",
  "In Review": "bg-purple-500",
  Done: "bg-green-500",
  Cancelled: "bg-red-500",
};

const PRIORITY_ICONS: Record<string, { color: string; label: string }> = {
  Highest: { color: "text-red-400", label: "↑↑" },
  High: { color: "text-orange-400", label: "↑" },
  Medium: { color: "text-yellow-400", label: "—" },
  Low: { color: "text-blue-400", label: "↓" },
  Lowest: { color: "text-zinc-400", label: "↓↓" },
};

const STATUSES: Status[] = [
  "Backlog",
  "To Do",
  "In Progress",
  "In Review",
  "Done",
  "Cancelled",
];

const PRIORITIES: Priority[] = ["Highest", "High", "Medium", "Low", "Lowest"];

/* JIRA-style type icon */
export function TypeIcon({ type }: { type: string }) {
  if (type === "Epic") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#a855f7" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (type === "Task") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
        <rect x="3" y="3" width="18" height="18" rx="3" fill="#3b82f6"/>
        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (type === "Test") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
        <rect x="3" y="3" width="18" height="18" rx="3" fill="#f97316"/>
        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  // Subtask
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
      <rect x="3" y="3" width="18" height="18" rx="3" fill="#22c55e"/>
      <path d="M7 12h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 7v10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

interface TreeNode {
  task: Task;
  children: TreeNode[];
}

/* Inline edit cell — renders input on click */
function InlineEdit({
  value,
  onSave,
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing, value]);

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        className="cursor-pointer min-w-[60px] min-h-[20px] flex items-center"
        title="Click to edit"
      >
        {value ? (
          <span className="text-xs text-[var(--text-secondary)] truncate hover:text-[var(--text)] transition-colors">
            {value}
          </span>
        ) : (
          <span className="text-xs text-[var(--text-muted)] italic hover:text-[var(--text-secondary)] transition-colors">
            {placeholder || "—"}
          </span>
        )}
      </div>
    );
  }

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value) onSave(draft.trim());
  };

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") { setDraft(value); setEditing(false); }
      }}
      className="w-full h-7 px-1.5 text-xs bg-[var(--bg)] border border-[var(--accent)] rounded text-[var(--text)] focus:outline-none"
    />
  );
}

export default function TaskTable({
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
  onFieldChange,
  onInsertTask,
}: TaskTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = useCallback((issueKey: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(issueKey)) next.delete(issueKey);
      else next.add(issueKey);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allKeys = new Set(
      tasks
        .filter((t) => tasks.some((c) => c.parentKey === t.issueKey))
        .map((t) => t.issueKey)
    );
    setExpanded(allKeys);
  }, [tasks]);

  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  // Build tree
  const tree = useMemo(() => {
    const byKey = new Map<string, Task>();
    tasks.forEach((t) => byKey.set(t.issueKey, t));
    const childrenOf = new Map<string, Task[]>();
    const roots: Task[] = [];
    tasks.forEach((t) => {
      if (t.parentKey && byKey.has(t.parentKey)) {
        const siblings = childrenOf.get(t.parentKey) || [];
        siblings.push(t);
        childrenOf.set(t.parentKey, siblings);
      } else {
        roots.push(t);
      }
    });
    const buildTree = (items: Task[]): TreeNode[] =>
      items.map((t) => ({
        task: t,
        children: buildTree(childrenOf.get(t.issueKey) || []),
      }));
    return buildTree(roots);
  }, [tasks]);

  // Flatten
  const visibleRows = useMemo(() => {
    const result: { task: Task; depth: number; hasChildren: boolean }[] = [];
    const walk = (nodes: TreeNode[], depth: number) => {
      nodes.forEach((node) => {
        const hasChildren = node.children.length > 0;
        result.push({ task: node.task, depth, hasChildren });
        if (hasChildren && expanded.has(node.task.issueKey)) {
          walk(node.children, depth + 1);
        }
      });
    };
    walk(tree, 0);
    return result;
  }, [tree, expanded]);

  // Unique assignees for datalist
  const allAssignees = useMemo(
    () => [...new Set(tasks.map((t) => t.assignee).filter(Boolean))],
    [tasks]
  );

  if (tasks.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="inline-flex w-12 h-12 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] items-center justify-center mb-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="9" x2="15" y2="15" />
            <line x1="15" y1="9" x2="9" y2="15" />
          </svg>
        </div>
        <p className="text-sm text-[var(--text-muted)]">No issues found</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Create your first issue to get started</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Expand / Collapse controls */}
      <div className="flex items-center gap-2 mb-2">
        <button onClick={expandAll} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors px-2 py-1 rounded hover:bg-[var(--bg-hover)]">Expand All</button>
        <span className="text-[var(--border-light)]">|</span>
        <button onClick={collapseAll} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors px-2 py-1 rounded hover:bg-[var(--bg-hover)]">Collapse All</button>
      </div>

      {/* Datalist for assignees */}
      <datalist id="assignee-list">
        {allAssignees.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>

      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--bg-card)] border-b border-[var(--border)]">
              <th className="text-left font-medium text-[var(--text-muted)] text-xs uppercase tracking-wider px-4 py-2.5">Work</th>
              <th className="text-left font-medium text-[var(--text-muted)] text-xs uppercase tracking-wider px-4 py-2.5 w-[150px]">Assignee</th>
              <th className="text-left font-medium text-[var(--text-muted)] text-xs uppercase tracking-wider px-4 py-2.5 w-[110px]">Priority</th>
              <th className="text-left font-medium text-[var(--text-muted)] text-xs uppercase tracking-wider px-4 py-2.5 w-[140px]">Status</th>
              <th className="text-left font-medium text-[var(--text-muted)] text-xs uppercase tracking-wider px-4 py-2.5 w-[100px]">Sprint</th>
              <th className="text-left font-medium text-[var(--text-muted)] text-xs uppercase tracking-wider px-4 py-2.5 w-[90px]">Points</th>
              <th className="text-right font-medium text-[var(--text-muted)] text-xs uppercase tracking-wider px-4 py-2.5 w-[60px]"></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ task, depth, hasChildren }) => {
              const isExpanded = expanded.has(task.issueKey);
              const taskKey = `${task.sheet}-${task.rowNumber}`;

              return (
                <tr
                  key={taskKey}
                  className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors group"
                >
                  {/* Work */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2" style={{ paddingLeft: depth * 28 }}>
                      {hasChildren ? (
                        <button
                          onClick={() => toggle(task.issueKey)}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--border)] transition-colors flex-shrink-0 text-[var(--text-muted)]"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            className={`transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}>
                            <polyline points="9 6 15 12 9 18" />
                          </svg>
                        </button>
                      ) : (
                        <span className="w-5 flex-shrink-0" />
                      )}
                      <TypeIcon type={task.issueType} />
                      <span className="text-[var(--accent)] font-mono text-xs flex-shrink-0 cursor-pointer hover:underline" onClick={() => onEdit(task)}>
                        {task.issueKey}
                      </span>
                      <span className="text-[var(--text)] truncate cursor-pointer hover:text-[var(--accent)] transition-colors" onClick={() => onEdit(task)}>
                        {task.summary}
                      </span>
                    </div>
                  </td>

                  {/* Assignee — inline editable */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {task.assignee ? (
                        <div className="w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0">
                          {task.assignee.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-[var(--border)] flex items-center justify-center flex-shrink-0">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)]">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                        </div>
                      )}
                      <InlineEdit
                        value={task.assignee}
                        placeholder="Unassigned"
                        onSave={(v) => onFieldChange(task, "assignee", v)}
                      />
                    </div>
                  </td>

                  {/* Priority — inline dropdown */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-mono ${PRIORITY_ICONS[task.priority]?.color || "text-zinc-400"}`}>
                        {PRIORITY_ICONS[task.priority]?.label || "—"}
                      </span>
                      <select
                        value={task.priority}
                        onChange={(e) => onFieldChange(task, "priority", e.target.value)}
                        className="bg-transparent text-xs text-[var(--text-muted)] focus:outline-none cursor-pointer appearance-none hover:text-[var(--text)] transition-colors"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p} className="bg-[var(--bg-card)]">{p}</option>
                        ))}
                      </select>
                    </div>
                  </td>

                  {/* Status — inline dropdown */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[task.status] || "bg-zinc-500"}`} />
                      <select
                        value={task.status}
                        onChange={(e) => onStatusChange(task, e.target.value as Status)}
                        className="bg-transparent text-xs text-[var(--text-secondary)] focus:outline-none cursor-pointer appearance-none hover:text-[var(--text)] transition-colors"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s} className="bg-[var(--bg-card)]">{s}</option>
                        ))}
                      </select>
                    </div>
                  </td>

                  {/* Sprint — inline editable */}
                  <td className="px-4 py-2.5">
                    <InlineEdit
                      value={task.sprint}
                      placeholder="—"
                      onSave={(v) => onFieldChange(task, "sprint", v)}
                    />
                  </td>

                  {/* Story Points — inline editable */}
                  <td className="px-4 py-2.5">
                    <InlineEdit
                      value={task.storyPoints}
                      placeholder="—"
                      onSave={(v) => onFieldChange(task, "storyPoints", v)}
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onInsertTask(task.sheet, task.rowNumber, task.issueType === 'Epic' ? task.issueKey : task.parentKey)}
                        className="p-1 rounded hover:bg-[var(--border)] transition-colors text-[var(--text-muted)] hover:text-green-500"
                        title="Add task below"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </button>
                      <button
                        onClick={() => onEdit(task)}
                        className="p-1 rounded hover:bg-[var(--border)] transition-colors text-[var(--text-muted)] hover:text-[var(--text)]"
                        title="Edit all fields"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { if (confirm("Delete this issue?")) onDelete(task); }}
                        className="p-1 rounded hover:bg-red-500/20 transition-colors text-[var(--text-muted)] hover:text-red-400"
                        title="Delete"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
