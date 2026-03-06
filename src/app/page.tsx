"use client";

import { useState, useEffect, useCallback } from "react";
import { Task, TaskFormData, Status, EpicSheet } from "@/types/task";
import TaskTable from "@/components/TaskTable";
import TaskModal from "@/components/TaskModal";
import FilterBar from "@/components/FilterBar";
import Timeline from "@/components/Timeline";

type ViewMode = "table" | "timeline";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [epics, setEpics] = useState<EpicSheet[]>([]);
  const [sheets, setSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [insertConfig, setInsertConfig] = useState<{ sheet: string; insertAfterRow: number; parentKey?: string } | null>(null);
  const [view, setView] = useState<ViewMode>("table");
  const [filters, setFilters] = useState({
    status: "",
    sprint: "",
    assignee: "",
    search: "",
  });

  // Fetch sheet list once
  useEffect(() => {
    fetch("/api/tasks?meta=sheets", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setSheets(data))
      .catch(console.error);
  }, []);

  const fetchEpics = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks?meta=epics", { cache: "no-store" });
      const data = await res.json();
      setEpics(data);
    } catch (err) {
      console.error("Failed to fetch epics:", err);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeSheet) params.set("sheet", activeSheet);
      if (filters.status) params.set("status", filters.status);
      if (filters.sprint) params.set("sprint", filters.sprint);
      if (filters.assignee) params.set("assignee", filters.assignee);
      if (filters.search) params.set("search", filters.search);

      const res = await fetch(`/api/tasks?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [activeSheet, filters]);

  useEffect(() => {
    setLoading(true);
    fetchTasks();
    fetchEpics();
  }, [fetchTasks, fetchEpics]);

  const handleCreate = async (data: TaskFormData) => {
    const payload = insertConfig ? { ...data, insertAfterRow: insertConfig.insertAfterRow } : data;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setModalOpen(false);
    setInsertConfig(null);
    fetchTasks();
    fetchEpics();
  };

  const handleUpdate = async (data: TaskFormData) => {
    if (!editingTask) return;
    await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        sheet: editingTask.sheet,
        rowNumber: editingTask.rowNumber,
      }),
    });
    setEditingTask(null);
    setModalOpen(false);
    fetchTasks();
    fetchEpics();
  };

  const handleDelete = async (task: Task) => {
    await fetch(
      `/api/tasks?sheet=${encodeURIComponent(task.sheet)}&rowNumber=${task.rowNumber}`,
      { method: "DELETE" }
    );
    fetchTasks();
    fetchEpics();
  };

  const handleStatusChange = async (task: Task, status: Status) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.issueKey === task.issueKey ? { ...t, status } : t))
    );

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: task.sheet,
          rowNumber: task.rowNumber,
          status,
        }),
      });
      
      if (!res.ok) {
        throw new Error("Server returned " + res.status);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update status. If you are on Vercel, you cannot save to the Excel file due to its Read-Only filesystem.");
      // Revert by re-fetching
      fetchTasks();
    }
    fetchEpics();
  };

  /** Inline field change (assignee, priority, sprint, storyPoints, etc.) */
  const handleFieldChange = async (task: Task, field: string, value: string) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.issueKey === task.issueKey ? { ...t, [field]: value } : t))
    );

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: task.sheet,
          rowNumber: task.rowNumber,
          [field]: value,
        }),
      });
      
      if (!res.ok) {
        throw new Error("Server returned " + res.status);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update field. If you are on Vercel, you cannot save to the Excel file due to its Read-Only filesystem.");
      fetchTasks();
    }
    fetchEpics();
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingTask(null);
    setInsertConfig(null);
    setModalOpen(true);
  };

  const handleInsert = (sheet: string, insertAfterRow: number, parentKey?: string) => {
    setEditingTask(null);
    setInsertConfig({ sheet, insertAfterRow, parentKey });
    setModalOpen(true);
  };

  // Derived values for filters
  const sprints = [...new Set(tasks.map((t) => t.sprint).filter(Boolean))];
  const assignees = [...new Set(tasks.map((t) => t.assignee).filter(Boolean))];

  // Global stats
  const totalAll = epics.reduce((s, e) => s + e.total, 0);
  const doneAll = epics.reduce((s, e) => s + e.done, 0);
  const inProgressAll = epics.reduce((s, e) => s + e.inProgress, 0);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] sticky top-0 z-40 bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-[var(--accent)] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight">Passion Tree</span>
            <span className="text-[var(--text-muted)] text-sm">/</span>
            <span className="text-[var(--text-secondary)] text-sm">Tracking</span>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border)] rounded-md p-0.5">
              <button
                onClick={() => setView("table")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  view === "table"
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
                title="Table view"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
                Table
              </button>
              <button
                onClick={() => setView("timeline")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  view === "timeline"
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
                title="Timeline view"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="4" width="7" height="4" rx="1" />
                  <rect x="6" y="10" width="10" height="4" rx="1" />
                  <rect x="4" y="16" width="12" height="4" rx="1" />
                </svg>
                Timeline
              </button>
            </div>

            <button
              onClick={openCreate}
              className="h-8 px-3 text-sm font-medium rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Issue
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Global Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Total Issues</p>
            <p className="text-2xl font-semibold tabular-nums">{totalAll}</p>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-semibold tabular-nums text-[var(--yellow)]">{inProgressAll}</p>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-semibold tabular-nums text-[var(--green)]">{doneAll}</p>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">Progress</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-semibold tabular-nums text-[var(--accent)]">
                {totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0}%
              </p>
              <div className="flex-1 h-2 bg-[var(--border)] rounded-full mb-1.5 overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                  style={{ width: `${totalAll > 0 ? (doneAll / totalAll) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Epic Tabs */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 border-b border-[var(--border)]">
          <button
            onClick={() => setActiveSheet("")}
            className={`px-3 py-2 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap ${
              activeSheet === ""
                ? "text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--bg-card)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
            }`}
          >
            All Epics
            <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">{totalAll}</span>
          </button>
          {sheets.map((name) => {
            const epic = epics.find((e) => e.name === name);
            const isActive = activeSheet === name;
            return (
              <button
                key={name}
                onClick={() => setActiveSheet(name)}
                className={`px-3 py-2 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? "text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--bg-card)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                {name}
                {epic && (
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {epic.done}/{epic.total}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          sprints={sprints}
          assignees={assignees}
          onFilterChange={setFilters}
        />

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-[var(--border-light)] border-t-[var(--accent)] rounded-full animate-spin" />
          </div>
        ) : view === "table" ? (
          <TaskTable
            tasks={tasks}
            onEdit={openEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onFieldChange={handleFieldChange}
            onInsertTask={handleInsert}
          />
        ) : (
          <Timeline tasks={tasks} onEdit={openEdit} />
        )}
      </main>

      {/* Modal */}
      {modalOpen && (
        <TaskModal
          task={editingTask}
          insertConfig={insertConfig}
          tasks={tasks}
          sheets={sheets}
          activeSheet={activeSheet}
          onSubmit={editingTask ? handleUpdate : handleCreate}
          onClose={() => {
            setModalOpen(false);
            setEditingTask(null);
            setInsertConfig(null);
          }}
        />
      )}
    </div>
  );
}
