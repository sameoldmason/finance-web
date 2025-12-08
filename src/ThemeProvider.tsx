// src/ThemeProvider.tsx
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark";

export type ThemePalette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  accent: string;
  accentStrong: string;
  neutral: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  positive: string;
  negative: string;
  upcoming: string;
};

const BASE_PALETTE: Record<ThemeMode, ThemePalette> = {
  light: {
    background: "#F4F1ED",
    surface: "#FFFFFF",
    surfaceAlt: "#F7F5F3",
    border: "#DAD3CA",
    accent: "#C9A84F",
    accentStrong: "#AD8E3D",
    neutral: "#E7E0D7",
    textPrimary: "#2B2B2B",
    textSecondary: "#7A7A7A",
    textMuted: "#AFAFAF",
    positive: "#3A7D44",
    negative: "#C94F4F",
    upcoming: "#C9A84F",
  },
  dark: {
    background: "#1F1B17",
    surface: "#26211C",
    surfaceAlt: "#2F2821",
    border: "#3C352C",
    accent: "#C9A84F",
    accentStrong: "#AD8E3D",
    neutral: "#4A4236",
    textPrimary: "#F4F1ED",
    textSecondary: "#D0C6B6",
    textMuted: "#9D9486",
    positive: "#7BC58A",
    negative: "#E08C8C",
    upcoming: "#D9C175",
  },
};

type ThemeCtx = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggle: () => void;
  currentPalette: ThemePalette;
};

const Ctx = createContext<ThemeCtx | null>(null);

const STORAGE_KEY_MODE = "theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MODE);
      if (stored === "light" || stored === "dark") return stored;

      const systemDark =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;

      return systemDark ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  const currentPalette = useMemo(() => BASE_PALETTE[theme], [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY_MODE, theme);
    } catch (error) {
      console.warn("Failed to persist theme mode", error);
    }

    root.style.setProperty("--color-app-background", currentPalette.background);
    root.style.setProperty("--color-surface", currentPalette.surface);
    root.style.setProperty("--color-surface-alt", currentPalette.surfaceAlt);
    root.style.setProperty("--color-border", currentPalette.border);
    root.style.setProperty("--color-accent", currentPalette.accent);
    root.style.setProperty("--color-accent-strong", currentPalette.accentStrong);
    root.style.setProperty("--color-neutral", currentPalette.neutral);
    root.style.setProperty("--color-text-primary", currentPalette.textPrimary);
    root.style.setProperty("--color-text-secondary", currentPalette.textSecondary);
    root.style.setProperty("--color-text-muted", currentPalette.textMuted);
    root.style.setProperty("--color-positive", currentPalette.positive);
    root.style.setProperty("--color-negative", currentPalette.negative);
    root.style.setProperty("--color-upcoming", currentPalette.upcoming);
    root.style.setProperty("--color-scheme", theme);
  }, [theme, currentPalette]);

  const value = useMemo<ThemeCtx>(
    () => ({
      theme,
      setTheme,
      toggle: () => setTheme((prev) => (prev === "dark" ? "light" : "dark")),
      currentPalette,
    }),
    [theme, currentPalette]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
