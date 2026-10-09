"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const KEY = "airstay-theme";
const CHANGED = "airstay-theme-changed";

/** Private browsing can refuse storage; the theme is then light, and a choice lasts for the page. */
function stored(): Theme {
  try {
    return window.localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange); // another tab changed it
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Dark mode (bonus B5): off by default, behind a switch in the account menu. The choice is
 * kept in the browser and put on <html data-theme>, where globals.css reads it. The server
 * always draws the light theme; a visitor who chose dark gets it once the page attaches.
 */
export function useTheme() {
  const theme = useSyncExternalStore<Theme>(subscribe, stored, () => "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      document.documentElement.dataset.theme = next;
    }
    window.dispatchEvent(new Event(CHANGED));
  }, []);

  return { theme, setTheme };
}
