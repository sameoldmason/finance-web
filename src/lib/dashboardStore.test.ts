import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadDashboardData, saveDashboardData } from "./dashboardStore";
import type { DashboardData } from "./financeTypes";

describe("dashboardStore", () => {
  let storage: Record<string, string>;
  let localStorageMock: Storage;

  beforeEach(() => {
    storage = {};

    localStorageMock = {
      getItem: vi.fn((key: string) => (key in storage ? storage[key] : null)),
      setItem: vi.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key];
      }),
      clear: vi.fn(() => {
        storage = {};
      }),
      key: vi.fn(),
      length: 0,
    } as unknown as Storage;

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when no dashboard data is stored", () => {
    expect(loadDashboardData("profile-1")).toBeNull();
    expect(localStorageMock.getItem).toHaveBeenCalledWith(
      "finance-web:dashboard:profile-1"
    );
  });

  it("returns parsed dashboard data when stored", () => {
    const data: DashboardData = {
      accounts: [
        { id: "a1", name: "Checking", balance: 100, accountCategory: "asset" },
      ],
      transactions: [],
      bills: [],
      netWorthHistory: [],
    };

    storage["finance-web:dashboard:profile-2"] = JSON.stringify(data);

    expect(loadDashboardData("profile-2")).toEqual(data);
  });

  it("defaults missing or invalid fields to empty arrays", () => {
    storage["finance-web:dashboard:profile-3"] = JSON.stringify({
      accounts: [{ id: "a2", name: "Savings", balance: 200 }],
      transactions: null,
      bills: "not-an-array",
    });

    expect(loadDashboardData("profile-3")).toEqual({
      accounts: [
        { id: "a2", name: "Savings", balance: 200, accountCategory: "asset" },
      ],
      transactions: [],
      bills: [],
      netWorthHistory: [],
      netWorthViewMode: undefined,
      hideMoney: undefined,
    });
  });

  it("handles invalid JSON by logging and returning null", () => {
    storage["finance-web:dashboard:profile-4"] = "{bad json";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(loadDashboardData("profile-4")).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("saves dashboard data with defaults for missing arrays", () => {
    const data = {
      accounts: [],
      transactions: undefined,
      bills: undefined,
    } as unknown as DashboardData;

    saveDashboardData("profile-5", data);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "finance-web:dashboard:profile-5",
      JSON.stringify({
        accounts: [],
        transactions: [],
        bills: [],
        netWorthHistory: [],
        netWorthViewMode: undefined,
        hideMoney: undefined,
      })
    );
  });
});
