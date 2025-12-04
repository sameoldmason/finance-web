// src/lib/profiles.ts

export type StoredProfile = {
  id: string;
  name: string;        // original display name
  password: string;
  hint?: string;
};

const LS_KEY = "profiles.v1";

/* ------------------------
   Internal helpers
------------------------- */
function readAll(): StoredProfile[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(profiles: StoredProfile[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(profiles));
  } catch (err) {
    console.error("Failed to save profiles:", err);
  }
}

/** Normalize a name for duplicate checks: trim, collapse spaces, lowercase. */
function normName(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/* ------------------------
   Public API
------------------------- */

export function listProfiles(): StoredProfile[] {
  return readAll();
}

export function countProfiles(): number {
  return readAll().length;
}

/** Returns true if a name already exists (case-insensitive). */
export function profileNameExists(name: string): boolean {
  const n = normName(name);
  return readAll().some((p) => normName(p.name) === n);
}

/**
 * Create a new profile with recovery codes.
 * Enforces:
 *  - Max 3 profiles
 *  - No duplicate names (case-insensitive)
 */
export function createProfile(data: {
  name: string;
  password: string;
  hint?: string;
}): { id: string; recoveryCodes: string[] } {
  const profiles = readAll();

  if (profiles.length >= 3) {
    throw new Error("Profile limit reached (3).");
  }

  const cleanName = data.name.trim();
  if (!cleanName) {
    throw new Error("Profile name is required.");
  }

  if (profileNameExists(cleanName)) {
    throw new Error("A profile with that name already exists.");
  }

  const id = crypto.randomUUID();

  const profile: StoredProfile = {
    id,
    name: cleanName,
    password: data.password,
    hint: data.hint?.trim() || undefined,
  };

  profiles.push(profile);
  writeAll(profiles);

  const recoveryCodes = generateRecoveryCodes();
  return { id, recoveryCodes };
}

/** Delete a profile by id. */
export function deleteProfile(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const next = readAll().filter((p) => p.id !== id);
      writeAll(next);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

/** Get a single profile by id. */
export function getProfile(id: string): StoredProfile | null {
  return readAll().find((p) => p.id === id) ?? null;
}

export function updateProfileName(id: string, name: string): StoredProfile {
  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error("Profile name is required.");
  }

  const profiles = readAll();
  const targetIndex = profiles.findIndex((p) => p.id === id);

  if (targetIndex === -1) {
    throw new Error("Profile not found.");
  }

  const normalizedName = normName(cleanName);
  const duplicate = profiles.some(
    (p) => p.id !== id && normName(p.name) === normalizedName
  );

  if (duplicate) {
    throw new Error("A profile with that name already exists.");
  }

  const updatedProfile: StoredProfile = { ...profiles[targetIndex], name: cleanName };
  const nextProfiles = [...profiles];
  nextProfiles[targetIndex] = updatedProfile;
  writeAll(nextProfiles);

  return updatedProfile;
}

/** Verify password (plain for now; will swap to hashing later). */
export function verifyProfilePassword(id: string, password: string): boolean {
  const p = getProfile(id);
  if (!p) return false;
  return p.password === password;
}

/* ------------------------
   Utilities
------------------------- */

function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < 8; i++) {
    let code = "";
    for (let j = 0; j < 8; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    codes.push(code.slice(0, 4) + "-" + code.slice(4));
  }
  return codes;
}
