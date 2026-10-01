import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth";
import { getHabitStats } from "@/services/habit.service";
import { getAreas } from "@/services/area.service";
import { HabitDetailClient } from "./HabitDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return {
    title: "Detail & Statistik Kebiasaan | MyLife",
    description: "Statistik lengkap dan roadmap tahapan progresif kebiasaan.",
  };
}

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser();
  const { id } = await params;

  let stats = null;
  try {
    stats = await getHabitStats(id, user.id);
  } catch {
    stats = null;
  }

  if (!stats) {
    notFound();
  }

  const areas = await getAreas(user.id, { isActive: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <HabitDetailClient stats={stats as any} areas={areas} />;
}
