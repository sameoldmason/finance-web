import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveProfile } from "../ActiveProfileContext";
import { createProfile, countProfiles, listProfiles } from "../lib/profiles";
import { useTheme } from "../ThemeProvider";

export default function CreateProfile() {
  const navigate = useNavigate();
  const { setActiveProfileId } = useActiveProfile();
  const { theme, toggle } = useTheme();

  // Form state
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [hint, setHint] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Discard modal
  const [showDiscard, setShowDiscard] = useState(false);

  const lightBg =
    "bg-background bg-gradient-to-b from-background via-cardDebt to-sidebar";
  const darkBg =
    "bg-toggleDark bg-gradient-to-b from-toggleDark via-toggleDark to-toggleDark";
  const textTone = theme === "dark" ? "text-background" : "text-textPrimary";

  const profilesLeft = Math.max(0, 3 - countProfiles());

  const valid =
    name.trim().length > 0 &&
    password.length > 0 &&
    confirm.length > 0 &&
    password === confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const { id } = createProfile({ name, password, hint });
      setActiveProfileId(id);
      navigate("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Could not create profile.");
      } else {
        setError("Could not create profile.");
      }
    } finally {
      setBusy(false);
    }
  }

  function handleBack() {
    const dirty =
      name.trim().length > 0 ||
      password.length > 0 ||
      confirm.length > 0 ||
      hint.trim().length > 0;

    if (dirty) {
      setShowDiscard(true);
      return;
    }
    const hasAny = listProfiles().length > 0;
    navigate(hasAny ? "/profiles" : "/");
  }

  function confirmDiscard() {
    setShowDiscard(false);
    const hasAny = listProfiles().length > 0;
    navigate(hasAny ? "/profiles" : "/");
  }
  function cancelDiscard() {
    setShowDiscard(false);
  }

  return (
    <div
      className={`min-h-[100svh] w-full flex items-center justify-center ${
        theme === "dark" ? darkBg : lightBg
      } ${textTone} relative`}
    >
      {/* Back button */}
      <button
        onClick={handleBack}
        className="absolute top-4 left-4 flex items-center justify-center w-10 h-10 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition"
        aria-label="Back"
        title="Back"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className="-translate-y-6 w-full max-w-[520px] rounded-2xl bg-cardDebt p-6 shadow-md">
        <h1 className="text-3xl font-bold font-outfit mb-1 text-center text-textPrimary">
          Create Profile
        </h1>
        <p className="text-sm font-outfit mb-6 text-center text-textMuted">
          {profilesLeft === 0
            ? "Profile limit reached (3)."
            : `You can create ${profilesLeft} more profile${
                profilesLeft === 1 ? "" : "s"
              }.`}
        </p>

        {error && (
          <div
            className="mb-4 rounded-lg bg-red-100 px-3 py-2 text-red-700 text-sm"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="mb-1 block text-sm text-textMuted">
              Profile Name
            </label>
            <input
              id="name"
              type="text"
              className="w-full rounded-xl border border-borderSoft bg-background px-3 py-2 text-textPrimary placeholder-textSubtle outline-none focus:ring-2 focus:ring-accent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-textMuted">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                className="w-full rounded-xl border border-borderSoft bg-background px-3 py-2 pr-10 text-textPrimary placeholder-textSubtle outline-none focus:ring-2 focus:ring-accent"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute inset-y-0 right-2 my-auto text-sm text-textMuted hover:text-textPrimary"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm" className="mb-1 block text-sm text-textMuted">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                className="w-full rounded-xl border border-borderSoft bg-background px-3 py-2 pr-10 text-textPrimary placeholder-textSubtle outline-none focus:ring-2 focus:ring-accent"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-2 my-auto text-sm text-textMuted hover:text-textPrimary"
                aria-label={
                  showConfirm ? "Hide confirm password" : "Show confirm password"
                }
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
            {confirm.length > 0 && password !== confirm && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                Passwords don't match.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="hint" className="mb-1 block text-sm text-textMuted">
              Optional Hint
            </label>
            <input
              id="hint"
              type="text"
              className="w-full rounded-xl border border-borderSoft bg-background px-3 py-2 text-textPrimary placeholder-textSubtle outline-none focus:ring-2 focus:ring-accent"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
            />
          </div>

          {/* Create button - 200px wide, taller */}
          <button
            type="submit"
            disabled={!valid || profilesLeft === 0 || busy}
            className={`mx-auto block w-[200px] rounded-2xl border px-4 py-[14px] font-medium transition
              ${
                !valid || profilesLeft === 0 || busy
                  ? "border-borderSoft bg-borderSoft text-textSubtle cursor-not-allowed"
                  : "border-primaryButtonBorder bg-primaryButton text-toggleDark hover:bg-primaryButtonBorder active:brightness-95"
              }`}
          >
            {busy ? "Creating..." : "Create Profile"}
          </button>
        </form>
      </div>

      {/* Theme toggle (global) */}
      <button
        onClick={toggle}
        className={`fixed bottom-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm transition-colors duration-200
          ${
            theme === "dark"
              ? "bg-toggleDark text-background hover:bg-toggleDark/90"
              : "bg-primaryButton text-toggleDark hover:bg-primaryButtonBorder"
          }`}
        aria-label="Toggle theme"
        aria-pressed={theme === "dark"}
        title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      >
        {theme === "dark" ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="11" r="4" />
            <path d="M10 18h4M10 21h4" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="11" r="4" />
            <path d="M10 18h4M10 21h4" />
            <path d="M12 4v2M4 11h2M18 11h2M6.5 6.5l1.5 1.5M17.5 6.5l-1.5 1.5" />
          </svg>
        )}
      </button>

      {/* Discard modal */}
      {showDiscard && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={cancelDiscard} />
          <div className="relative z-30 w-[92vw] max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-2">Discard changes?</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              You have unsaved inputs. If you leave now, they’ll be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={cancelDiscard} className="rounded-xl px-4 py-2 border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]">
                Cancel
              </button>
              <button onClick={confirmDiscard} className="rounded-xl px-4 py-2 bg-red-500 text-white hover:bg-red-600">
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
