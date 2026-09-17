import { requirePageUser } from "@/lib/auth";
import {
  getCompassSummary,
  getAllChapters,
  getReflections,
} from "@/services/direction.service";
import { getAreas } from "@/services/area.service";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { DirectionManager } from "./DirectionManager";

export const dynamic = "force-dynamic";

export default async function DirectionPage() {
  const user = await requirePageUser();

  const [summary, allChapters, allReflections, areas] = await Promise.all([
    getCompassSummary(user.id),
    getAllChapters(user.id),
    getReflections(user.id),
    getAreas(user.id),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Kompas Kehidupan"
        title="Arah & Identitas"
        description="Pahami siapa diri Anda, orang seperti apa yang ingin Anda bangun, dan apa yang paling bermakna untuk difokuskan saat ini."
      />

      <DirectionManager
        identity={summary.identity}
        vision={summary.vision}
        activeChapter={summary.activeChapter}
        allChapters={allChapters}
        allReflections={allReflections}
        availableAreas={areas}
      />
    </div>
  );
}
