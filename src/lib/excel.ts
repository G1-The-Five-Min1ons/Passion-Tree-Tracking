import ExcelJS from "exceljs";
import path from "path";
import { Task, EpicSheet } from "@/types/task";

const EXCEL_PATH = path.join(process.cwd(), "Tracking.xlsx");

/** Sheets to skip — they are not Epic data sheets */
const SKIP_SHEETS = new Set(["Dashboard", "_Data", "_Lists"]);

/**
 * Column mapping (1-indexed) for every Epic sheet:
 *  1: Issue key  2: Summary  3: Issue Type  4: Status
 *  5: Priority   6: Assignee 7: Created     8: Due date
 *  9: Story Points 10: Sprint 11: Parent Key 12: Parent Summary
 */

function cellText(row: ExcelJS.Row, col: number): string {
  const v = row.getCell(col).value;
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    return v.toISOString().split("T")[0]; // yyyy-mm-dd
  }
  return String(v).trim();
}

function rowToTask(
  row: ExcelJS.Row,
  rowNumber: number,
  sheetName: string
): Task | null {
  const issueKey = cellText(row, 1);
  if (!issueKey || issueKey === "Issue key") return null; // skip header
  return {
    rowNumber,
    sheet: sheetName,
    issueKey,
    summary: cellText(row, 2),
    issueType: (cellText(row, 3) as Task["issueType"]) || "Task",
    status: (cellText(row, 4) as Task["status"]) || "Backlog",
    priority: (cellText(row, 5) as Task["priority"]) || "Medium",
    assignee: cellText(row, 6),
    created: cellText(row, 7),
    dueDate: cellText(row, 8),
    storyPoints: cellText(row, 9),
    sprint: cellText(row, 10),
    parentKey: cellText(row, 11),
    parentSummary: cellText(row, 12),
  };
}

// ─── READ ────────────────────────────────────────────────────

/** Return the list of Epic sheet names */
export async function getSheetNames(): Promise<string[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const names: string[] = [];
  wb.eachSheet((sheet) => {
    if (!SKIP_SHEETS.has(sheet.name)) names.push(sheet.name);
  });
  return names;
}

/** Return summary info for each Epic sheet */
export async function getEpicSheets(): Promise<EpicSheet[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const result: EpicSheet[] = [];
  wb.eachSheet((sheet) => {
    if (SKIP_SHEETS.has(sheet.name)) return;
    let total = 0,
      done = 0,
      inProgress = 0;
    sheet.eachRow((row, rn) => {
      if (rn === 1) return;
      const t = rowToTask(row, rn, sheet.name);
      if (!t) return;
      total++;
      if (t.status === "Done") done++;
      if (t.status === "In Progress") inProgress++;
    });
    result.push({ name: sheet.name, total, done, inProgress });
  });
  return result;
}

/** Read all tasks from a single sheet (or ALL sheets if sheetName is omitted) */
export async function getAllTasks(sheetName?: string): Promise<Task[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const tasks: Task[] = [];

  const processSheet = (sheet: ExcelJS.Worksheet) => {
    sheet.eachRow((row, rn) => {
      if (rn === 1) return;
      const t = rowToTask(row, rn, sheet.name);
      if (t) tasks.push(t);
    });
  };

  if (sheetName) {
    const sheet = wb.getWorksheet(sheetName);
    if (sheet) processSheet(sheet);
  } else {
    wb.eachSheet((sheet) => {
      if (!SKIP_SHEETS.has(sheet.name)) processSheet(sheet);
    });
  }

  return tasks;
}

// ─── WRITE ───────────────────────────────────────────────────

/** Update specific fields of a task identified by sheet + rowNumber */
export async function updateTask(
  sheetName: string,
  rowNumber: number,
  data: Partial<
    Pick<
      Task,
      | "summary"
      | "issueType"
      | "status"
      | "priority"
      | "assignee"
      | "dueDate"
      | "storyPoints"
      | "sprint"
      | "parentKey"
      | "parentSummary"
    >
  >
): Promise<Task | null> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const sheet = wb.getWorksheet(sheetName);
  if (!sheet) return null;

  const row = sheet.getRow(rowNumber);
  if (!row || !cellText(row, 1)) return null;

  if (data.summary !== undefined) row.getCell(2).value = data.summary;
  if (data.issueType !== undefined) row.getCell(3).value = data.issueType;
  if (data.status !== undefined) row.getCell(4).value = data.status;
  if (data.priority !== undefined) row.getCell(5).value = data.priority;
  if (data.assignee !== undefined) row.getCell(6).value = data.assignee;
  if (data.dueDate !== undefined) row.getCell(8).value = data.dueDate;
  if (data.storyPoints !== undefined) row.getCell(9).value = data.storyPoints;
  if (data.sprint !== undefined) row.getCell(10).value = data.sprint;
  if (data.parentKey !== undefined) row.getCell(11).value = data.parentKey;
  if (data.parentSummary !== undefined)
    row.getCell(12).value = data.parentSummary;
  row.commit();

  await wb.xlsx.writeFile(EXCEL_PATH);
  return rowToTask(row, rowNumber, sheetName);
}

/** Add a new task row to a sheet */
export async function createTask(
  sheetName: string,
  data: {
    issueKey: string;
    summary: string;
    issueType: string;
    status: string;
    priority: string;
    assignee: string;
    dueDate: string;
    storyPoints: string;
    sprint: string;
    parentKey: string;
    parentSummary: string;
  }
): Promise<Task> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  let sheet = wb.getWorksheet(sheetName);
  if (!sheet) {
    // Create a new sheet with headers
    sheet = wb.addWorksheet(sheetName);
    sheet.addRow([
      "Issue key",
      "Summary",
      "Issue Type",
      "Status",
      "Priority",
      "Assignee",
      "Created",
      "Due date",
      "Story Points",
      "Sprint",
      "Parent Key",
      "Parent Summary",
    ]);
  }

  const now = new Date().toISOString().split("T")[0];
  const newRow = sheet.addRow([
    data.issueKey,
    data.summary,
    data.issueType,
    data.status,
    data.priority,
    data.assignee,
    now,
    data.dueDate,
    data.storyPoints,
    data.sprint,
    data.parentKey,
    data.parentSummary,
  ]);
  newRow.commit();

  await wb.xlsx.writeFile(EXCEL_PATH);
  return rowToTask(newRow, newRow.number, sheetName)!;
}

/** Delete a task row from a sheet */
export async function deleteTask(
  sheetName: string,
  rowNumber: number
): Promise<boolean> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const sheet = wb.getWorksheet(sheetName);
  if (!sheet) return false;

  sheet.spliceRows(rowNumber, 1);
  await wb.xlsx.writeFile(EXCEL_PATH);
  return true;
}

/** Generate the next SCRUM-NNN key across all sheets */
export async function generateIssueKey(): Promise<string> {
  const tasks = await getAllTasks();
  let maxNum = 0;
  tasks.forEach((t) => {
    const m = t.issueKey.match(/SCRUM-(\d+)/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  });
  return `SCRUM-${maxNum + 1}`;
}
