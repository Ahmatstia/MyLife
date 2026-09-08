import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "@/app/components/LoginForm";
import { Icon } from "@/app/components/ui/Icon";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
        {/* Mesh ambient background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 30% -10%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 75% 110%, rgba(139,92,246,0.07) 0%, transparent 60%)",
            backgroundColor: "hsl(38,28%,97%)",
          }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 dot-grid opacity-40" />

        <section className="relative z-10 w-full max-w-sm">
          {/* Card glass */}
          <div className="rounded-2xl border border-white/80 bg-white/90 p-7 shadow-pop backdrop-blur-sm">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-ai-600 text-white shadow-sm">
                <Icon name="sparkles" size={18} />
              </span>
              <div>
                <p className="text-[15px] font-bold tracking-tight text-surface-900">
                  My<span className="gradient-text">Life</span>
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-400">
                  Personal Life Operating System
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h1 className="text-2xl font-bold tracking-tight text-surface-900">
                Selamat datang
              </h1>
              <p className="mt-1 text-[13px] text-surface-500">
                Masuk agar goals, progres, dan refleksi Anda tetap pribadi.
              </p>
            </div>

            <LoginForm />
          </div>

          <p className="mt-4 text-center text-[11px] text-surface-400">
            Personal system · Hanya untuk Anda
          </p>
        </section>
      </div>
    );
  }

  // Best practice: When logged in, seamlessly direct to the Unified Daily Command Center (/today)
  redirect("/today");
}
