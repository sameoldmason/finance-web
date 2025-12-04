import { useEffect, useRef, useState } from "react";
import { useTheme } from "../ThemeProvider";
import { useToast } from "../ToastContext";
import type { UserProfile } from "../lib/profileStore";

export type ResetOption = "transactions" | "accounts" | "all";

type Props = {
  profile: UserProfile;
  onUpdateProfile: (next: UserProfile) => void;
  onResetData: (choice: ResetOption) => void;
  onLogout: () => void;
};

export default function ProfileDropdown({
  profile,
  onUpdateProfile,
  onResetData,
  onLogout,
}: Props) {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetChoice, setResetChoice] = useState<ResetOption>("transactions");
  const chipRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [editName, setEditName] = useState(profile.displayName);
  const [editInitials, setEditInitials] = useState(profile.initials);

  useEffect(() => {
    setEditName(profile.displayName);
    setEditInitials(profile.initials);
  }, [profile.displayName, profile.initials]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!isOpen) return;
      const target = event.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        chipRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsEditOpen(false);
        setIsAboutOpen(false);
        setIsFeedbackOpen(false);
        setIsResetOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const panelBase =
    theme === "dark"
      ? "bg-[#0f172a]/95 text-white"
      : "bg-white/95 text-[#2f2f2f]";
  const hoverBg = theme === "dark" ? "hover:bg-white/10" : "hover:bg-black/5";

  const closeAll = () => {
    setIsOpen(false);
    setIsEditOpen(false);
    setIsAboutOpen(false);
    setIsFeedbackOpen(false);
    setIsResetOpen(false);
  };

  const handleEditSave = () => {
    const nextName = editName.trim();
    if (!nextName) {
      showToast("Display name cannot be empty.");
      return;
    }

    const nextInitials = editInitials.trim().slice(0, 2).toUpperCase();
    onUpdateProfile({
      displayName: nextName,
      initials: nextInitials || profile.initials,
    });
    closeAll();
  };

  const handleAppearance = () => {
    showToast("Feature coming soon, what colour schemes would you like to see?");
    setIsOpen(false);
  };

  const handleComingSoon = () => {
    showToast("What other features would you like to see?");
    setIsOpen(false);
  };

  const handleResetConfirm = () => {
    onResetData(resetChoice);
    closeAll();
  };

  const handleLogoutClick = () => {
    onLogout();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={chipRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="group flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold text-white/90 backdrop-blur hover:bg-white/15"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="text-sm">{profile.displayName}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[#454545]">
          <span className="text-xs font-semibold">{profile.initials}</span>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          className={`text-white/80 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <path
            d="M6 9l6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute right-0 z-30 mt-2 w-56 rounded-2xl ${panelBase} shadow-lg ring-1 ring-black/5`}
        >
          <div className="flex flex-col py-2">
            <DropdownItem
              label="Edit profile…"
              onClick={() => {
                setIsEditOpen(true);
                setIsOpen(false);
              }}
              hoverBg={hoverBg}
            />
            <DropdownItem label="Appearance" onClick={handleAppearance} hoverBg={hoverBg} />
            <DropdownItem label="Debt planner (coming soon)" onClick={handleComingSoon} hoverBg={hoverBg} />
            <DropdownItem label="Budgeting tools (coming soon)" onClick={handleComingSoon} hoverBg={hoverBg} />
            <DropdownItem label="Insights (coming soon)" onClick={handleComingSoon} hoverBg={hoverBg} />
            <DropdownItem
              label="About"
              onClick={() => {
                setIsAboutOpen(true);
                setIsOpen(false);
              }}
              hoverBg={hoverBg}
            />
            <DropdownItem
              label="Send feedback"
              onClick={() => {
                setIsFeedbackOpen(true);
                setIsOpen(false);
              }}
              hoverBg={hoverBg}
            />
            <DropdownItem
              label="Reset data…"
              onClick={() => {
                setIsResetOpen(true);
                setIsOpen(false);
              }}
              hoverBg={hoverBg}
            />
            <DropdownItem label="Log out" onClick={handleLogoutClick} hoverBg={hoverBg} />
          </div>
        </div>
      )}

      {isEditOpen && (
        <Modal onClose={() => setIsEditOpen(false)} panelBase={panelBase}>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Edit profile</h2>
          </div>
          <form autoComplete="off" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium opacity-90" htmlFor="displayName">
                Display name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                autoComplete="off"
                className={`w-full rounded-xl border-none px-3 py-2 text-sm font-medium shadow-inner outline-none ${
                  theme === "dark" ? "bg-white/10 text-white" : "bg-black/5 text-[#2f2f2f]"
                }`}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium opacity-90" htmlFor="initials">
                Initials
              </label>
              <input
                id="initials"
                name="initials"
                type="text"
                inputMode="text"
                autoComplete="new-password"
                className={`w-24 rounded-xl border-none px-3 py-2 text-sm font-semibold uppercase shadow-inner outline-none ${
                  theme === "dark" ? "bg-white/10 text-white" : "bg-black/5 text-[#2f2f2f]"
                }`}
                value={editInitials}
                onChange={(e) => setEditInitials(e.target.value)}
                maxLength={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                className="rounded-xl bg-[#3ee1ac] px-4 py-2 text-sm font-semibold text-[#154032] shadow hover:bg-[#31c997]"
              >
                Save changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isAboutOpen && (
        <Modal onClose={() => setIsAboutOpen(false)} panelBase={panelBase}>
          <div className="mb-3">
            <h2 className="text-xl font-semibold">About</h2>
          </div>
          <div className="space-y-2 text-sm leading-relaxed">
            <p>This app is a work-in-progress personal finance dashboard (final name TBD).</p>
            <p>Track your accounts, debt, and net worth in one place.</p>
            <p className="text-xs opacity-80">Version 0.1</p>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => setIsAboutOpen(false)}
              className="rounded-xl bg-[#3ee1ac] px-4 py-2 text-sm font-semibold text-[#154032] shadow hover:bg-[#31c997]"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {isFeedbackOpen && (
        <Modal onClose={() => setIsFeedbackOpen(false)} panelBase={panelBase}>
          <div className="mb-3">
            <h2 className="text-xl font-semibold">Send feedback</h2>
          </div>
          <p className="text-sm leading-relaxed">Just text Mason lol</p>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => setIsFeedbackOpen(false)}
              className="rounded-xl bg-[#3ee1ac] px-4 py-2 text-sm font-semibold text-[#154032] shadow hover:bg-[#31c997]"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {isResetOpen && (
        <Modal onClose={() => setIsResetOpen(false)} panelBase={panelBase}>
          <div className="mb-3">
            <h2 className="text-xl font-semibold">Reset data</h2>
          </div>
          <form autoComplete="off" className="space-y-4">
            <p className="text-sm opacity-90">
              Choose what you want to reset. This action cannot be undone.
            </p>
            <div className="space-y-3">
              <ResetOptionRow
                id="reset-transactions"
                label="Reset transactions only"
                checked={resetChoice === "transactions"}
                onChange={() => setResetChoice("transactions")}
              />
              <ResetOptionRow
                id="reset-accounts"
                label="Reset accounts only"
                checked={resetChoice === "accounts"}
                onChange={() => setResetChoice("accounts")}
              />
              <ResetOptionRow
                id="reset-all"
                label="Reset everything (accounts, transactions, and settings)"
                checked={resetChoice === "all"}
                onChange={() => setResetChoice("all")}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetConfirm}
                className="rounded-xl bg-red-500/90 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-500"
              >
                Confirm reset
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

type DropdownItemProps = {
  label: string;
  onClick: () => void;
  hoverBg: string;
};

function DropdownItem({ label, onClick, hoverBg }: DropdownItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center px-4 py-2 text-left text-sm font-semibold transition ${hoverBg}`}
    >
      {label}
    </button>
  );
}

type ModalProps = {
  children: React.ReactNode;
  onClose: () => void;
  panelBase: string;
};

function Modal({ children, onClose, panelBase }: ModalProps) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative z-50 w-[92vw] max-w-md rounded-2xl ${panelBase} p-6 shadow-xl`}>
        {children}
      </div>
    </div>
  );
}

type ResetRowProps = {
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
};

function ResetOptionRow({ id, label, checked, onChange }: ResetRowProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3 text-sm font-medium">
      <input
        id={id}
        type="radio"
        name="reset-option"
        className="h-4 w-4 accent-[#3ee1ac]"
        checked={checked}
        onChange={onChange}
        autoComplete="off"
      />
      <span>{label}</span>
    </label>
  );
}
