export function formatDuration(minutes: number): string {
  const total = Math.round(minutes);
  if (total < 60) return `${total} mnt`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (rest === 0) return `${hours}j`;
  return `${hours}j ${rest}mnt`;
}

export function formatHours(hours: number): string {
  return formatDuration(hours * 60);
}

export function formatRelativeTime(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "Baru saja";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Baru saja";
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay === 1) {
    const timeStr = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(date);
    return `Kemarin, ${timeStr}`;
  }
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}