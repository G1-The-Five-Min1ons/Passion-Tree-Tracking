import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local" });

import ExcelJS from "exceljs";
import path from "path";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

const EXCEL_PATH = path.join(process.cwd(), "Tracking.xlsx");
const SKIP_SHEETS = new Set(["Dashboard", "_Data", "_Lists"]);

function cellText(row: ExcelJS.Row, col: number): string {
    const v = row.getCell(col).value;
    if (v === null || v === undefined) return "";
    if (v instanceof Date) {
        return v.toISOString().split("T")[0]; // yyyy-mm-dd
    }
    return String(v).trim();
}

async function migrate() {
    console.log("Starting migration to Postgres...");
    console.log("Using DB URL:", process.env.POSTGRES_URL ? "URL SET" : "URL MISSING");

    try {
        // 1. Create table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        issue_key VARCHAR(50) UNIQUE NOT NULL,
        sheet VARCHAR(100) NOT NULL,
        summary TEXT,
        issue_type VARCHAR(50),
        status VARCHAR(50),
        priority VARCHAR(50),
        assignee VARCHAR(100),
        created DATE,
        due_date DATE,
        story_points VARCHAR(20),
        sprint VARCHAR(50),
        parent_key VARCHAR(50),
        parent_summary TEXT,
        row_number INTEGER
      );
    `);
        console.log("✅ Table 'tasks' verified/created.");

        // Clear existing for a clean dump
        await pool.query("TRUNCATE TABLE tasks;");

        // 2. Read Excel
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.readFile(EXCEL_PATH);
        console.log("✅ Read Tracking.xlsx");

        let count = 0;

        // 3. Migrate sheets
        for (const sheet of wb.worksheets) {
            if (SKIP_SHEETS.has(sheet.name)) continue;

            console.log(`Migrating sheet: ${sheet.name}...`);

            const rows = sheet.getRows(2, sheet.rowCount) || []; // Skip header
            for (const row of rows) {
                const issueKey = cellText(row, 1);
                if (!issueKey || issueKey === "Issue key") continue;

                const summary = cellText(row, 2);
                const issueType = cellText(row, 3) || "Task";
                const status = cellText(row, 4) || "Backlog";
                const priority = cellText(row, 5) || "Medium";
                const assignee = cellText(row, 6);
                let created = cellText(row, 7);
                let dueDate = cellText(row, 8);
                const storyPoints = cellText(row, 9);
                const sprint = cellText(row, 10);
                const parentKey = cellText(row, 11);
                const parentSummary = cellText(row, 12);
                const rowNumber = row.number;

                if (!created) created = new Date().toISOString().split("T")[0];

                await pool.query(
                    `INSERT INTO tasks 
            (issue_key, sheet, summary, issue_type, status, priority, assignee, created, due_date, story_points, sprint, parent_key, parent_summary, row_number)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (issue_key) DO NOTHING`,
                    [
                        issueKey, sheet.name, summary, issueType, status, priority, assignee,
                        created || null, dueDate || null, storyPoints, sprint, parentKey, parentSummary, rowNumber
                    ]
                );
                count++;
            }
        }

        console.log(`✅ Successfully migrated ${count} tasks to Postgres!`);
    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        pool.end();
    }
}

migrate();
