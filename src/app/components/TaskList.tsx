"use client";

import { useState } from "react";
import TaskItem from "@/app/components/TaskItem";

type Task = {
  id: string;
  title: string;
  name?: string;
  description: string | null;
  priority: string;
  status: string;
  estimatedHours: number;
  actualHours: number;
  notes: string | null;
  [key: string]: unknown;
};

export default function TaskList({ tasks }: { tasks: Task[] }) {
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const filtered = tasks.filter((task) => (status === "ALL" || task.status === status) && (priority === "ALL" || task.priority === priority));

  const statusTabs: [string, string][] = [
    ["ALL", "Semua"],
    ["NOT_STARTED", "Akan dilakukan"],
    ["IN_PROGRESS", "Sedang"],
    ["COMPLETED", "Selesai"],
  ];
  const priorityTabs: [string, string][] = [
    ["ALL", "Semua"],
    ["HIGH", "Tinggi"],
    ["MEDIUM", "Sedang"],
    ["LOW", "Rendah"],
  ];

  return (
    <div className="mt-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-white/[0.08] bg-[#0B0D13] p-1 shadow-sm">
          {statusTabs.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              aria-pressed={status === value}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                status === value ? "bg-purple-600 text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="mx-1 hidden h-4 w-px bg-white/[0.1] sm:block" />
        <div className="flex rounded-xl border border-white/[0.08] bg-[#0B0D13] p-1 shadow-sm">
          {priorityTabs.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPriority(value)}
              aria-pressed={priority === value}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                priority === value ? "bg-purple-600 text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/[0.1] bg-[#0B0D13]/40 p-5 text-center text-xs font-mono text-gray-500">
          Tidak ada task yang cocok dengan filter ini.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{filtered.map((task) => <TaskItem key={task.id} {...task} />)}</div>
      )}
    </div>
  );
}
