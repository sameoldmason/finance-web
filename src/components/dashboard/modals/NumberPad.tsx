// src/components/dashboard/modals/NumberPad.tsx
import { modalCardBase, modalCloseButtonClass } from "./modalStyles";

type NumberPadProps = {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
};

export function NumberPad({ value, onChange, onClose }: NumberPadProps) {
  const handlePress = (key: string) => {
    if (key === "C") {
      onChange("");
      return;
    }
    if (key === "←") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === ".") {
      if (value.includes(".")) return;
      onChange(value === "" ? "0." : value + ".");
      return;
    }
    // digits
    onChange(value + key);
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "←"];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className={`w-full max-w-xs ${modalCardBase} p-4`}>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            Number pad
          </span>
          <button
            type="button"
            onClick={onClose}
            className={modalCloseButtonClass}
          >
            ✕
          </button>
        </div>

        <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-right text-lg font-semibold text-[var(--color-text-primary)]">
          {value || "0"}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => handlePress(k)}
              className="flex h-10 items-center justify-center rounded-lg bg-[var(--color-surface-alt)] text-sm font-semibold text-[var(--color-text-primary)] shadow-sm hover:bg-[var(--color-surface)]"
            >
              {k}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => handlePress("C")}
            className="flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--color-accent-strong)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
