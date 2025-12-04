// src/lib/profileStore.ts
export type UserProfile = {
  displayName: string;
  initials: string;
};

const PROFILE_ROOT_KEY = "finance-web:profile";

function storageKey(profileId: string) {
  return `${PROFILE_ROOT_KEY}:${profileId}`;
}

export function deriveInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "PN";

  const parts = trimmed.split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]).join("");
  return letters.slice(0, 2).toUpperCase();
}

export function loadUserProfile(
  profileId: string | null | undefined,
  fallbackName = "Profile"
): UserProfile {
  const baseProfile: UserProfile = {
    displayName: fallbackName.trim() || "Profile",
    initials: deriveInitials(fallbackName || "Profile"),
  };

  if (!profileId) return baseProfile;

  try {
    const raw = localStorage.getItem(storageKey(profileId));
    if (!raw) return baseProfile;

    const parsed = JSON.parse(raw) as Partial<UserProfile> | null;
    if (!parsed || typeof parsed !== "object") return baseProfile;

    const displayName = typeof parsed.displayName === "string"
      ? parsed.displayName.trim() || baseProfile.displayName
      : baseProfile.displayName;

    const initials = typeof parsed.initials === "string" && parsed.initials.trim()
      ? parsed.initials.trim().slice(0, 2).toUpperCase()
      : deriveInitials(displayName);

    return { displayName, initials };
  } catch (err) {
    console.error("Failed to load user profile", err);
    return baseProfile;
  }
}

export function saveUserProfile(profileId: string, profile: UserProfile) {
  try {
    const payload: UserProfile = {
      displayName: profile.displayName.trim() || "Profile",
      initials: profile.initials.trim().slice(0, 2).toUpperCase() || deriveInitials(profile.displayName),
    };
    localStorage.setItem(storageKey(profileId), JSON.stringify(payload));
  } catch (err) {
    console.error("Failed to save user profile", err);
  }
}

export function clearUserProfile(profileId: string) {
  try {
    localStorage.removeItem(storageKey(profileId));
  } catch (err) {
    console.error("Failed to clear user profile", err);
  }
}
