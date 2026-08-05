import type { Skill } from "../../shared/types";

const CODE_AR: Record<number, string> = {
  0: "صافي",
  1: "صافي جزئياً",
  2: "غائم جزئياً",
  3: "غائم",
  45: "ضباب",
  48: "ضباب كثيف",
  51: "رذاذ خفيف",
  61: "مطر خفيف",
  63: "مطر",
  65: "مطر غزير",
  71: "ثلج خفيف",
  80: "زخات مطر",
  95: "عاصفة رعدية",
};

const describe = (code: number) => CODE_AR[code] ?? "متقلب";

/**
 * Live weather + multi-day forecast via Open-Meteo (keyless).
 * Uses device location when the user granted the permission.
 */
export const WeatherSkill: Skill = {
  id: "weather",
  name: "الطقس",
  description: "يجلب حالة الطقس الحالية وتوقعات الأيام القادمة",
  intents: ["weather"],
  permissions: ["location"],
  category: "معلومات",
  async execute({ intent }) {
    const coords = await getCoords();
    if (!coords) return { ok: false, speech: "", error: "no_location" };
    const wantsForecast = /غدا|غداً|بكرة|الأيام|الاسبوع|الأسبوع|توقع|forecast|tomorrow|week/i.test(
      intent.raw,
    );
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
          `&current=temperature_2m,wind_speed_10m,weather_code` +
          `&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=4&timezone=auto`,
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        current: { temperature_2m: number; wind_speed_10m: number; weather_code: number };
        daily?: {
          time: string[];
          temperature_2m_max: number[];
          temperature_2m_min: number[];
          weather_code: number[];
        };
      };

      const current = `الطقس عندك الآن ${describe(data.current.weather_code)}، ${Math.round(
        data.current.temperature_2m,
      )} درجة والرياح ${Math.round(data.current.wind_speed_10m)} كم بالساعة.`;

      if (!wantsForecast || !data.daily) {
        return {
          ok: true,
          speech: current,
          data: data.current as unknown as Record<string, unknown>,
        };
      }

      const days = data.daily.time.slice(1, 4).map((iso, i) => {
        const label = new Date(iso).toLocaleDateString("ar", { weekday: "long" });
        return `${label}: ${describe(data.daily!.weather_code[i + 1])} بين ${Math.round(
          data.daily!.temperature_2m_min[i + 1],
        )} و${Math.round(data.daily!.temperature_2m_max[i + 1])} درجة`;
      });

      return {
        ok: true,
        speech: `${current} التوقعات: ${days.join("، ")}.`,
        data: { current: data.current, days: days.length },
      };
    } catch (e) {
      return { ok: false, speech: "", error: String(e) };
    }
  },
};

function getCoords(): Promise<{ lat: number; lon: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(null),
      { timeout: 6000 },
    );
  });
}
