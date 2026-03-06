export type IssueType = "Epic" | "Task" | "Subtask" | "Test";

export type Status =
  | "Backlog"
  | "To Do"
  | "In Progress"
  | "In Review"
  | "Done"
  | "Cancelled";

export type Priority = "Highest" | "High" | "Medium" | "Low" | "Lowest";

export interface Task {
  /** Row number in the sheet (used for updates) */
  rowNumber: number;
  /** Sheet name this task belongs to (= Epic name) */
  sheet: string;
  /** Columns from Excel */
  issueKey: string;
  summary: string;
  issueType: IssueType;
  status: Status;
  priority: Priority;
  assignee: string;
  created: string;
  dueDate: string;
  storyPoints: string;
  sprint: string;
  parentKey: string;
  parentSummary: string;
}

export interface TaskFormData {
  summary: string;
  issueType: IssueType;
  status: Status;
  priority: Priority;
  assignee: string;
  sprint: string;
  parentKey: string;
  parentSummary: string;
  dueDate: string;
  storyPoints: string;
  sheet: string;
  insertAfterRow?: number;
}

/** Info about each Epic sheet */
export interface EpicSheet {
  name: string;
  total: number;
  done: number;
  inProgress: number;
}
