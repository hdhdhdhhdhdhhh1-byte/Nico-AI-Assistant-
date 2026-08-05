import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useNico } from "@/hooks/useNico";
import { nicoSync } from "@/lib/nicoSync";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Activity,
  Brain,
  Database,
  Download,
  Heart,
  KeyRound,
  MessageCircle,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "مركز نيكو الشخصي — ذاكرتك، شخصيتك، محادثاتك" },
      {
        name: "description",
        content:
          "مركز التحكم الشخصي لنيكو: أدر ذاكرتك، شخصية نيكو، محادثاتك السابقة، وسجل التعلم والخصوصية.",
      },
      { property: "og:title", content: "مركز نيكو الشخصي" },
      {
        property: "og:description",
        content: "ذاكرة نيكو، الشخصية، المحادثات، التعلم والخصوصية في مكان واحد.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type Kind = "profile" | "preference" | "habit" | "fact" | "event";

const KIND_LABELS: Record<Kind, string> = {
  profile: "معلومات شخصية",
  preference: "تفضيلات",
  habit: "عادات",
  fact: "حقائق",
  event: "تواريخ مهمة",
};

function Dashboard() {
  const nico = useNico();

  return (
    <main dir="rtl" className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6">
      <DashHeader email={nico.authEmail} onSignOut={nico.signOut} />

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-secondary/40 p-1">
          <TabsTrigger value="overview" className="gap-1">
            <Activity className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="memory" className="gap-1">
            <Database className="h-4 w-4" />
            ذاكرتي
          </TabsTrigger>
          <TabsTrigger value="personality" className="gap-1">
            <Sparkles className="h-4 w-4" />
            الشخصية
          </TabsTrigger>
          <TabsTrigger value="conversations" className="gap-1">
            <MessageCircle className="h-4 w-4" />
            المحادثات
          </TabsTrigger>
          <TabsTrigger value="learning" className="gap-1">
            <Brain className="h-4 w-4" />
            ما تعلّمه
          </TabsTrigger>
          <TabsTrigger value="identity" className="gap-1">
            <Heart className="h-4 w-4" />
            من نيكو؟
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-1">
            <Shield className="h-4 w-4" />
            الخصوصية
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab nico={nico} />
        </TabsContent>
        <TabsContent value="memory" className="mt-4">
          <MemoryTab nico={nico} />
        </TabsContent>
        <TabsContent value="personality" className="mt-4">
          <PersonalityTab nico={nico} />
        </TabsContent>
        <TabsContent value="conversations" className="mt-4">
          <ConversationsTab />
        </TabsContent>
        <TabsContent value="learning" className="mt-4">
          <LearningTab />
        </TabsContent>
        <TabsContent value="identity" className="mt-4">
          <IdentityTab nico={nico} />
        </TabsContent>
        <TabsContent value="privacy" className="mt-4">
          <PrivacyTab nico={nico} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function DashHeader({ email, onSignOut }: { email: string | null; onSignOut: () => void }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">مركز نيكو الشخصي</h1>
          <p className="text-xs text-muted-foreground">{email ?? "متصل"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← العودة لنيكو
        </Link>
        <Button variant="outline" size="sm" onClick={onSignOut}>
          خروج
        </Button>
      </div>
    </header>
  );
}

/* ==========================================================
 * 1. Overview
 * ========================================================== */
function OverviewTab({ nico }: { nico: ReturnType<typeof useNico> }) {
  const stats = useMemo(() => {
    const byKind: Record<string, number> = {};
    for (const m of nico.memories) byKind[m.kind] = (byKind[m.kind] ?? 0) + 1;
    return byKind;
  }, [nico.memories]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">حالة نيكو</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="الحالة" value={<Badge variant="secondary">{nico.state}</Badge>} />
          <Row label="آخر نية" value={nico.lastIntent ?? "—"} />
          <Row label="الموضوع النشط" value={nico.activeTopic?.label ?? "—"} />
          <Row label="المهارات" value={String(nico.skills.length)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ملفك الشخصي</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="الاسم" value={nico.profile.preferredName ?? nico.profile.name ?? "—"} />
          <Row label="اللغة" value={nico.profile.locale === "ar" ? "العربية" : "English"} />
          <Row label="أسلوب التواصل" value={styleLabel(nico.profile.communicationStyle)} />
          <Row label="نبرة" value={toneLabel(nico.profile.personality.tone)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ملخص الذاكرة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="إجمالي" value={String(nico.memories.length)} />
          {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
            <Row key={k} label={KIND_LABELS[k]} value={String(stats[k] ?? 0)} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">آخر النشاط</CardTitle>
        </CardHeader>
        <CardContent>
          {nico.turns.length ? (
            <ul className="space-y-2 text-sm">
              {nico.turns
                .slice(-5)
                .reverse()
                .map((t) => (
                  <li key={t.id} className="rounded-lg bg-secondary/50 px-3 py-2">
                    <span className="text-xs text-muted-foreground">
                      {t.role === "user" ? "أنت" : "نيكو"}:{" "}
                    </span>
                    {t.content}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">لا نشاط بعد.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

/* ==========================================================
 * 2. Memory
 * ========================================================== */
function MemoryTab({ nico }: { nico: ReturnType<typeof useNico> }) {
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<Kind | "all">("all");

  const filtered = useMemo(() => {
    return nico.memories.filter((m) => {
      if (kindFilter !== "all" && m.kind !== kindFilter) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return m.value.toLowerCase().includes(s) || m.key.toLowerCase().includes(s);
    });
  }, [nico.memories, q, kindFilter]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof filtered> = {};
    for (const m of filtered) (g[m.kind] ??= []).push(m);
    return g;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ذاكرتي مع نيكو</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ابحث في ذاكرتك…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as Kind | "all")}>
              <SelectTrigger className="sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفئات</SelectItem>
                {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {KIND_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {Object.keys(grouped).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا توجد ذكريات مطابقة.</p>
          ) : (
            <div className="space-y-4">
              {(Object.keys(grouped) as Kind[]).map((kind) => (
                <div key={kind}>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline">{KIND_LABELS[kind] ?? kind}</Badge>
                    <span className="text-xs text-muted-foreground">{grouped[kind].length}</span>
                  </div>
                  <ul className="space-y-2">
                    {grouped[kind].map((m) => (
                      <MemoryItem
                        key={m.id}
                        id={m.id}
                        keyLabel={m.key}
                        value={m.value}
                        onDelete={() => nico.deleteMemory(m.id)}
                        onEdit={async (patch) => {
                          try {
                            await nicoSync.updateMemory(m.id, patch);
                            toast.success("تم التحديث");
                          } catch {
                            toast.error("تعذر التحديث");
                          }
                        }}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MemoryItem({
  id: _id,
  keyLabel,
  value,
  onDelete,
  onEdit,
}: {
  id: string;
  keyLabel: string;
  value: string;
  onDelete: () => void;
  onEdit: (patch: { content?: string; key?: string }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(value);
  const [key, setKey] = useState(keyLabel);
  return (
    <li className="flex items-start gap-2 rounded-lg bg-secondary/50 px-3 py-2">
      <div className="flex-1 text-sm">
        <div className="text-xs text-muted-foreground">{keyLabel}</div>
        <div>{value}</div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="ghost">
            تعديل
          </Button>
        </DialogTrigger>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل الذاكرة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>المفتاح</Label>
              <Input value={key} onChange={(e) => setKey(e.target.value)} />
            </div>
            <div>
              <Label>المحتوى</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={async () => {
                  await onEdit({ content, key });
                  setOpen(false);
                }}
              >
                حفظ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Button size="sm" variant="ghost" onClick={onDelete}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </li>
  );
}

/* ==========================================================
 * 3. Personality
 * ========================================================== */
function styleLabel(s: string) {
  return s === "concise" ? "قصير" : s === "balanced" ? "متوازن" : "مفصّل";
}
function toneLabel(t: string) {
  return t === "friendly" ? "ودود" : t === "formal" ? "رسمي" : t === "playful" ? "مرِح" : t;
}

function PersonalityTab({ nico }: { nico: ReturnType<typeof useNico> }) {
  const p = nico.profile;
  const [name, setName] = useState(p.preferredName ?? p.name ?? "");
  const [style, setStyle] = useState(p.communicationStyle);
  const [tone, setTone] = useState(p.personality.tone);
  const [voice, setVoice] = useState<"simple" | "emotional" | "formal">(
    (p.preferences.responseTone as "simple" | "emotional" | "formal") ?? "simple",
  );
  const [personaTrait, setPersonaTrait] = useState<string>(
    p.personality.traits.find((t) => ["friendly", "professional", "funny", "calm"].includes(t)) ??
      "friendly",
  );

  const save = async () => {
    const traits = Array.from(
      new Set([
        ...p.personality.traits.filter(
          (t) => !["friendly", "professional", "funny", "calm"].includes(t),
        ),
        personaTrait,
      ]),
    );
    nico.updateProfile({
      preferredName: name || undefined,
      communicationStyle: style,
      personality: { ...p.personality, tone, traits },
      preferences: { ...p.preferences, responseTone: voice },
    });
    toast.success("تم حفظ الإعدادات");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">تخصيص شخصية نيكو</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label>الاسم الذي تحب أن يناديك به نيكو</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: أحمد" />
        </div>

        <div className="space-y-2">
          <Label>أسلوب التواصل</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["concise", "balanced", "detailed"] as const).map((s) => (
              <Button
                key={s}
                type="button"
                variant={style === s ? "default" : "outline"}
                onClick={() => setStyle(s)}
                className="h-auto flex-col gap-0 py-3"
              >
                <span>{styleLabel(s)}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>الشخصية</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { v: "friendly", l: "ودود" },
              { v: "professional", l: "احترافي" },
              { v: "funny", l: "مرِح" },
              { v: "calm", l: "هادئ" },
            ].map((o) => (
              <Button
                key={o.v}
                type="button"
                variant={personaTrait === o.v ? "default" : "outline"}
                onClick={() => setPersonaTrait(o.v)}
              >
                {o.l}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>نبرة الرد</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: "simple", l: "بسيطة" },
              { v: "emotional", l: "عاطفية" },
              { v: "formal", l: "رسمية" },
            ].map((o) => (
              <Button
                key={o.v}
                type="button"
                variant={voice === o.v ? "default" : "outline"}
                onClick={() => setVoice(o.v as typeof voice)}
              >
                {o.l}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>النغمة العامة</Label>
          <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="friendly">ودودة</SelectItem>
              <SelectItem value="formal">رسمية</SelectItem>
              <SelectItem value="playful">مرحة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end">
          <Button onClick={save}>حفظ التغييرات</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ==========================================================
 * 4. Conversations
 * ========================================================== */
type ConvRow = { id: string; title: string | null; created_at: string; updated_at: string };
type MsgRow = {
  id: string;
  role: "user" | "nico";
  content: string;
  intent: string | null;
  created_at: string;
};

function ConversationsTab() {
  const [items, setItems] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<ConvRow | null>(null);
  const [messages, setMessages] = useState<MsgRow[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = (await nicoSync.listConversations()) as ConvRow[];
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = items.filter(
    (c) => !q.trim() || (c.title ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const openConv = async (c: ConvRow) => {
    setOpen(c);
    const rows = (await nicoSync.listMessages(c.id)) as MsgRow[];
    setMessages(rows);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">محادثاتك السابقة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ابحث في المحادثات…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pr-9"
          />
        </div>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">جاري التحميل…</p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">لا محادثات بعد.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {c.title ?? `محادثة ${new Date(c.created_at).toLocaleDateString("ar")}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    آخر تحديث {new Date(c.updated_at).toLocaleString("ar")}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => openConv(c)}>
                  فتح
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
          <DialogContent dir="rtl" className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{open?.title ?? "محادثة"}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-2">
              <div className="space-y-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      m.role === "user" ? "bg-primary/10" : "bg-secondary/60"
                    }`}
                  >
                    <div className="mb-1 text-xs text-muted-foreground">
                      {m.role === "user" ? "أنت" : "نيكو"} ·{" "}
                      {new Date(m.created_at).toLocaleTimeString("ar")}
                    </div>
                    {m.content}
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    لا رسائل في هذه المحادثة.
                  </p>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/* ==========================================================
 * 5. Learning
 * ========================================================== */
type LearnRow = {
  id: string;
  signal_type: string;
  correction: string | null;
  learned_preference: Record<string, unknown> | null;
  confidence: number;
  created_at: string;
};

function LearningTab() {
  const [items, setItems] = useState<LearnRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = (await nicoSync.listLearning()) as LearnRow[];
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const remove = async (id: string) => {
    await nicoSync.deleteLearning(id);
    setItems((prev) => prev.filter((r) => r.id !== id));
    toast.success("تم الحذف");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ما تعلّمه نيكو عنك</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">جاري التحميل…</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            لم يسجّل نيكو أي تعلّم بعد. صحّح أسلوبه في المحادثة وسيتكيّف تلقائياً.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((r) => (
              <li key={r.id} className="rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{r.signal_type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        ثقة {(r.confidence * 100).toFixed(0)}٪
                      </span>
                    </div>
                    {r.correction && (
                      <div className="mt-1 text-muted-foreground">قلتَ: «{r.correction}»</div>
                    )}
                    <div className="mt-1 text-xs">
                      {new Date(r.created_at).toLocaleString("ar")}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ==========================================================
 * 6. Identity — Who is Nico
 * ========================================================== */
function IdentityTab({ nico }: { nico: ReturnType<typeof useNico> }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">من هو نيكو؟</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>
            نيكو مساعدك الشخصي الذي يعرفك ويتذكّرك. شخصيته ثابتة: ودود، مهذّب، محترم، ومختصر في
            ردوده لأنه يتحدّث إليك صوتياً. يتكيّف مع أسلوبك دون أن يفقد هويّته.
          </p>
          <p className="text-muted-foreground">
            كل ما يتعلّمه عنك يبقى ملكك — تستطيع مراجعته وتعديله وحذفه في أي وقت.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">القدرات والمهارات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {nico.skills.map((s) => (
              <div key={s.id} className="rounded-lg bg-secondary/50 p-3">
                <div className="font-medium">{s.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.description}</div>
                <div className="mt-2 text-xs text-accent">{s.intents.join(" · ")}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">حالة الذاكرة والخصوصية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="ذكريات محفوظة" value={String(nico.memories.length)} />
          <Row
            label="الأذونات النشطة"
            value={String(Object.values(nico.permissions).filter((p) => p === "granted").length)}
          />
          <Separator className="my-2" />
          <p className="text-xs text-muted-foreground">
            جميع بياناتك محميّة عبر سياسات RLS ومرتبطة بحسابك وحده.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ==========================================================
 * 7. Privacy
 * ========================================================== */
function PrivacyTab({ nico }: { nico: ReturnType<typeof useNico> }) {
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(
    (nico.profile.preferences.memoryEnabled ?? "true") !== "false",
  );
  const [busy, setBusy] = useState(false);

  const toggleMemory = (v: boolean) => {
    setMemoryEnabled(v);
    nico.updateProfile({ preferences: { ...nico.profile.preferences, memoryEnabled: String(v) } });
    toast.success(v ? "الذاكرة مُفعّلة" : "الذاكرة موقوفة");
  };

  const exportAll = async () => {
    setBusy(true);
    try {
      const data = await nicoSync.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nico-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل بياناتك");
    } catch {
      toast.error("تعذّر التصدير");
    } finally {
      setBusy(false);
    }
  };

  const wipeAll = async () => {
    setBusy(true);
    try {
      await nicoSync.deleteAllMemories();
      await nico.forgetAll();
      toast.success("تم مسح كل الذكريات");
    } catch {
      toast.error("تعذّر المسح");
    } finally {
      setBusy(false);
    }
  };

  const deleteAcc = async () => {
    setBusy(true);
    try {
      await nicoSync.deleteAccount();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      toast.error("تعذّر حذف الحساب");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">التحكم في الذاكرة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">تفعيل الذاكرة</Label>
              <p className="text-xs text-muted-foreground">
                عند الإيقاف لن يحفظ نيكو أي معلومات جديدة عنك.
              </p>
            </div>
            <Switch checked={memoryEnabled} onCheckedChange={toggleMemory} />
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm">تصدير بياناتك</Label>
              <p className="text-xs text-muted-foreground">تنزيل ملف JSON بكل ما يعرفه نيكو عنك.</p>
            </div>
            <Button variant="outline" onClick={exportAll} disabled={busy}>
              <Download className="ml-2 h-4 w-4" />
              تصدير
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm">مسح كل الذكريات</Label>
              <p className="text-xs text-muted-foreground">
                حذف كل ما تعلّمه نيكو عنك، مع إبقاء الحساب.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">مسح</Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    سيتم حذف كل ذكرياتك مع نيكو نهائياً. لا يمكن التراجع عن هذا الإجراء.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={wipeAll}>نعم، امسح الكل</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-destructive">حذف الحساب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            سيتم حذف حسابك وكل البيانات المرتبطة به نهائياً.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={busy}>
                <Trash2 className="ml-2 h-4 w-4" />
                حذف حسابي نهائياً
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>حذف الحساب نهائياً</AlertDialogTitle>
                <AlertDialogDescription>
                  ستفقد جميع محادثاتك، ذكرياتك، وإعدادات نيكو. لا يمكن استرجاع الحساب بعد الحذف.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteAcc}
                  className="bg-destructive text-destructive-foreground"
                >
                  حذف نهائي
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
const _icons = { User, KeyRound, Settings2 };
