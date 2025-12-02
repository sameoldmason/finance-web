/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type MoneyVisibilityState = {
  hideMoney: boolean;
  toggleHideMoney: () => void;
};

const MoneyVisibilityContext = createContext<MoneyVisibilityState | undefined>(
  undefined
);

type MoneyVisibilityProviderProps = {
  children: React.ReactNode;
  initialHideMoney?: boolean;
  onChange?: (hide: boolean) => void;
};

export function MoneyVisibilityProvider({
  children,
  initialHideMoney = false,
  onChange,
}: MoneyVisibilityProviderProps) {
  const [hideMoney, setHideMoney] = useState(initialHideMoney);

  useEffect(() => {
    setHideMoney(initialHideMoney);
  }, [initialHideMoney]);

  const toggleHideMoney = useCallback(() => {
    setHideMoney((prev) => {
      const next = !prev;
      onChange?.(next);
      return next;
    });
  }, [onChange]);

  const value = useMemo(
    () => ({ hideMoney, toggleHideMoney }),
    [hideMoney, toggleHideMoney]
  );

  return (
    <MoneyVisibilityContext.Provider value={value}>
      {children}
    </MoneyVisibilityContext.Provider>
  );
}

export function useMoneyVisibility(): MoneyVisibilityState {
  const ctx = useContext(MoneyVisibilityContext);
  if (!ctx) {
    throw new Error(
      "useMoneyVisibility must be used within a MoneyVisibilityProvider"
    );
  }
  return ctx;
}
