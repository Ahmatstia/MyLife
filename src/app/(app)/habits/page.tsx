import { requirePageUser } from "@/lib/auth";
import { getUserPreference } from "@/services/user-preference.service";
import { HabitsV2App } from "@/app/components/habits-v2";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Habit Tracker | MyLife",
  description: "Bangun kebiasaan baik dan ubah kebiasaan buruk secara bertahap dengan pendekatan psikologis.",
};

export default async function HabitsPage() {
  const user = await requirePageUser();
  const pref = await getUserPreference(user.id);

  return <HabitsV2App userTimezone={pref?.timezone || "Asia/Jakarta"} />;
}

