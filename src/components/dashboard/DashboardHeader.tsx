import { FormEvent } from "react";

type AppMenuItem = {
  label: string;
  onClick: () => void;
};

type DashboardHeaderProps = {
  appMenuItems: AppMenuItem[];
  isAppMenuOpen: boolean;
  onToggleAppMenu: () => void;

  activeProfileExists: boolean;
  profileName: string;
  isEditingProfileName: boolean;
  profileNameInput: string;
  profileNameError: string;
  onProfileNameInputChange: (value: string) => void;
  onProfileNameSubmit: () => void;
  onStartEditingProfileName: () => void;

  avatarInitial: string;
};

export function DashboardHeader(props: DashboardHeaderProps) {
  const {
    appMenuItems,
    isAppMenuOpen,
    onToggleAppMenu,
    activeProfileExists,
    profileName,
    isEditingProfileName,
    profileNameInput,
    profileNameError,
    onProfileNameInputChange,
    onProfileNameSubmit,
    onStartEditingProfileName,
    avatarInitial,
  } = props;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onProfileNameSubmit();
  };

  return (
    <header className="w-full bg-black/10 px-4 py-4 shadow-md backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full items-center justify-between gap-4">
        {/* Left side: logo + pills */}
        <div className="flex flex-1 items-center gap-4">
          <button
            type="button"
            onClick={onToggleAppMenu}
            aria-expanded={isAppMenuOpen}
            aria-controls="app-menu-pills"
            className="rounded-full px-4 py-2.5 text-left text-lg font-semibold text-white/90 transition hover:bg-[var(--color-surface-alt)]/5"
          >
            <span className="tracking-wide">bare</span>
          </button>

          <div
            id="app-menu-pills"
            className={`flex items-center gap-2 overflow-hidden transition-[max-width,opacity,transform] duration-300 ${
              isAppMenuOpen
                ? "max-w-[640px] opacity-100 translate-x-0"
                : "max-w-0 opacity-0 -translate-x-2 pointer-events-none"
            }`}
          >
            {appMenuItems.map((item, index) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                style={{
                  transitionDelay: isAppMenuOpen ? `${index * 80}ms` : "0ms",
                }}
                className={`rounded-full bg-[var(--color-surface-alt)]/15 px-3 py-1 text-xs font-semibold text-white/80 shadow-sm transition-all duration-300 ${
                  isAppMenuOpen
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-2 opacity-0"
                } hover:bg-[var(--color-surface-alt)]/25`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right side: profile name + avatar */}
        <div className="flex items-center justify-end gap-4">
          <div className="flex items-center gap-3 rounded-full px-3 py-1 text-left text-sm">
            <div className="flex flex-col">
              {isEditingProfileName ? (
                <form
                  onSubmit={handleSubmit}
                  className="flex items-center gap-2"
                >
                  <input
                    value={profileNameInput}
                    onChange={(event) =>
                      onProfileNameInputChange(event.target.value)
                    }
                    onBlur={() => onProfileNameSubmit()}
                    className="w-40 rounded-lg bg-[var(--color-surface-alt)]/10 px-2 py-1 text-sm text-white placeholder-white/50 shadow-inner outline-none ring-1 ring-white/20 focus:ring-white/50"
                    placeholder="Enter name"
                    autoFocus
                  />
                  <button type="submit" className="sr-only">
                    Save profile name
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={onStartEditingProfileName}
                  disabled={!activeProfileExists}
                  className="text-sm font-semibold text-white/90 transition hover:text-white disabled:cursor-not-allowed disabled:text-white/40"
                >
                  {profileName}
                </button>
              )}
              {profileNameError && (
                <span className="mt-1 text-xs text-red-300">
                  {profileNameError}
                </span>
              )}
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-alt)]/80 text-[var(--color-text-primary)]">
              <span className="text-xs font-semibold">{avatarInitial}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
