import pool from "./db";
import { Task, EpicSheet } from "@/types/task";

/**
 * Return specific counts of Epics/Sheets from DB matching Excel tabs
 */
export async function getSheetNames(): Promise<string[]> {
    const result = await pool.query(`SELECT DISTINCT sheet FROM tasks ORDER BY sheet`);
    return result.rows.map((row) => row.sheet);
}

export async function getEpicSheets(): Promise<EpicSheet[]> {
    const result = await pool.query(`
    SELECT sheet AS name, 
           COUNT(*) AS total,
           SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) AS done,
           SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS inProgress
    FROM tasks
    GROUP BY sheet
  `);

    return result.rows.map(row => ({
        name: row.name,
        total: parseInt(row.total, 10),
        done: parseInt(row.done, 10) || 0,
        inProgress: parseInt(row.inprogress, 10) || 0
    }));
}

export async function getAllTasks(sheetName?: string): Promise<Task[]> {
    let query = `SELECT * FROM tasks`;
    const values: any[] = [];

    if (sheetName) {
        query += ` WHERE sheet = $1`;
        values.push(sheetName);
    }

    query += ` ORDER BY sprint, row_number`; // Use row_number roughly as ordering

    const result = await pool.query(query, values);

    return result.rows.map(rowToTask);
}

export async function updateTask(
    sheetName: string,
    rowNumber: number,
    data: Partial<Task>
): Promise<Task | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(data)) {
        if (key === 'sheet' || key === 'rowNumber' || key === 'issueKey') continue;

        // Map camelCase to snake_case
        const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

        updates.push(`${dbKey} = $${paramIdx}`);
        values.push(value);
        paramIdx++;
    }

    if (updates.length === 0) return null;

    values.push(sheetName);
    const sheetIdx = paramIdx++;
    values.push(rowNumber);
    const rowIdx = paramIdx++;

    const query = `
    UPDATE tasks 
    SET ${updates.join(', ')} 
    WHERE sheet = $${sheetIdx} AND row_number = $${rowIdx} 
    RETURNING *
  `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) return null;
    return rowToTask(result.rows[0]);
}

export async function createTask(
    sheetName: string,
    data: any
): Promise<Task> {
    const result = await pool.query(
        `INSERT INTO tasks 
      (issue_key, sheet, summary, issue_type, status, priority, assignee, due_date, story_points, sprint, parent_key, parent_summary, row_number)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, (SELECT COALESCE(MAX(row_number), 1) + 1 FROM tasks WHERE sheet = $2))
     RETURNING *`,
        [
            data.issueKey, sheetName, data.summary, data.issueType, data.status,
            data.priority, data.assignee, data.dueDate || null, data.storyPoints,
            data.sprint, data.parentKey, data.parentSummary
        ]
    );

    return rowToTask(result.rows[0]);
}

export async function deleteTask(
    sheetName: string,
    rowNumber: number
): Promise<boolean> {
    const result = await pool.query(
        `DELETE FROM tasks WHERE sheet = $1 AND row_number = $2`,
        [sheetName, rowNumber]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function generateIssueKey(): Promise<string> {
    const result = await pool.query(`SELECT issue_key FROM tasks ORDER BY id DESC LIMIT 1000`);
    let maxNum = 0;

    result.rows.forEach((t) => {
        const m = t.issue_key.match(/SCRUM-(\d+)/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });

    return `SCRUM-${maxNum + 1}`;
}

// Mapper from DB row to TypeScript object
function rowToTask(row: any): Task {
    return {
        rowNumber: row.row_number,
        sheet: row.sheet,
        issueKey: row.issue_key,
        summary: row.summary || "",
        issueType: row.issue_type || "Task",
        status: row.status || "Backlog",
        priority: row.priority || "Medium",
        assignee: row.assignee || "",
        created: row.created ? new Date(row.created).toISOString().split("T")[0] : "",
        dueDate: row.due_date ? new Date(row.due_date).toISOString().split("T")[0] : "",
        storyPoints: row.story_points || "",
        sprint: row.sprint || "",
        parentKey: row.parent_key || "",
        parentSummary: row.parent_summary || "",
    };
}
