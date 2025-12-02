// src/ActiveProfileContext.tsx
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getProfile } from "./lib/profiles";

export type ActiveProfile = {
  id: string;
  name: string;
};

type ActiveProfileContextValue = {
  activeProfile: ActiveProfile | null;
  setActiveProfileId: (id: string | null) => void;
};

const ActiveProfileContext = createContext<ActiveProfileContextValue | undefined>(
  undefined
);

export function ActiveProfileProvider({ children }: { children: React.ReactNode }) {
  const [activeProfile, setActiveProfile] = useState<ActiveProfile | null>(null);

  const setActiveProfileId = useCallback((id: string | null) => {
    if (!id) {
      setActiveProfile(null);
      try {
        sessionStorage.removeItem("activeProfileId");
      } catch (error) {
        console.warn("Failed to clear active profile from sessionStorage", error);
      }
      return;
    }

    try {
      const p = getProfile(id);
      if (p) {
        setActiveProfile({ id: p.id, name: p.name });
        sessionStorage.setItem("activeProfileId", p.id);
      } else {
        setActiveProfile(null);
        sessionStorage.removeItem("activeProfileId");
      }
    } catch {
      // Fail silently; keep previous state
    }
  }, []);

  useEffect(() => {
    // Re-hydrate on refresh
    try {
      const stored = sessionStorage.getItem("activeProfileId");
      if (stored) {
        const p = getProfile(stored);
        if (p) {
          setActiveProfile({ id: p.id, name: p.name });
        } else {
          sessionStorage.removeItem("activeProfileId");
        }
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <ActiveProfileContext.Provider value={{ activeProfile, setActiveProfileId }}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

export function useActiveProfile() {
  const ctx = useContext(ActiveProfileContext);
  if (!ctx) {
    throw new Error("useActiveProfile must be used within ActiveProfileProvider");
  }
  return ctx;
}
