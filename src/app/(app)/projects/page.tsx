import { requirePageUser } from "@/lib/auth";
import { getProjects } from "@/services/project.service";
import { getAreas } from "@/services/area.service";
import { getGoals } from "@/services/goal.service";
import { ProjectsManager } from "./ProjectsManager";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requirePageUser();
  const [projects, areas, goals] = await Promise.all([
    getProjects(user.id),
    getAreas(user.id),
    getGoals(user.id),
  ]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-purple-400">
          <span>INISIASI &amp; EKSEKUSI // PORTOFOLIO KERJA</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Daftar Proyek
        </h1>
        <p className="text-sm text-gray-400 max-w-2xl">
          Kelola inisiatif kerja terstruktur melalui Tonggak Capaian (Milestones) dan rincian tugas terintegrasi.
        </p>
      </div>
      <ProjectsManager
        initialProjects={projects}
        goals={goals}
        areas={areas}
      />
    </div>
  );
}
