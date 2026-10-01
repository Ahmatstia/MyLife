import { requirePageUser } from "@/lib/auth";
import { getHabits } from "@/services/habit.service";
import { getAreas } from "@/services/area.service";
import { HabitsManager } from "@/app/(app)/habits/HabitsManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Habit Tracker | MyLife",
  description: "Bangun kebiasaan baik dan ubah kebiasaan buruk secara bertahap dengan pendekatan psikologis.",
};

export default async function HabitsPage() {
  const user = await requirePageUser();

  const [habits, areas] = await Promise.all([
    getHabits(user.id, { isActive: true }),
    getAreas(user.id, { isActive: true }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <HabitsManager initialHabits={habits as any} areas={areas} />;
}
