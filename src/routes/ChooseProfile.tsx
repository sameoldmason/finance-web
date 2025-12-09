import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { listProfiles, deleteProfile } from "../lib/profiles";
import { useTheme } from "../ThemeProvider";

type Profile = { id: string; name: string; hint?: string };

export default function ChooseProfile() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [confirmFor, setConfirmFor] = useState<Profile | null>(null);

  useEffect(() => {
    setProfiles(listProfiles());
  }, []);
  const refresh = useCallback(() => setProfiles(listProfiles()), []);

  const lightBg =
    "bg-background bg-gradient-to-b from-background via-cardDebt to-sidebar";
  const darkBg =
    "bg-toggleDark bg-gradient-to-b from-toggleDark via-toggleDark to-toggleDark";
  const textTone = theme === "dark" ? "text-background" : "text-textPrimary";

  const handleOpen = (id: string) => {
    if (deleteMode) return;
    navigate(`/profiles/${id}/unlock`);
  };


  const requestDelete = (p: Profile) => setConfirmFor(p);
  const confirmDelete = async () => {
    if (!confirmFor) return;
    try {
      await deleteProfile(confirmFor.id);
      refresh();
      setConfirmFor(null);
      setDeleteMode(false);
    } catch {
      setConfirmFor(null);
      setDeleteMode(false);
      alert("Delete failed. Please try again.");
    }
  };

  return (
    <div
      className={`min-h-[100svh] w-full flex items-center justify-center ${
        theme === "dark" ? darkBg : lightBg
      } ${textTone}`}
    >
      <div className="w-full max-w-[880px] px-6 py-10 relative">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center tracking-tight mb-1">
          Welcome Back!
        </h1>
        <p className="text-center text-textMuted mb-8">Choose a profile.</p>

        <div className="flex items-center justify-center gap-8 md:gap-10">
          {profiles.map((p) => (
            <div key={p.id} className="relative">
              <button
                onClick={() => handleOpen(p.id)}
                className="group relative h-24 w-24 md:h-28 md:w-28 rounded-full ring-2 ring-borderMedium hover:ring-accent shadow-md transition"
                title={p.name}
              >
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div className="h-full w-full flex items-center justify-center bg-cardDebt">
                    <span className="text-2xl md:text-3xl font-semibold text-toggleDark">
                      {p.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                </div>
              </button>

              {deleteMode && (
                <button
                  onClick={() => requestDelete(p)}
                  className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-red-500/90 text-white shadow ring-2 ring-white hover:bg-red-500 transition flex items-center justify-center"
                  aria-label={`Delete ${p.name}`}
                  title={`Delete ${p.name}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              )}
            </div>
          ))}

          <Link
            to="/profiles/new"
            className="h-24 w-24 md:h-28 md:w-28 rounded-full border border-primaryButtonBorder bg-primaryButton hover:bg-primaryButtonBorder transition flex items-center justify-center shadow-md"
            aria-label="Create new profile"
            title="Create new profile"
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2F3A30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </div>

        {profiles.length > 0 && (
          <button
            onClick={() => setDeleteMode((v) => !v)}
            className={`fixed bottom-4 left-4 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm transition ${
              deleteMode
                ? "bg-red-500/90 text-white hover:bg-red-500 dark:bg-red-500/90 dark:hover:bg-red-500"
                : "bg-primaryButton text-toggleDark hover:bg-primaryButtonBorder dark:bg-primaryButtonDark dark:text-toggleDarkText dark:hover:bg-primaryButtonBorderDark"
            }`}
            aria-pressed={deleteMode}
            aria-label={deleteMode ? "Exit delete mode" : "Delete profiles"}
            title={deleteMode ? "Exit delete mode" : "Delete profiles"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        )}
      </div>

      {/* Theme toggle (global) */}
      <button
        onClick={toggle}
        className="fixed bottom-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-toggleDark text-textPrimaryDark shadow-md backdrop-blur-sm transition-colors duration-200 hover:brightness-110 dark:bg-toggleDarkBg dark:text-toggleDarkText"
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

      {/* Confirm Modal */}
      {confirmFor && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 dark:bg-toggleDarkText/70" onClick={() => setConfirmFor(null)} />
          <div className="relative z-30 w-[92vw] max-w-md rounded-2xl border border-borderMedium bg-cardDebt text-textPrimary shadow-xl p-6 dark:border-borderMediumDark dark:bg-cardDebtDark dark:text-textPrimaryDark">
            <h2 className="text-xl font-semibold mb-2">Delete profile?</h2>
            <p className="text-sm text-textMuted dark:text-textMutedDark mb-4">
              You're about to delete <span className="font-medium">{confirmFor.name}</span> and all local data for this profile. This can't be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmFor(null)} className="rounded-xl px-4 py-2 border border-borderMedium bg-sidebar text-textPrimary hover:border-accent dark:border-borderMediumDark dark:bg-sidebarDark dark:text-textPrimaryDark dark:hover:border-accentDark">Cancel</button>
              <button onClick={confirmDelete} className="rounded-xl px-4 py-2 bg-accent text-background hover:bg-accent/80 dark:bg-accentDark dark:text-background dark:hover:bg-accentDark/80">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
