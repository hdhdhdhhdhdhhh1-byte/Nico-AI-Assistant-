import type { UserProfile } from "../memory/UserProfile";
import type { CommunicationStyle } from "../shared/types";

export interface LearningSignal {
  applied: boolean;
  change?: string;
}

const CONCISE_RE = /(?:لا تستخدم كلمات كثيرة|كن مختصر|اختصر|be concise|shorter answers?)/i;
const DETAILED_RE = /(?:اشرح أكثر|بالتفصيل|explain more|more detail)/i;
const NAME_ME_RE = /(?:نادني(?:\s+يا)?|call me)\s+([\u0600-\u06FFA-Za-z]+)/i;
const FORMAL_RE = /(?:رسميّاً|بشكل رسمي|be formal|more formal)/i;
const PLAYFUL_RE = /(?:مرِح|كن مرحاً|be playful|funny)/i;

/**
 * Learning Engine.
 * Watches user utterances for corrections and adjusts the persistent
 * profile (communication style, preferred name, tone) accordingly.
 */
export class LearningEngine {
  constructor(private readonly profile: UserProfile) {}

  observe(text: string): LearningSignal {
    const t = text.trim();
    if (!t) return { applied: false };

    if (CONCISE_RE.test(t)) return this.setStyle("concise");
    if (DETAILED_RE.test(t)) return this.setStyle("detailed");

    const name = t.match(NAME_ME_RE);
    if (name) {
      this.profile.update({ preferredName: name[1] });
      return { applied: true, change: `preferredName=${name[1]}` };
    }

    if (FORMAL_RE.test(t)) {
      this.profile.update({ personality: { ...this.profile.data.personality, tone: "formal" } });
      return { applied: true, change: "tone=formal" };
    }
    if (PLAYFUL_RE.test(t)) {
      this.profile.update({ personality: { ...this.profile.data.personality, tone: "playful" } });
      return { applied: true, change: "tone=playful" };
    }

    return { applied: false };
  }

  private setStyle(style: CommunicationStyle): LearningSignal {
    this.profile.setCommunicationStyle(style);
    return { applied: true, change: `communicationStyle=${style}` };
  }
}
