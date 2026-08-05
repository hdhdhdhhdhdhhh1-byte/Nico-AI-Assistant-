/**
 * Guest → account upgrade.
 *
 * Guests keep everything in the local runtime (temporary by design). When the
 * same person signs in on the phone, whatever Nico learned while they were a
 * guest is pushed once into their cloud memory instead of being thrown away.
 */
import type { MemoryManager } from "../memory/MemoryManager";
import { nicoSync } from "@/lib/nicoSync";

const FLAG = "nico.guest.upgraded.v1";

function alreadyUpgraded(userKey: string) {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(FLAG) === userKey;
  } catch {
    return true;
  }
}

function markUpgraded(userKey: string) {
  try {
    window.localStorage.setItem(FLAG, userKey);
  } catch {
    /* ignore */
  }
}

/**
 * Pushes local guest memories + profile into the signed-in account.
 * Safe to call repeatedly: it runs at most once per account on this device.
 */
export async function upgradeGuestData(
  memory: MemoryManager,
  userKey: string,
): Promise<{ migrated: number }> {
  if (!userKey || alreadyUpgraded(userKey)) return { migrated: 0 };
  markUpgraded(userKey);

  const records = memory.longTerm.all();
  let migrated = 0;
  for (const record of records) {
    try {
      await nicoSync.saveMemory({
        key: record.key,
        content: record.value,
        type: record.kind,
        importance: record.importance,
        retention: record.retention,
        confirmed: true,
      });
      migrated++;
    } catch {
      /* keep going; the local copy is untouched */
    }
  }

  const profile = memory.profile.data;
  if (profile.name || profile.preferredName) {
    try {
      await nicoSync.updateProfile({
        preferred_name: profile.preferredName ?? profile.name,
        language: profile.locale,
        communication_style: profile.communicationStyle,
        preferences: profile.preferences,
        interests: profile.interests,
        important_dates: profile.importantDates,
      });
    } catch {
      /* profile stays local */
    }
  }

  memory.profile.update({ isGuest: false });
  return { migrated };
}
