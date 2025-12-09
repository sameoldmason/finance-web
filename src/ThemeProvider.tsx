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
};

type ThemeDefinition = {
  name: string;
  description: string;
  light: ThemePalette;
  dark: ThemePalette;
};

const THEME_REGISTRY = {
  bare: {
    name: "bare",
    description: "Retro light palette built on warm creams and oranges.",
    light: {
      background: "#F9F3D6",
      surface: "#F7F2D9",
      surfaceAlt: "#F4ECC9",
      border: "#C9C3A6",
      accent: "#E37B3F",
      accentStrong: "#2F3A30",
      neutral: "#E4DFC8",
      textPrimary: "#1C1C1C",
      textSecondary: "#676451",
    },
    dark: {
      background: "#17120F",
      surface: "#2A2320",
      surfaceAlt: "#211916",
      border: "#514238",
      accent: "#F18A4A",
      accentStrong: "#2F3A30",
      neutral: "#3A2F28",
      textPrimary: "#F9F3D6",
      textSecondary: "#D0C8A8",
    },
  },
  warm: {
    name: "Warm Set",
    description: "Soft, cozy, grounded tones inspired by gentle afternoons.",
    light: {
      background: "#F9F3D6",
      surface: "#F7F2D9",
      surfaceAlt: "#F4ECC9",
      border: "#C9C3A6",
      accent: "#E37B3F",
      accentStrong: "#2F3A30",
      neutral: "#E4DFC8",
      textPrimary: "#1C1C1C",
      textSecondary: "#676451",
    },
    dark: {
      background: "#17120F",
      surface: "#2A2320",
      surfaceAlt: "#211916",
      border: "#514238",
      accent: "#F18A4A",
      accentStrong: "#2F3A30",
      neutral: "#3A2F28",
      textPrimary: "#F9F3D6",
      textSecondary: "#D0C8A8",
    },
  },
} as const;

type ThemeRegistry = typeof THEME_REGISTRY;
export type ThemeKey = keyof ThemeRegistry;

const AVAILABLE_THEMES = (Object.keys(THEME_REGISTRY) as ThemeKey[]).map(
  (key) => ({
    key,
    name: THEME_REGISTRY[key].name,
    description: THEME_REGISTRY[key].description,
  })
);

type ThemeCtx = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggle: () => void;
  currentThemeKey: ThemeKey;
  setThemeKey: (key: ThemeKey) => void;
  availableThemes: typeof AVAILABLE_THEMES;
  currentPalette: ThemePalette;
  getPalette: (key: ThemeKey, mode?: ThemeMode) => ThemePalette;
};

const Ctx = createContext<ThemeCtx | null>(null);

const STORAGE_KEYS = {
  mode: "theme",
  selection: "theme-selection",
};

function resolvePalette(key: ThemeKey, mode: ThemeMode): ThemePalette {
  return THEME_REGISTRY[key][mode];
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.mode);
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

  const [currentThemeKey, setCurrentThemeKey] = useState<ThemeKey>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.selection) as ThemeKey | null;
      if (stored && stored in THEME_REGISTRY) return stored;
    } catch {
      // ignore
    }
    return "bare";
  });

  const currentPalette = useMemo(
    () => resolvePalette(currentThemeKey, theme),
    [currentThemeKey, theme]
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    root.dataset.themeVariant = currentThemeKey;
    try {
      localStorage.setItem(STORAGE_KEYS.mode, theme);
    } catch (error) {
      console.warn("Failed to persist theme mode", error);
    }
  }, [theme, currentThemeKey, currentPalette]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.selection, currentThemeKey);
    } catch (error) {
      console.warn("Failed to persist theme selection", error);
    }
  }, [currentThemeKey]);

  const value = useMemo<ThemeCtx>(
    () => ({
      theme,
      setTheme,
      toggle: () => setTheme((prev) => (prev === "dark" ? "light" : "dark")),
      currentThemeKey,
      setThemeKey: setCurrentThemeKey,
      availableThemes: AVAILABLE_THEMES,
      currentPalette,
      getPalette: (key, mode = theme) => resolvePalette(key, mode),
    }),
    [theme, currentThemeKey, currentPalette]
  );

  return (
    <Ctx.Provider value={value}>
      <div className={theme === "dark" ? "dark" : ""}>{children}</div>
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
