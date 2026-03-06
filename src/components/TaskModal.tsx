"use client";

import { useState, useEffect } from "react";
import {
  Task,
  TaskFormData,
  IssueType,
  Status,
  Priority,
} from "@/types/task";

interface TaskModalProps {
  task: Task | null;
  insertConfig: { sheet: string; insertAfterRow: number; parentKey?: string } | null;
  tasks: Task[];
  sheets: string[];
  activeSheet: string;
  onSubmit: (data: TaskFormData) => void;
  onClose: () => void;
}

const ISSUE_TYPES: IssueType[] = ["Epic", "Task", "Subtask", "Test"];
const STATUSES: Status[] = [
  "Backlog",
  "To Do",
  "In Progress",
  "In Review",
  "Done",
  "Cancelled",
];
const PRIORITIES: Priority[] = ["Highest", "High", "Medium", "Low", "Lowest"];

export default function TaskModal({
  task,
  insertConfig,
  tasks,
  sheets,
  activeSheet,
  onSubmit,
  onClose,
}: TaskModalProps) {
  const defaultSheet = task?.sheet || insertConfig?.sheet || activeSheet || sheets[0] || "";

  const [form, setForm] = useState<TaskFormData>({
    summary: "",
    issueType: "Task",
    status: "Backlog",
    priority: "Medium",
    assignee: "",
    parentKey: "",
    parentSummary: "",
    sprint: "",
    dueDate: "",
    storyPoints: "",
    sheet: defaultSheet,
    insertAfterRow: insertConfig?.insertAfterRow,
  });

  useEffect(() => {
    if (task) {
      setForm({
        summary: task.summary,
        issueType: task.issueType,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        parentKey: task.parentKey,
        parentSummary: task.parentSummary,
        sprint: task.sprint,
        dueDate: task.dueDate,
        storyPoints: task.storyPoints,
        sheet: task.sheet,
      });
    } else if (insertConfig) {
      setForm((f) => ({ 
        ...f, 
        sheet: insertConfig.sheet, 
        parentKey: insertConfig.parentKey || "",
        insertAfterRow: insertConfig.insertAfterRow,
        issueType: insertConfig.parentKey ? "Subtask" : "Task"
      }));
    } else {
      setForm((f) => ({ ...f, sheet: activeSheet || sheets[0] || "", parentKey: "", insertAfterRow: undefined, issueType: "Task" }));
    }
  }, [task, insertConfig, activeSheet, sheets]);

  const set = (key: keyof TaskFormData, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const parentOptions = tasks.filter(
    (t) =>
      (t.issueType === "Epic" || t.issueType === "Task") &&
      !(task && t.sheet === task.sheet && t.rowNumber === task.rowNumber)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.summary.trim()) return;
    // Auto-fill parentSummary from selected parentKey
    if (form.parentKey) {
      const parent = tasks.find((t) => t.issueKey === form.parentKey);
      if (parent) form.parentSummary = parent.summary;
    }
    onSubmit(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold">
            {task ? "Edit Issue" : "New Issue"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--border)] transition-colors text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Epic Sheet (only for new issues) */}
          {!task && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                Epic / Sheet
              </label>
              <select
                value={form.sheet}
                onChange={(e) => set("sheet", e.target.value)}
                className="w-full h-9 px-3 text-sm bg-[var(--bg)] border border-[var(--border)] rounded-md text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                {sheets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Summary */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
              Summary
            </label>
            <input
              type="text"
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full h-9 px-3 text-sm bg-[var(--bg)] border border-[var(--border)] rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                Type
              </label>
              <select
                value={form.issueType}
                onChange={(e) => set("issueType", e.target.value)}
                className="w-full h-9 px-3 text-sm bg-[var(--bg)] border border-[var(--border)] rounded-md text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                {ISSUE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full h-9 px-3 text-sm bg-[var(--bg)] border border-[var(--border)] rounded-md text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority + Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
                className="w-full h-9 px-3 text-sm bg-[var(--bg)] border border-[var(--border)] rounded-md text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                Assignee
              </label>
              <input
                type="text"
                value={form.assignee}
                onChange={(e) => set("assignee", e.target.value)}
                placeholder="Name"
                className="w-full h-9 px-3 text-sm bg-[var(--bg)] border border-[var(--border)] rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
          </div>

          {/* Sprint + Parent */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                Sprint
              </label>
              <input
                type="text"
                value={form.sprint}
                onChange={(e) => set("sprint", e.target.value)}
                placeholder="Sprint 1"
                className="w-full h-9 px-3 text-sm bg-[var(--bg)] border border-[var(--border)] rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                Parent Issue
              </label>
              <select
                value={form.parentKey}
                onChange={(e) => set("parentKey", e.target.value)}
                className="w-full h-9 px-3 text-sm bg-[var(--bg)] border border-[var(--border)] rounded-md text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                <option value="">None</option>
                {parentOptions.map((t) => (
                  <option key={`${t.sheet}-${t.rowNumber}`} value={t.issueKey}>
                    {t.issueKey} — {t.summary}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date + Story Points */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                Due Date
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
                className="w-full h-9 px-3 text-sm bg-[var(--bg)] border border-[var(--border)] rounded-md text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                Story Points
              </label>
              <input
                type="number"
                min="0"
                value={form.storyPoints}
                onChange={(e) => set("storyPoints", e.target.value)}
                placeholder="0"
                className="w-full h-9 px-3 text-sm bg-[var(--bg)] border border-[var(--border)] rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 text-sm font-medium rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-8 px-4 text-sm font-medium rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors"
            >
              {task ? "Save Changes" : "Create Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
