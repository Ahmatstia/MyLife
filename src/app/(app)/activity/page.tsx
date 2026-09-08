import { requirePageUser } from "@/lib/auth";
import { getActivities } from "@/services/activity.service";
import { getAreas } from "@/services/area.service";
import { getProjects } from "@/services/project.service";
import { ActivityManager } from "./ActivityManager";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const user = await requirePageUser();
  const [activities, areas, projects] = await Promise.all([
    getActivities(user.id, { limit: 100 }),
    getAreas(user.id, { isActive: true }),
    getProjects(user.id),
  ]);

  return (
    <div className="space-y-6 pb-16">
      <ActivityManager
        initialActivities={activities}
        areas={areas}
        projects={projects}
      />
    </div>
  );
}
