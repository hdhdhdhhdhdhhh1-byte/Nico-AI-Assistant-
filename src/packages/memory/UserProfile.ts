import type {
  CommunicationStyle,
  ImportantDate,
  PersonalityProfile,
  UserProfileData,
} from "../shared/types";

const KEY = "nico.profile.v1";

export const DEFAULT_PERSONALITY: PersonalityProfile = {
  traits: ["friendly", "helpful", "respectful"],
  tone: "friendly",
  verbosity: "concise",
  respectful: true,
};

function defaults(): UserProfileData {
  return {
    id: crypto.randomUUID(),
    locale: "ar",
    voice: "alloy",
    isGuest: true,
    createdAt: Date.now(),
    preferences: {},
    interests: [],
    importantDates: [],
    communicationStyle: "concise",
    personality: { ...DEFAULT_PERSONALITY },
  };
}

export class UserProfile {
  data: UserProfileData;

  constructor(seed?: Partial<UserProfileData>) {
    this.data = { ...defaults(), ...seed };
    this.load();
  }

  private load() {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserProfileData>;
        this.data = {
          ...this.data,
          ...parsed,
          preferences: { ...this.data.preferences, ...(parsed.preferences ?? {}) },
          interests: parsed.interests ?? this.data.interests,
          importantDates: parsed.importantDates ?? this.data.importantDates,
          personality: { ...this.data.personality, ...(parsed.personality ?? {}) },
        };
      }
    } catch {
      /* ignore */
    }
  }

  private persist() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* ignore */
    }
  }

  update(patch: Partial<UserProfileData>) {
    this.data = {
      ...this.data,
      ...patch,
      preferences: { ...this.data.preferences, ...(patch.preferences ?? {}) },
      personality: { ...this.data.personality, ...(patch.personality ?? {}) },
    };
    this.persist();
    return this.data;
  }

  setPreference(key: string, value: string) {
    this.data.preferences[key] = value;
    this.persist();
  }

  addInterest(interest: string) {
    const norm = interest.trim();
    if (!norm) return;
    if (!this.data.interests.includes(norm)) {
      this.data.interests.push(norm);
      this.persist();
    }
  }

  addImportantDate(entry: ImportantDate) {
    this.data.importantDates.push(entry);
    this.persist();
  }

  setCommunicationStyle(style: CommunicationStyle) {
    this.data.communicationStyle = style;
    this.data.personality.verbosity = style;
    this.persist();
  }

  register(name?: string) {
    this.data.isGuest = false;
    if (name) this.data.name = name;
    this.persist();
  }

  reset() {
    this.data = defaults();
    this.persist();
  }
}
