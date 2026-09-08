import { requirePageUser } from "@/lib/auth";
import { getCalendarEvents } from "@/services/calendar-event.service";
import { getProjects } from "@/services/project.service";
import { findTodayTasks } from "@/repositories/today.repository";
import { CalendarManager } from "./CalendarManager";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await requirePageUser();
  const [events, projects, tasks] = await Promise.all([
    getCalendarEvents(user.id),
    getProjects(user.id),
    findTodayTasks(user.id),
  ]);

  const formattedProjects = projects.map((p) => ({ id: p.id, title: p.title }));
  const formattedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    priority: t.priority,
    status: t.status,
  }));

  return (
    <div className="w-full">
      <CalendarManager
        initialEvents={events}
        projects={formattedProjects}
        tasks={formattedTasks}
      />
    </div>
  );
}
