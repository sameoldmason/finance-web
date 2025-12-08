import { useNavigate } from "react-router-dom";
import { useTheme } from "../ThemeProvider";

export default function Welcome() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const handleClick = () => setTimeout(() => navigate("/profiles/new"), 200);

  const lightBg =
    "bg-background bg-gradient-to-b from-background via-cardDebt to-sidebar";
  const darkBg =
    "bg-toggleDark bg-gradient-to-b from-toggleDark via-toggleDark to-toggleDark";
  const textTone = theme === "dark" ? "text-background" : "text-textPrimary";

  return (
    <div
      className={`min-h-[100svh] w-full flex items-center justify-center ${theme === "dark" ? darkBg : lightBg} ${textTone}`}
    >
      <div className="-translate-y-8 flex flex-col items-center">
        <h1 className="text-6xl font-bold font-outfit mb-2">Welcome!</h1>
        <p className="text-lg font-light font-outfit mb-6 text-textMuted">
          Create a profile.
        </p>

        <button
          onClick={handleClick}
          className="w-20 h-20 rounded-full border border-primaryButtonBorder bg-primaryButton flex items-center justify-center text-4xl text-toggleDark shadow-md transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label="Create profile"
        >
          +
        </button>
      </div>

      {/* Theme toggle (global) */}
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
    </div>
  );
}
