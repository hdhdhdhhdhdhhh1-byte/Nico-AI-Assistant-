CREATE TABLE public.voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  duration numeric NOT NULL DEFAULT 0,
  language text NOT NULL DEFAULT 'ar',
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_sessions TO authenticated;
GRANT ALL ON public.voice_sessions TO service_role;

ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own voice sessions" ON public.voice_sessions
  FOR ALL TO authenticated
  USING (user_id IN (SELECT users.id FROM public.users WHERE users.auth_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT users.id FROM public.users WHERE users.auth_id = auth.uid()));

CREATE INDEX voice_sessions_user_idx ON public.voice_sessions(user_id, created_at DESC);

CREATE TABLE public.voice_preferences (
  user_id uuid PRIMARY KEY,
  voice_name text NOT NULL DEFAULT 'alloy',
  speed numeric NOT NULL DEFAULT 1.0,
  tone text NOT NULL DEFAULT 'friendly',
  language text NOT NULL DEFAULT 'ar',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_preferences TO authenticated;
GRANT ALL ON public.voice_preferences TO service_role;

ALTER TABLE public.voice_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own voice preferences" ON public.voice_preferences
  FOR ALL TO authenticated
  USING (user_id IN (SELECT users.id FROM public.users WHERE users.auth_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT users.id FROM public.users WHERE users.auth_id = auth.uid()));

CREATE TRIGGER voice_preferences_touch
  BEFORE UPDATE ON public.voice_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();