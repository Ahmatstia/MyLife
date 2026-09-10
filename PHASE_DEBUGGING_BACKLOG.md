# MYLIFE — MASTER SYSTEM DEEP DEBUGGING BACKLOG
## Prioritized Bug and Issue Tracking Backlog

**Product**: MYLIFE — Personal Life Operating System  
**Audit Date**: 2026-09-09  
**Status**: ACTIVE BACKLOG  

---

### BUG-001
- **Severity**: P1 (CRITICAL)
- **Page**: `/goals/[id]` -> `/goals/[id]/reviews`
- **Feature**: Goal Actions Menu — Weekly Review Navigation
- **Problem**: Clicking "Review Mingguan" on a Goal card or Goal detail menu leads to a 404 Not Found error.
- **Root Cause**: The link in `src/app/components/GoalActionsMenu.tsx:219` points to `/goals/${goalId}/review` (singular), but Next.js App Router defines the route as `src/app/(app)/goals/[id]/reviews/page.tsx` (plural).
- **Impact**: Users cannot access the dedicated goal retrospective/check-in page from the Goal Actions menu.
- **Evidence**:
  ```tsx
  // src/app/components/GoalActionsMenu.tsx line 219:
  href={`/goals/${goalId}/review`}
  // File system route:
  src/app/(app)/goals/[id]/reviews/page.tsx
  ```
- **Recommended Fix**: Update the `href` in `src/app/components/GoalActionsMenu.tsx` to `/goals/${goalId}/reviews`.
- **Status**: OPEN

---

### BUG-002
- **Severity**: P2 (MAJOR)
- **Page**: `/calendar`
- **Feature**: Calendar Analytics / Time Allocation Metrics
- **Problem**: When a user has 0 calendar events or 0 focus hours, the UI hallucinates fake statistics (`29 Jam Terjadwal`, `18 Jam Fokus`, `88% Efisiensi Waktu`) instead of showing 0 hours.
- **Root Cause**: In `src/app/(app)/calendar/CalendarManager.tsx:346-352`, JavaScript OR fallbacks (`||`) replace real `0` values with hardcoded dummy metrics:
  ```tsx
  const stats = useMemo(() => {
    return {
      totalHours: totalHours || 29,
      focusHours: focusHours || 18,
      workHours: workHours || 6,
      personalHours: personalHours || 5,
      efficiencyPercent: Math.round((focusHours / (totalHours || 1)) * 100) || 88,
    };
  }, [events]);
  ```
- **Impact**: Violates Rule 6 ("Real System Only") and severely misleads new users by presenting fake productivity numbers.
- **Evidence**: `src/app/(app)/calendar/CalendarManager.tsx` lines 346–352.
- **Recommended Fix**: Use nullish coalescing or explicit zero retention:
  ```tsx
  const total = totalHours;
  const focus = focusHours;
  const efficiency = total > 0 ? Math.round((focus / total) * 100) : 0;
  return {
    totalHours: total,
    focusHours: focus,
    workHours,
    personalHours,
    efficiencyPercent: efficiency,
  };
  ```
- **Status**: OPEN

---

### BUG-003
- **Severity**: P2 (MAJOR)
- **Page**: `/insights`
- **Feature**: Area Distribution / Life Wheel Breakdown
- **Problem**: When a user has no tracked time across areas, the pie/bar chart displays fake distributions ("Karier & Bisnis" 40%, "Kesehatan & Fisik" 25%, "Finansial & Aset" 20%, "Pengembangan Diri" 15%) instead of an authentic empty state.
- **Root Cause**: `src/app/(app)/insights/InsightsDashboard.tsx:571-578` injects mock category items when the fetched distribution array is empty:
  ```tsx
  const areaDistribution = analytics.areaDistribution && analytics.areaDistribution.length > 0
    ? analytics.areaDistribution
    : [
        { areaName: "Karier & Bisnis", color: "#3B82F6", percentage: 40, hours: 16 },
        { areaName: "Kesehatan & Fisik", color: "#10B981", percentage: 25, hours: 10 },
        { areaName: "Finansial & Aset", color: "#F59E0B", percentage: 20, hours: 8 },
        { areaName: "Pengembangan Diri", color: "#8B5CF6", percentage: 15, hours: 6 },
      ];
  ```
- **Impact**: Deceives user into believing data exists and conceals empty state feedback.
- **Evidence**: `src/app/(app)/insights/InsightsDashboard.tsx` lines 571–578.
- **Recommended Fix**: Remove the fake array fallback; if `analytics.areaDistribution` is empty, render a clean, motivating empty state explaining that tracking focus sessions will populate area metrics.
- **Status**: OPEN

---

### BUG-004
- **Severity**: P2 (MAJOR)
- **Page**: `/projects/[id]`
- **Feature**: Project Milestone Progress Visualization
- **Problem**: Milestone progress bars display a hardcoded 62% progress value and a hardcoded deadline string (`28 Sep 2026`).
- **Root Cause**: In `src/app/(app)/projects/[id]/ProjectDetailView.tsx:786-791`:
  ```tsx
  const progressPercent = m.status === "COMPLETED" ? 100 : m.status === "IN_PROGRESS" ? 62 : 0;
  const targetDateStr = m.targetDate ? formatIndonesianDate(m.targetDate) : "28 Sep 2026";
  ```
- **Impact**: Shows inaccurate progress (always 62% for any in-progress milestone regardless of underlying tasks) and fake dates.
- **Evidence**: `src/app/(app)/projects/[id]/ProjectDetailView.tsx` lines 786–791.
- **Recommended Fix**: Calculate real progress dynamically from the milestone's attached tasks, or default in-progress to 0% if no tasks exist; format real targetDate or display "Belum ditentukan".
- **Status**: OPEN

---

### BUG-005
- **Severity**: P2 (MAJOR)
- **Page**: `/calendar`
- **Feature**: Calendar View Switcher — "Bulanan" Mode
- **Problem**: Clicking the "Bulanan" tab renders a non-functional warning card saying "Tampilan Kalender Bulanan Sedang Disinkronkan... Gunakan Tampilan Mingguan atau Daftar Agenda" instead of showing a month view.
- **Root Cause**: `src/app/(app)/calendar/CalendarManager.tsx:787-797` stubs the MONTH view mode with a static placeholder card.
- **Impact**: Dead UI; users expect a functional month grid when clicking "Bulanan".
- **Evidence**: `src/app/(app)/calendar/CalendarManager.tsx` lines 787–797.
- **Recommended Fix**: Implement a functional 7x5 or 7x6 month grid displaying dates of the month with event indicators, or cleanly streamline the switcher to active functional views.
- **Status**: OPEN

---

### BUG-006
- **Severity**: P3 (MODERATE)
- **Page**: `/today` & `/focus`
- **Feature**: Consistency & Momentum Streak Counter
- **Problem**: Today dashboard and Focus mode display a static hardcoded `🔥 14 Hari Beruntun` streak regardless of user's actual streak.
- **Root Cause**:
  1. `src/app/(app)/today/TodayDashboardClient.tsx:1331` hardcodes: `🔥 14 Hari Beruntun`.
  2. `src/app/(app)/focus/page.tsx:78` passes hardcoded `streakDays={14}` into `FocusManager`.
- **Impact**: Misleading metric; does not reflect real consistency.
- **Evidence**:
  - `src/app/(app)/today/TodayDashboardClient.tsx` line 1331.
  - `src/app/(app)/focus/page.tsx` line 78.
- **Recommended Fix**: Wire the streak count to `momentum.service.ts` / `analytics.service.ts` or dynamically compute from recent consecutive `ActivityLog` / `FocusSession` dates.
- **Status**: OPEN

---

### BUG-007
- **Severity**: P3 (MODERATE)
- **Page**: `/goals`
- **Feature**: Goals Board — "Lanjut Eksekusi" Quick Action
- **Problem**: Clicking "Lanjut Eksekusi 🍅" on a Goal card redirects to `/focus` without pre-selecting the goal's next executable task.
- **Root Cause**: In `src/app/components/goals/GoalsBoard.tsx:626`:
  ```tsx
  <Link href="/focus" ...>Lanjut Eksekusi 🍅</Link>
  ```
  Even though `goal.nextTaskId` is resolved, it is not passed as a query parameter.
- **Impact**: User has to manually re-select the task in the Focus session screen instead of seamless 1-click continuation.
- **Evidence**: `src/app/components/goals/GoalsBoard.tsx` line 626.
- **Recommended Fix**: Update Link to `href={goal.nextTaskId ? `/focus?taskId=${goal.nextTaskId}` : "/focus"}`.
- **Status**: OPEN

---

### BUG-008
- **Severity**: P3 (MODERATE)
- **Page**: `/settings`
- **Feature**: System & Storage Telemetry Badge
- **Problem**: Settings header displays "SQLite Local First" badge, but the active production database is PostgreSQL (Supabase pooler).
- **Root Cause**: Hardcoded static badge text in `src/app/(app)/settings/page.tsx:58`:
  ```tsx
  <span className="font-mono text-xs font-semibold text-white">SQLite Local First</span>
  ```
- **Impact**: Technical inaccuracy / misleading system telemetry.
- **Evidence**: `src/app/(app)/settings/page.tsx` line 58.
- **Recommended Fix**: Update label to "Cloud & Local Sync (PostgreSQL)" or "Kedaulatan Data Aktif".
- **Status**: OPEN

---

### BUG-009
- **Severity**: P4 (MINOR)
- **Page**: Internal Tests
- **Feature**: Legacy Database Helper
- **Problem**: `tests/test-db.ts` defines an unused `ppos-vitest.db` SQLite temporary file leftover from the SQLite era.
- **Root Cause**: Dead legacy file not referenced by any active Vitest suites (all suites now test against PostgreSQL).
- **Impact**: Clutters test codebase with obsolete references.
- **Evidence**: `tests/test-db.ts`.
- **Recommended Fix**: Clean up or document as legacy.
- **Status**: OPEN

---
*End of PHASE_DEBUGGING_BACKLOG.md*
