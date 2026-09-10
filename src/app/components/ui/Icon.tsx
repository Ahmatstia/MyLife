import type { SVGProps } from "react";

export type IconName =
  | "sparkles"
  | "sun"
  | "flag"
  | "chart"
  | "compass"
  | "search"
  | "plus"
  | "bolt"
  | "check"
  | "arrowRight"
  | "arrowLeft"
  | "chevronDown"
  | "chevronUp"
  | "chevronRight"
  | "chevronLeft"
  | "play"
  | "stop"
  | "pause"
  | "clock"
  | "timer"
  | "calendar"
  | "edit"
  | "trash"
  | "x"
  | "menu"
  | "settings"
  | "logout"
  | "capture"
  | "inbox"
  | "alert"
  | "info"
  | "target"
  | "layers"
  | "more"
  | "user"
  | "trendingUp"
  | "gauge"
  | "circle"
  | "tree"
  | "coffee"
  | "lightbulb"
  | "tag"
  | "star"
  | "award"
  | "bookOpen"
  | "pen"
  | "brain"
  | "pomodoro"
  | "flame"
  | "bell"
  | "mic"
  | "micOff"
  | "send";

const paths: Record<IconName, React.ReactNode> = {
  sparkles: (
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-1.5 3L16 10H5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-8M21 20H3" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  bolt: <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />,
  check: <path d="M20 6L9 17l-5-5" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronUp: <path d="M18 15l-6-6-6 6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronLeft: <path d="M15 18l-6-6 6-6" />,
  play: <path d="M7 5l12 7-12 7V5z" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="1.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L20 8a2.2 2.2 0 00-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.55-1H3a2 2 0 110-4h.09a1.7 1.7 0 001.55-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34h0a1.7 1.7 0 001-1.55V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.55h0a1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87v0a1.7 1.7 0 001.55 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.55 1z" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H6a2 2 0 01-2-2V5a2 2 0 012-2h3M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  capture: (
    <>
      <path d="M12 8v8M8 12h8" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  inbox: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5h13l3.5 7v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6l3.5-7z" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  layers: (
    <>
      <path d="M12 2l10 5-10 5L2 7l10-5z" />
      <path d="M2 12l10 5 10-5M2 17l10 5 10-5" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </>
  ),
  trendingUp: (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M17 7h4v4" />
    </>
  ),
  gauge: (
    <>
      <path d="M12 15l3.5-5" />
      <path d="M12 21a9 9 0 115.7-16M15 6.5a9 9 0 011.5 10.4" />
      <circle cx="12" cy="15" r="1.2" />
    </>
  ),
  circle: <circle cx="12" cy="12" r="9" />,
  tree: (
    <>
      <path d="M12 21V8" />
      <path d="M12 8c-2.5-1.5-4-1.5-6.5-.5M12 8c2.5-1.5 4-1.5 6.5-.5M12 12c-2.5-1.5-4-1.5-6.5-.5M12 12c2.5-1.5 4-1.5 6.5-.5M12 16c-2.5-1.5-4-1.5-6.5-.5M12 16c2.5-1.5 4-1.5 6.5-.5" />
    </>
  ),
  pause: <path d="M6 4h4v16H6zM14 4h4v16h-4z" />,
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M12 5V3M10 3h4" />
    </>
  ),
  coffee: (
    <>
      <path d="M18 8h1a4 4 0 010 8h-1" />
      <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
      <path d="M6 1v3M10 1v3M14 1v3" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M9 18h6M10 22h4M12 2a7 7 0 00-3.5 13H15.5A7 7 0 0012 2z" />
      <path d="M9 18v-1a3 3 0 016 0v1" />
    </>
  ),
  tag: (
    <>
      <path d="M20.6 11.6L12.4 3.4A2 2 0 0011 3H4a1 1 0 00-1 1v7a2 2 0 00.6 1.4l8.2 8.2a2 2 0 002.8 0l6-6a2 2 0 000-2.8z" />
      <circle cx="7" cy="8" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
  award: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M8.2 14.4L7 22l5-3 5 3-1.2-7.6" />
    </>
  ),
  bookOpen: (
    <>
      <path d="M2 4h6a2 2 0 012 2v14a2 2 0 00-2-2H2V4z" />
      <path d="M22 4h-6a2 2 0 00-2 2v14a2 2 0 012-2h6V4z" />
    </>
  ),
  pen: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </>
  ),
  brain: (
    <>
      <path d="M12 5a3 3 0 10-5.9.7A3 3 0 004 9a3 3 0 00.5 1.7A3 3 0 006 16v2a1 1 0 001 1h2" />
      <path d="M12 5a3 3 0 115.9.7A3 3 0 0120 9a3 3 0 01-.5 1.7A3 3 0 0118 16v2a1 1 0 01-1 1h-2" />
      <path d="M12 5v16" />
    </>
  ),
  pomodoro: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M10 3c0-1 4-1 4 0" />
      <path d="M9 2.5l1.5 1M15 2.5l-1.5 1" />
    </>
  ),
  flame: (
    <>
      <path d="M8.5 14.5A4.5 4.5 0 0012 19a4.5 4.5 0 002-8.5c0 1.5-1 3-2 3.5 0-2-1-4-3.5-4.5C9 11 8.5 13 8.5 14.5z" />
      <path d="M12 19c-3.3 0-6-2.7-6-6 0-4 3-7 6-10 3 3 6 6 6 10 0 3.3-2.7 6-6 6z" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 22v-4M8 22h8" />
    </>
  ),
  micOff: (
    <>
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M18.89 13.23A7 7 0 0019 11M5 11a7 7 0 0013 3.13M15 9.34V5a3 3 0 00-5.94-.6M9 9v3a3 3 0 005.12 2.12M12 19v3M8 23h8" />
    </>
  ),
  send: <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />,
};

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  ...props
}: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
