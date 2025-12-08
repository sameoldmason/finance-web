import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../ThemeProvider";
import { getProfile, verifyProfilePassword } from "../lib/profiles";
import { useActiveProfile } from "../ActiveProfileContext";

export default function UnlockProfile() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { theme, toggle } = useTheme();
  const { setActiveProfileId } = useActiveProfile();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [profileName, setProfileName] = useState<string>("");
  const [passwordHint, setPasswordHint] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const p = getProfile(id);
    if (!p) {
      navigate("/profiles");
      return;
    }
    setProfileName(p.name || "Profile");
    setPasswordHint(p.hint?.trim() || null);
  }, [id, navigate]);

  const lightBg =
    "bg-background bg-gradient-to-b from-background via-cardDebt to-sidebar";
  const darkBg =
    "bg-toggleDark bg-gradient-to-b from-toggleDark via-toggleDark to-toggleDark";
  const textTone = theme === "dark" ? "text-background" : "text-textPrimary";

  const initials = useMemo(() => {
    const parts = profileName.trim().split(/\s+/).filter(Boolean);
    return (
      parts
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase() ?? "")
        .join("") || "U"
    );
  }, [profileName]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const ok = verifyProfilePassword(id, password);
      if (ok) {
        setPassword("");
        setActiveProfileId(id); // NEW: remember active profile
        navigate("/dashboard");
      } else {
        setError("Incorrect password.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`min-h-[100svh] w-full flex items-center justify-center ${
        theme === "dark" ? darkBg : lightBg
      } ${textTone} relative`}
    >
      {/* Back */}
      <button
        onClick={() => navigate("/profiles")}
        className="absolute top-4 left-4 flex items-center justify-center w-10 h-10 rounded-full border border-borderMedium bg-primaryButton text-toggleDark hover:bg-primaryButtonBorder transition"
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

      <div className="-translate-y-6 w-full max-w-[760px] rounded-2xl bg-cardDebt p-8 shadow-md">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center tracking-tight text-textPrimary">
          Welcome Back!
        </h1>
        <p className="text-center text-textMuted mt-1 mb-8">Enter Password</p>

        <form
          onSubmit={onSubmit}
          className="flex items-start justify-center gap-6"
        >
          {/* Avatar */}
          <div className="relative h-16 w-16 md:h-20 md:w-20 rounded-full ring-2 ring-primaryButtonBorder overflow-hidden bg-cardDebt flex items-center justify-center">
            <span className="text-2xl md:text-3xl font-semibold text-toggleDark">
              {initials}
            </span>
          </div>

          {/* Password field + button */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col gap-1">
              <input
                type="password"
                inputMode="text"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-[300px] md:w-[360px] rounded-lg border border-borderSoft bg-background px-3 py-2 text-textPrimary placeholder-textSubtle outline-none focus:ring-2 focus:ring-accent"
                placeholder="Password"
                aria-label="Password"
              />
              <p className="px-1 text-xs leading-snug text-textSubtle">
                {passwordHint ? `Hint: ${passwordHint}` : "No hint saved for this profile."}
              </p>
            </div>
            <button
              type="submit"
              disabled={!password || busy}
              className={`rounded-xl border px-4 py-2 transition ${
                !password || busy
                  ? "border-borderSoft bg-borderSoft text-textSubtle cursor-not-allowed"
                  : "border-primaryButtonBorder bg-primaryButton text-toggleDark hover:bg-primaryButtonBorder active:brightness-95"
              }`}
            >
              {busy ? "…" : "Unlock"}
            </button>
          </div>
        </form>

        {error && (
          <p
            className="text-sm text-red-700 text-center mt-4"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        )}
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        className={`fixed bottom-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm transition-colors duration-200 ${
          theme === "dark"
            ? "bg-toggleDark text-background hover:bg-toggleDark/90"
            : "bg-primaryButton text-toggleDark hover:bg-primaryButtonBorder"
        }`}
        aria-label="Toggle theme"
        aria-pressed={theme === "dark"}
        title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="11" r="4" />
          <path d="M10 18h4M10 21h4" />
        </svg>
      </button>
    </div>
  );
}
