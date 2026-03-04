import { NextRequest, NextResponse } from "next/server";
import {
  getAllTasks,
  getEpicSheets,
  getSheetNames,
  updateTask,
  createTask,
  deleteTask,
  generateIssueKey,
} from "@/lib/excel";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sheet = url.searchParams.get("sheet") || undefined;
    const status = url.searchParams.get("status");
    const sprint = url.searchParams.get("sprint");
    const assignee = url.searchParams.get("assignee");
    const search = url.searchParams.get("search");
    const meta = url.searchParams.get("meta"); // "sheets" or "epics"

    // Meta endpoints
    if (meta === "sheets") {
      const names = await getSheetNames();
      return NextResponse.json(names);
    }
    if (meta === "epics") {
      const epics = await getEpicSheets();
      return NextResponse.json(epics);
    }

    let tasks = await getAllTasks(sheet);

    if (status) tasks = tasks.filter((t) => t.status === status);
    if (sprint) tasks = tasks.filter((t) => t.sprint === sprint);
    if (assignee) tasks = tasks.filter((t) => t.assignee === assignee);
    if (search) {
      const q = search.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.summary.toLowerCase().includes(q) ||
          t.issueKey.toLowerCase().includes(q)
      );
    }

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to read tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sheetName = body.sheet;
    if (!sheetName) {
      return NextResponse.json(
        { error: "Missing sheet name" },
        { status: 400 }
      );
    }
    const issueKey = await generateIssueKey();
    const task = await createTask(sheetName, {
      issueKey,
      summary: body.summary || "",
      issueType: body.issueType || "Task",
      status: body.status || "Backlog",
      priority: body.priority || "Medium",
      assignee: body.assignee || "",
      dueDate: body.dueDate || "",
      storyPoints: body.storyPoints || "",
      sprint: body.sprint || "",
      parentKey: body.parentKey || "",
      parentSummary: body.parentSummary || "",
    });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sheet, rowNumber, ...data } = body;
    if (!sheet || !rowNumber) {
      return NextResponse.json(
        { error: "Missing sheet or rowNumber" },
        { status: 400 }
      );
    }
    const task = await updateTask(sheet, rowNumber, data);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (error) {
    console.error("PUT /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sheet = url.searchParams.get("sheet");
    const rowNumber = url.searchParams.get("rowNumber");
    if (!sheet || !rowNumber) {
      return NextResponse.json(
        { error: "Missing sheet or rowNumber" },
        { status: 400 }
      );
    }
    const success = await deleteTask(sheet, parseInt(rowNumber, 10));
    if (!success) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
