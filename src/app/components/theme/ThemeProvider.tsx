"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";

export type ThemeMode = "LIGHT" | "DARK" | "SYSTEM";

interface ThemeContextValue {
  theme: ThemeMode;
  effectiveTheme: "LIGHT" | "DARK";
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "LIGHT";
  try {
    const saved = localStorage.getItem("mylife_theme") as ThemeMode | null;
    if (saved && (saved === "LIGHT" || saved === "DARK" || saved === "SYSTEM")) {
      return saved;
    }
  } catch {
    // ignore
  }
  return "LIGHT";
}

function getInitialSystemDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);
  const [systemIsDark, setSystemIsDark] = useState<boolean>(getInitialSystemDark);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  const effectiveTheme: "LIGHT" | "DARK" = useMemo(() => {
    if (theme === "SYSTEM") {
      return systemIsDark ? "DARK" : "LIGHT";
    }
    return theme;
  }, [theme, systemIsDark]);

  // Apply to DOM classList whenever effectiveTheme changes
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (effectiveTheme === "DARK") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [effectiveTheme]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("mylife_theme", newTheme);
    } catch {
      // ignore
    }

    // Optional background sync with backend preference API
    try {
      fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      }).catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(effectiveTheme === "DARK" ? "LIGHT" : "DARK");
  }, [effectiveTheme, setTheme]);

  const contextValue = useMemo(
    () => ({
      theme,
      effectiveTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, effectiveTheme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: "LIGHT",
      effectiveTheme: "LIGHT",
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}
