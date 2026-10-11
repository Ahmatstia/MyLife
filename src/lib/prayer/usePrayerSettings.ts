"use client";

import { useSyncExternalStore, useCallback } from "react";
import { DEFAULT_CITY, getCityById, IndonesianCity } from "./cities";

export const STORAGE_CITY_KEY = "mylife_prayer_city_id";
export const STORAGE_SOUND_KEY = "mylife_prayer_sound_enabled";
export const STORAGE_CALENDAR_KEY = "mylife_calendar_show_prayer";
export const STORAGE_SUNNAH_KEY = "mylife_calendar_show_sunnah";

const PRAYER_EVENT_NAME = "mylife_prayer_settings_updated";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(PRAYER_EVENT_NAME, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PRAYER_EVENT_NAME, callback);
  };
}

export function notifyPrayerSettingsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PRAYER_EVENT_NAME));
  }
}

const emptySubscribe = () => () => {};

/**
 * Hook to check if component has finished client-side hydration.
 * Returns false on SSR and initial hydration pass, then true post-hydration.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/**
 * Hook that safely accesses prayer preferences with zero hydration mismatches.
 */
export function usePrayerSettings() {
  const isHydrated = useIsHydrated();

  // City
  const rawCityId = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(STORAGE_CITY_KEY) || DEFAULT_CITY.id;
      } catch {
        return DEFAULT_CITY.id;
      }
    },
    () => DEFAULT_CITY.id
  );

  // Show in Calendar
  const rawShowInCalendar = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const val = localStorage.getItem(STORAGE_CALENDAR_KEY);
        return val !== null ? val === "true" : true;
      } catch {
        return true;
      }
    },
    () => true
  );

  // Sound alert
  const rawSoundEnabled = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const val = localStorage.getItem(STORAGE_SOUND_KEY);
        return val !== null ? val === "true" : true;
      } catch {
        return true;
      }
    },
    () => true
  );

  // Show Sunnah (Imsak & Dhuha)
  const rawShowSunnah = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const val = localStorage.getItem(STORAGE_SUNNAH_KEY);
        return val !== null ? val === "true" : false;
      } catch {
        return false;
      }
    },
    () => false
  );

  const city: IndonesianCity = isHydrated ? getCityById(rawCityId) : DEFAULT_CITY;
  const showInCalendar = isHydrated ? rawShowInCalendar : true;
  const soundEnabled = isHydrated ? rawSoundEnabled : true;
  const showSunnah = isHydrated ? rawShowSunnah : false;

  const setCity = useCallback((newCity: IndonesianCity) => {
    try {
      localStorage.setItem(STORAGE_CITY_KEY, newCity.id);
      notifyPrayerSettingsChanged();
    } catch {}
  }, []);

  const setShowInCalendar = useCallback((show: boolean) => {
    try {
      localStorage.setItem(STORAGE_CALENDAR_KEY, String(show));
      notifyPrayerSettingsChanged();
    } catch {}
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    try {
      localStorage.setItem(STORAGE_SOUND_KEY, String(enabled));
      notifyPrayerSettingsChanged();
    } catch {}
  }, []);

  const setShowSunnah = useCallback((show: boolean) => {
    try {
      localStorage.setItem(STORAGE_SUNNAH_KEY, String(show));
      notifyPrayerSettingsChanged();
    } catch {}
  }, []);

  return {
    isHydrated,
    city,
    showInCalendar,
    soundEnabled,
    showSunnah,
    setCity,
    setShowInCalendar,
    setSoundEnabled,
    setShowSunnah,
  };
}
