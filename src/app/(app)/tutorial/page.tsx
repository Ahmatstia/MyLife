import type { Metadata } from "next";
import { InteractiveTutorialExperience } from "./InteractiveTutorialExperience";

export const metadata: Metadata = {
  title: "Panduan Penggunaan MyLife | Sahabat Mengatur Hidup & Fokus Anda",
  description:
    "Panduan mudah dan praktis cara menata arah hidup, mencapai target impian, dan menjaga fokus harian bersama MyLife.",
};

export const dynamic = "force-dynamic";

export default function TutorialPage() {
  return <InteractiveTutorialExperience />;
}
