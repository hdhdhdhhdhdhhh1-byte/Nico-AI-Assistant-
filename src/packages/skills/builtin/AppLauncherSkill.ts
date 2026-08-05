import type { Skill } from "../../shared/types";
import { mobileBridge } from "../../mobile-bridge";

const APP_PACKAGES: Record<string, string> = {
  كاميرا: "com.android.camera",
  الكاميرا: "com.android.camera",
  واتساب: "com.whatsapp",
  الواتساب: "com.whatsapp",
  إعدادات: "com.android.settings",
  الإعدادات: "com.android.settings",
  متصفح: "com.android.chrome",
  المتصفح: "com.android.chrome",
  كروم: "com.android.chrome",
  الهاتف: "com.google.android.dialer",
  الملاحظات: "com.nico.ai.notes",
};

export const AppLauncherSkill: Skill = {
  id: "app_launcher",
  name: "مشغل التطبيقات",
  description: "يفتح التطبيقات المثبتة على النظام هاتفياً",
  intents: ["open_app"],
  category: "نظام",
  async execute({ intent }) {
    const raw = intent.raw.trim();
    const appName =
      intent.entities.target || raw.replace(/(?:افتح|شغل|open)\s*(?:تطبيق)?/i, "").trim();

    if (!appName) {
      return { ok: false, speech: "ما هو التطبيق الذي تريد فتحه؟", error: "missing_app" };
    }

    const bridge = mobileBridge();
    const packageName = APP_PACKAGES[appName.toLowerCase()] || appName;

    const success = await bridge.apps.openApp(packageName);
    if (success) {
      return {
        ok: true,
        speech: `جاري فتح ${appName}...`,
        data: { appName, packageName },
      };
    }

    // Fallback if URL or web
    if (/http/i.test(appName)) {
      await bridge.apps.openUrl(appName);
      return { ok: true, speech: `جاري فتح الرابط: ${appName}` };
    }

    return {
      ok: true,
      speech: `جاري فتح تطبيق ${appName}...`,
      data: { appName },
    };
  },
};
