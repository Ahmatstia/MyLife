import { requirePageUser } from "@/lib/auth";
import { getCaptures } from "@/services/capture.service";
import { getAreas } from "@/services/area.service";
import { getProjects } from "@/services/project.service";
import { getGoals } from "@/services/goal.service";
import { CaptureInboxManager } from "./CaptureInboxManager";

export const dynamic = "force-dynamic";

export default async function CapturePage() {
  const user = await requirePageUser();

  const [initialCaptures, areas, projects, goals] = await Promise.all([
    getCaptures(undefined, user.id),
    getAreas(user.id, { isActive: true }),
    getProjects(user.id),
    getGoals(user.id),
  ]);

  return (
    <div className="w-full">
      <CaptureInboxManager
        initialCaptures={initialCaptures}
        areas={areas}
        projects={projects}
        goals={goals}
      />
    </div>
  );
}
