// Seed script — run with: npx tsx scripts/seed.ts
import ExcelJS from "exceljs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const EXCEL_PATH = path.join(process.cwd(), "Tracking.xlsx");

const COLUMNS = [
  "id",
  "issueKey",
  "summary",
  "issueType",
  "status",
  "priority",
  "assignee",
  "parentKey",
  "sprint",
  "createdAt",
  "updatedAt",
];

interface SeedTask {
  issueKey: string;
  summary: string;
  issueType: string;
  status: string;
  priority: string;
  assignee: string;
  parentKey: string;
  sprint: string;
}

const TASKS: SeedTask[] = [
  // Epics
  {
    issueKey: "EP-001",
    summary: "User Authentication System",
    issueType: "Epic",
    status: "In Progress",
    priority: "Highest",
    assignee: "Arisa",
    parentKey: "",
    sprint: "Sprint 1",
  },
  {
    issueKey: "EP-002",
    summary: "Learning Path Module",
    issueType: "Epic",
    status: "To Do",
    priority: "High",
    assignee: "Bon",
    parentKey: "",
    sprint: "Sprint 2",
  },
  {
    issueKey: "EP-003",
    summary: "AI Recommendation Engine",
    issueType: "Epic",
    status: "Backlog",
    priority: "High",
    assignee: "Charlie",
    parentKey: "",
    sprint: "Sprint 3",
  },

  // Tasks under EP-001
  {
    issueKey: "TSK-001",
    summary: "Implement Google OAuth integration",
    issueType: "Task",
    status: "Done",
    priority: "Highest",
    assignee: "Arisa",
    parentKey: "EP-001",
    sprint: "Sprint 1",
  },
  {
    issueKey: "TSK-002",
    summary: "Build login page UI",
    issueType: "Task",
    status: "In Review",
    priority: "High",
    assignee: "Dan",
    parentKey: "EP-001",
    sprint: "Sprint 1",
  },
  {
    issueKey: "TSK-003",
    summary: "Set up JWT token management",
    issueType: "Task",
    status: "In Progress",
    priority: "High",
    assignee: "Arisa",
    parentKey: "EP-001",
    sprint: "Sprint 1",
  },

  // Tasks under EP-002
  {
    issueKey: "TSK-004",
    summary: "Design learning path data model",
    issueType: "Task",
    status: "To Do",
    priority: "Medium",
    assignee: "Bon",
    parentKey: "EP-002",
    sprint: "Sprint 2",
  },
  {
    issueKey: "TSK-005",
    summary: "Build path visualization component",
    issueType: "Task",
    status: "Backlog",
    priority: "Medium",
    assignee: "Eve",
    parentKey: "EP-002",
    sprint: "Sprint 2",
  },

  // Subtasks under TSK-001
  {
    issueKey: "SUB-001",
    summary: "Configure Google Cloud Console",
    issueType: "Subtask",
    status: "Done",
    priority: "High",
    assignee: "Arisa",
    parentKey: "TSK-001",
    sprint: "Sprint 1",
  },
  {
    issueKey: "SUB-002",
    summary: "Handle OAuth callback route",
    issueType: "Subtask",
    status: "Done",
    priority: "Medium",
    assignee: "Arisa",
    parentKey: "TSK-001",
    sprint: "Sprint 1",
  },

  // Subtasks under TSK-002
  {
    issueKey: "SUB-003",
    summary: "Design login form wireframe",
    issueType: "Subtask",
    status: "Done",
    priority: "Low",
    assignee: "Dan",
    parentKey: "TSK-002",
    sprint: "Sprint 1",
  },
  {
    issueKey: "SUB-004",
    summary: "Implement responsive login layout",
    issueType: "Subtask",
    status: "In Review",
    priority: "Medium",
    assignee: "Dan",
    parentKey: "TSK-002",
    sprint: "Sprint 1",
  },

  // Standalone tasks
  {
    issueKey: "TSK-006",
    summary: "Set up CI/CD pipeline",
    issueType: "Task",
    status: "In Progress",
    priority: "High",
    assignee: "Charlie",
    parentKey: "",
    sprint: "Sprint 1",
  },
  {
    issueKey: "TSK-007",
    summary: "Write API documentation",
    issueType: "Task",
    status: "To Do",
    priority: "Low",
    assignee: "Eve",
    parentKey: "",
    sprint: "Sprint 2",
  },
  {
    issueKey: "TSK-008",
    summary: "Configure Docker containers",
    issueType: "Task",
    status: "Done",
    priority: "Medium",
    assignee: "Charlie",
    parentKey: "",
    sprint: "Sprint 1",
  },
];

async function seed() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Tasks");

  sheet.addRow(COLUMNS);

  const now = new Date().toISOString();
  for (const t of TASKS) {
    sheet.addRow([
      uuidv4(),
      t.issueKey,
      t.summary,
      t.issueType,
      t.status,
      t.priority,
      t.assignee,
      t.parentKey,
      t.sprint,
      now,
      now,
    ]);
  }

  await workbook.xlsx.writeFile(EXCEL_PATH);
  console.log(`✓ Seeded ${TASKS.length} tasks into ${EXCEL_PATH}`);
}

seed().catch(console.error);
