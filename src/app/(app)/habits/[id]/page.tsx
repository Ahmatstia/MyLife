import { requirePageUser } from "@/lib/auth";
import { getUserPreference } from "@/services/user-preference.service";
import { HabitsV2App } from "@/app/components/habits-v2";

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
  const pref = await getUserPreference(user.id);

  return (
    <HabitsV2App
      userTimezone={pref?.timezone || "Asia/Jakarta"}
      initialHabitId={id}
    />
  );
}

