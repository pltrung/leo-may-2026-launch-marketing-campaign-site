"use client";

import { useCallback, useMemo, useState } from "react";
import { getUser, saveUser, clearUser, type StoredUser, type IdentifierType } from "./userStorage";
import type { CloudType } from "./cloudData";

export interface WaitlistIdentity {
  /** Current user from storage (name, team, referralCode, etc.) */
  user: StoredUser | null;
  /** Whether identity (email or phone) is locked and cannot be edited without "Change" */
  locked: boolean;
  /** The single identifier value (email or E.164 phone) when locked */
  identifier: string | null;
  /** Which type was chosen when locked */
  identifier_type: IdentifierType | null;
  /** Clear identity and user (for "Change" flow); caller should redirect or reset to step 0 */
  changeIdentity: () => void;
  /** Persist locked identity after upsert-identity success */
  setLockedIdentity: (opts: { identifier: string; identifier_type: IdentifierType; name: string; team: CloudType; referralCode?: string }) => void;
  /** Re-read from storage (e.g. after verification) */
  refresh: () => void;
}

/**
 * Single source for waitlist identity state.
 * Both SignupModal (first-time) and KnowYourTeamModal (lookup) should use this so entry points converge.
 */
export function useWaitlistIdentity(): WaitlistIdentity {
  const [user, setUser] = useState<StoredUser | null>(() => getUser());

  const refresh = useCallback(() => {
    setUser(getUser());
  }, []);

  const locked = user?.locked === true && !!(user?.identifier && user?.identifier_type);
  const identifier = user?.identifier ?? null;
  const identifier_type = user?.identifier_type ?? null;

  const changeIdentity = useCallback(() => {
    clearUser();
    setUser(null);
  }, []);

  const setLockedIdentity = useCallback(
    (opts: { identifier: string; identifier_type: IdentifierType; name: string; team: CloudType; referralCode?: string }) => {
      const next: StoredUser = {
        ...user,
        name: opts.name,
        team: opts.team,
        identifier: opts.identifier,
        identifier_type: opts.identifier_type,
        email: opts.identifier_type === "email" ? opts.identifier : undefined,
        phone: opts.identifier_type === "phone" ? opts.identifier : undefined,
        referralCode: opts.referralCode ?? user?.referralCode,
        timestamp: Date.now(),
        locked: true,
      };
      saveUser(next);
      setUser(next);
    },
    [user]
  );

  return useMemo(
    () => ({
      user,
      locked,
      identifier,
      identifier_type,
      changeIdentity,
      setLockedIdentity,
      refresh,
    }),
    [user, locked, identifier, identifier_type, changeIdentity, setLockedIdentity, refresh]
  );
}
