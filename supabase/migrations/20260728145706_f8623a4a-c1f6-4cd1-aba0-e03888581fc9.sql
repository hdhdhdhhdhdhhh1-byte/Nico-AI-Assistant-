CREATE TABLE public.voice_settings (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  voice_id text NOT NULL DEFAULT 'alloy',
  speed numeric NOT NULL DEFAULT 1.0,
  pitch numeric NOT NULL DEFAULT 1.0,
  style text NOT NULL DEFAULT 'friendly',
  language text NOT NULL DEFAULT 'ar',
  wake_word text NOT NULL DEFAULT 'يا نيكو',
  wake_word_enabled boolean NOT NULL DEFAULT false,
  auto_greeting boolean NOT NULL DEFAULT true,
  always_ready boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_settings TO authenticated;
GRANT ALL ON public.voice_settings TO service_role;
ALTER TABLE public.voice_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own voice settings" ON public.voice_settings FOR ALL TO authenticated
USING (user_id IN (SELECT users.id FROM public.users WHERE users.auth_id = auth.uid()))
WITH CHECK (user_id IN (SELECT users.id FROM public.users WHERE users.auth_id = auth.uid()));
CREATE TRIGGER voice_settings_touch BEFORE UPDATE ON public.voice_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.device_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission text NOT NULL,
  status text NOT NULL DEFAULT 'prompt',
  platform text NOT NULL DEFAULT 'web',
  device_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission, platform)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_permissions TO authenticated;
GRANT ALL ON public.device_permissions TO service_role;
ALTER TABLE public.device_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own device permissions" ON public.device_permissions FOR ALL TO authenticated
USING (user_id IN (SELECT users.id FROM public.users WHERE users.auth_id = auth.uid()))
WITH CHECK (user_id IN (SELECT users.id FROM public.users WHERE users.auth_id = auth.uid()));
CREATE TRIGGER device_permissions_touch BEFORE UPDATE ON public.device_permissions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.assistant_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  detail text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_events TO authenticated;
GRANT ALL ON public.assistant_events TO service_role;
ALTER TABLE public.assistant_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assistant events" ON public.assistant_events FOR ALL TO authenticated
USING (user_id IN (SELECT users.id FROM public.users WHERE users.auth_id = auth.uid()))
WITH CHECK (user_id IN (SELECT users.id FROM public.users WHERE users.auth_id = auth.uid()));
CREATE INDEX assistant_events_user_created_idx ON public.assistant_events (user_id, created_at DESC);