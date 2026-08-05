import type { Skill } from "../../shared/types";
import { automationEngine } from "../../tasks/AutomationEngine";

export const SmartHomeSkill: Skill = {
  id: "smart_home",
  name: "المنزل الذكي",
  description: "يتحكم بأجهزة المنزل عبر محرك الأتمتة",
  intents: ["smart_home"],
  permissions: ["files"],
  async execute({ intent }) {
    const on = /شغل|افتح|turn on/i.test(intent.raw);
    const device = /مكيف|ac/i.test(intent.raw) ? "المكيف" : "الإضاءة";
    automationEngine.setDevice(device, on);
    return { ok: true, speech: `${on ? "شغّلت" : "أطفأت"} ${device}.`, data: { device, on } };
  },
};
