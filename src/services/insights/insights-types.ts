import type { Task, Session, CalendarEvent, Priority as PrismaPriority, TaskStatus } from "@/generated/prisma/client";

export type InsightPeriod = "today" | "this_week" | "this_month" | "custom";

export interface InsightDateRange {
  start: Date;
  end: Date;
  period: InsightPeriod;
}

// -----------------------------------------------------------------------------
// ANALYTICS MODULE
// -----------------------------------------------------------------------------
export interface AnalyticsSummary {
  period: {
    type: InsightPeriod;
    start: Date;
    end: Date;
  };
  goals: {
    total: number;
    active: number;
    completed: number;
    completionRate: number;
  };
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    completionRate: number;
  };
  sessions: {
    totalCount: number;
    totalMinutes: number;
    totalHours: number;
    averageSessionMinutes: number;
    averageUnderstanding: number | null;
  };
  activities: {
    totalCount: number;
    totalMinutes: number;
    totalHours: number;
    byCategory: Record<string, { count: number; minutes: number }>;
  };
  trends: {
    date: string;
    focusMinutes: number;
    focusHours: number;
    tasksCompleted: number;
    sessionsCount: number;
  }[];
  goalProgress: {
    goalId: string;
    title: string;
    status: string;
    totalTasks: number;
    completedTasks: number;
    completionPercentage: number;
    areaName: string | null;
  }[];
  areaDistribution: {
    areaId: string;
    name: string;
    color: string;
    goalCount: number;
    taskCount: number;
    completedTaskCount: number;
    focusMinutes?: number;
    focusHours?: number;
    percentage?: number;
  }[];
}

// -----------------------------------------------------------------------------
// SMART PRIORITY MODULE
// -----------------------------------------------------------------------------
export interface PrioritizedTask {
  task: Task & {
    goal?: { id: string; title: string } | null;
    project?: { id: string; title: string } | null;
    area?: { id: string; name: string; color: string } | null;
  };
  score: number;
  reasons: string[];
  urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  isOverdue: boolean;
  overdueDays: number;
  isDueToday: boolean;
  isFocusedToday: boolean;
}

export interface TaskPriorityContext {
  todayDateStr: string;
  now: Date;
  dailyFocusTaskIds: Set<string>;
}

// -----------------------------------------------------------------------------
// CONFLICT DETECTION MODULE
// -----------------------------------------------------------------------------
export type ConflictType = "EVENT_OVERLAP" | "SESSION_EVENT_COLLISION" | "DOUBLE_BOOKING";
export type ConflictSeverity = "LOW" | "MEDIUM" | "HIGH";

export interface ConflictEntity {
  type: "CALENDAR_EVENT" | "SESSION" | "TASK";
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
}

export interface TimeConflict {
  id: string;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  entities: ConflictEntity[];
  startTime: Date;
  endTime: Date;
  explanation: string;
}

// -----------------------------------------------------------------------------
// DAILY PLAN MODULE
// -----------------------------------------------------------------------------
export interface DailyPlanItem {
  type: "FOCUS" | "RECOMMENDED" | "OVERDUE" | "SCHEDULED";
  taskId?: string;
  eventId?: string;
  title: string;
  priority?: PrismaPriority;
  status?: TaskStatus;
  scheduledTime?: { start: Date; end: Date };
  estimatedMinutes?: number;
  reasons?: string[];
  contextBadge?: string;
}

export interface DailyPlanRecommendation {
  date: Date;
  activeSession: (Session & { task?: { id: string; title: string } }) | null;
  focusTasks: PrioritizedTask[];
  recommendedTasks: PrioritizedTask[];
  scheduledEvents: CalendarEvent[];
  overdueTasks: PrioritizedTask[];
  conflicts: TimeConflict[];
  metrics: {
    totalFocusTasks: number;
    totalScheduledEvents: number;
    estimatedFocusMinutes: number;
    conflictsCount: number;
  };
}

// -----------------------------------------------------------------------------
// UNIFIED INBOX MODULE
// -----------------------------------------------------------------------------
export type InboxSource = "CAPTURE" | "TASK" | "REVIEW" | "CONFLICT" | "NOTIFICATION";

export interface UnifiedInboxItem {
  id: string;
  source: InboxSource;
  type: string;
  title: string;
  description: string | null;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  timestamp: Date;
  actionUrl: string;
  actionLabel: string;
  metadata?: Record<string, unknown>;
}

export interface UnifiedInboxSummary {
  items: UnifiedInboxItem[];
  counts: {
    total: number;
    captures: number;
    overdueTasks: number;
    pendingReviews: number;
    conflicts: number;
    notifications: number;
  };
}

// -----------------------------------------------------------------------------
// LIFE HEALTH MODULE
// -----------------------------------------------------------------------------
export type LifeHealthStatus = "CRITICAL" | "ATTENTION" | "GOOD" | "EXCELLENT";

export interface LifeHealthComponent {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  status: "GOOD" | "FAIR" | "POOR";
  details: string;
}

export interface LifeHealthResult {
  overallScore: number;
  status: LifeHealthStatus;
  components: {
    taskCompletion: LifeHealthComponent;
    overdueBurden: LifeHealthComponent;
    executionConsistency: LifeHealthComponent;
    sessionActivity: LifeHealthComponent;
    goalProgress: LifeHealthComponent;
    areaBalance: LifeHealthComponent;
  };
  strengths: string[];
  warnings: string[];
  evaluatedAt: Date;
}
