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

  useEffect(() => { setProfiles(listProfiles()); }, []);
  const refresh = useCallback(() => setProfiles(listProfiles()), []);

  const lightBg = "bg-brand-primary bg-gradient-to-b from-[#B6C8CE] via-brand-primary to-[#869BA1]";
  const darkBg  = "bg-[#1E3A5F] bg-gradient-to-b from-[#2E517F] via-[#1E3A5F] to-[#10263F]";

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
    <div className={`min-h-[100svh] w-full flex items-center justify-center ${theme === "dark" ? darkBg : lightBg} text-brand-accent`}>
      <div className="w-full max-w-[880px] px-6 py-10 relative">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center tracking-tight mb-1">Welcome Back!</h1>
        <p className="text-center opacity-80 mb-8">Choose a profile.</p>

        <div className="flex items-center justify-center gap-8 md:gap-10">
          {profiles.map((p) => (
            <div key={p.id} className="relative">
              <button onClick={() => handleOpen(p.id)} className="group relative h-24 w-24 md:h-28 md:w-28 rounded-full ring-2 ring-white/70 hover:ring-white shadow-md transition" title={p.name}>
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div className="h-full w-full flex items-center justify-center bg-white/90">
                    <span className="text-2xl md:text-3xl font-semibold text-[#3b3b3b]">
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

          <Link to="/profiles/new" className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white/85 hover:bg-white transition flex items-center justify-center shadow-md" aria-label="Create new profile" title="Create new profile">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3b3b3b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </div>

        {profiles.length > 0 && (
          <button
            onClick={() => setDeleteMode((v) => !v)}
            className={`fixed bottom-4 left-4 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm transition ${
              deleteMode
                ? "bg-red-500/90 text-white hover:bg-red-500"
                : "bg-black/10 text-[#454545] hover:bg-black/15"
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
        className={`fixed bottom-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm transition-colors duration-200 ${
          theme === "dark"
            ? "bg-white/10 text-brand-accent hover:bg-white/15"
            : "bg-black/10 text-[#454545] hover:bg-black/15"
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

      {/* Confirm Modal (unchanged)… */}
      {confirmFor && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmFor(null)} />
          <div className="relative z-30 w-[92vw] max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-2">Delete profile?</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              You’re about to delete <span className="font-medium">{confirmFor.name}</span> and all local data for this profile. This can’t be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmFor(null)} className="rounded-xl px-4 py-2 border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]">Cancel</button>
              <button onClick={confirmDelete} className="rounded-xl px-4 py-2 bg-red-500 text-white hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
