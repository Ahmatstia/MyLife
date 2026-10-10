import { requirePageUser } from "@/lib/auth";
import { getHabits } from "@/services/habit.service";
import { getAreas } from "@/services/area.service";
import { HabitsManager } from "@/app/(app)/habits/HabitsManager";
import { getUserPreference } from "@/services/user-preference.service";
import { HabitsV2App } from "@/app/components/habits-v2";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Habit Tracker | MyLife",
  description: "Bangun kebiasaan baik dan ubah kebiasaan buruk secara bertahap dengan pendekatan psikologis.",
};

export default async function HabitsPage() {
  const user = await requirePageUser();

  // Feature Flag: HABITS_V2 (Langkah 1.6)
  const isHabitsV2 =
    process.env.HABITS_V2 === "1" || process.env.NEXT_PUBLIC_HABITS_V2 === "1";

  if (isHabitsV2) {
    const pref = await getUserPreference(user.id);
    return <HabitsV2App userTimezone={pref?.timezone || "Asia/Jakarta"} />;
  }

  const [habits, areas] = await Promise.all([
    getHabits(user.id, { isActive: true }),
    getAreas(user.id, { isActive: true }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <HabitsManager initialHabits={habits as any} areas={areas} />;
}
