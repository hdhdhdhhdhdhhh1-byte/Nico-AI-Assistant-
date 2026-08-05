import type { PermissionKey, PermissionState } from "@/packages/shared/types";

const LABELS: Record<PermissionKey, string> = {
  microphone: "الميكروفون",
  location: "الموقع",
  files: "الملفات",
  camera: "الكاميرا",
  notifications: "الإشعارات",
  background_audio: "الصوت في الخلفية",
  bluetooth: "البلوتوث",
  contacts: "جهات الاتصال",
};

export function PermissionsBar({
  permissions,
  onRequest,
  onRevoke,
}: {
  permissions: Record<PermissionKey, PermissionState>;
  onRequest: (key: PermissionKey) => void;
  onRevoke: (key: PermissionKey) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {(Object.keys(LABELS) as PermissionKey[]).map((key) => {
        const state = permissions[key];
        const granted = state === "granted";
        return (
          <button
            key={key}
            type="button"
            onClick={() => (granted ? onRevoke(key) : onRequest(key))}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              granted
                ? "border-accent/50 bg-accent/15 text-accent"
                : state === "denied"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {LABELS[key]} · {granted ? "مسموح" : state === "denied" ? "مرفوض" : "بانتظار الإذن"}
          </button>
        );
      })}
    </div>
  );
}
