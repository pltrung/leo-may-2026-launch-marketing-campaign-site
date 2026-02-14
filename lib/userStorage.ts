import type { CloudType } from "./cloudData";

export interface StoredUser {
  name: string;
  email?: string;
  phone?: string;
  team: CloudType;
  timestamp: number;
}

const STORAGE_KEY = "leo_may_user";

export function saveUser(user: StoredUser): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // localStorage may be full or disabled
  }
}

export function getUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "name" in parsed &&
      typeof parsed.name === "string" &&
      "team" in parsed &&
      typeof parsed.team === "string"
    ) {
      return parsed as StoredUser;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearUser(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function findUserByEmailOrPhone(
  email?: string,
  phone?: string
): StoredUser | null {
  const user = getUser();
  if (!user) return null;
  const e = (email || "").trim().toLowerCase();
  const p = (phone || "").trim().replace(/\s/g, "");
  const userEmail = (user.email || "").trim().toLowerCase();
  const userPhone = (user.phone || "").trim().replace(/\s/g, "");
  if (e && userEmail && e === userEmail) return user;
  if (p && userPhone && p === userPhone) return user;
  return null;
}
