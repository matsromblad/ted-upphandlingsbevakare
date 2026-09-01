-- ==============================================================================
-- TED Upphandlingsbevakare: Supabase Database Schema with Multi-User & RLS
-- ==============================================================================

-- Om du redan har skapat tabellerna tidigare, kör dessa rader för att migrera:
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.watchlists ADD COLUMN IF NOT EXISTS email_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (email_frequency IN ('daily', 'weekly'));
ALTER TABLE IF EXISTS public.watchlists ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.watchlists ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;
ALTER TABLE IF EXISTS public.watchlist_hits ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ;

-- 1. Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  company_name TEXT DEFAULT 'WSP Sverige AB (BIM-enheten)',
  description TEXT DEFAULT 'WSP Sverige AB är ett ledande analys- och teknikkonsultföretag. BIM-enheten arbetar med BIM-samordning, digital informationshantering, 3D/4D/5D-modellering, VDC, GIS-integration, digitala tvillingar och projekteringsledning inom husbyggnad, anläggning och infrastruktur.',
  keywords TEXT DEFAULT 'BIM, BIM-samordning, VDC, Building Information Modeling, digital informationshantering, 3D-modellering, CAD, digital tvilling, projektering, samhällsbyggnad',
  preferred_cpv JSONB DEFAULT '["71300000", "71240000", "71320000", "71541000", "72224000"]'::jsonb,
  preferred_countries JSONB DEFAULT '["SWE"]'::jsonb,
  min_value BIGINT DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'user',
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Watchlists Table (User-scoped automated monitors)
CREATE TABLE IF NOT EXISTS public.watchlists (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query TEXT,
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  interval_minutes INTEGER NOT NULL DEFAULT 60,
  email_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (email_frequency IN ('daily', 'weekly')),
  last_email_sent_at TIMESTAMPTZ,
  unsubscribe_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  last_run_at TIMESTAMPTZ,
  last_hit_count INTEGER DEFAULT 0,
  new_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. Watchlist Hits Table (Discovered notices per user & watchlist)
CREATE TABLE IF NOT EXISTS public.watchlist_hits (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  watchlist_id TEXT NOT NULL REFERENCES public.watchlists(id) ON DELETE CASCADE,
  notice_id TEXT NOT NULL,
  notice_data_json JSONB NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_saved BOOLEAN NOT NULL DEFAULT false,
  emailed_at TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, watchlist_id, notice_id)
);

-- 4. Saved Tenders Table (Pipeline / Kanban case management)
CREATE TABLE IF NOT EXISTS public.saved_tenders (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notice_id TEXT NOT NULL,
  title TEXT NOT NULL,
  buyer TEXT,
  country TEXT,
  deadline TEXT,
  estimated_value TEXT,
  status TEXT NOT NULL DEFAULT 'INBOX', -- INBOX, REVIEWING, DECIDED_TO_BID, PREPARING_BID, SUBMITTED, WON, LOST, ARCHIVED
  priority TEXT NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
  notes TEXT DEFAULT '',
  internal_deadline TEXT,
  assigned_to TEXT DEFAULT '',
  tags_json JSONB DEFAULT '[]'::jsonb,
  notice_data_json JSONB NOT NULL,
  ai_analysis_json JSONB,
  saved_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, notice_id)
);

-- 5. Chat Messages Table (MiniMax AI conversation history per user)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT DEFAULT 'default',
  role TEXT NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  context_notice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 6. Hidden Notices Table (User-dismissed tenders with minimal gray display)
CREATE TABLE IF NOT EXISTS public.hidden_notices (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notice_id TEXT NOT NULL,
  reason TEXT DEFAULT 'dismissed',
  hidden_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, notice_id)
);

-- 7. Team Members Directory Table (Colleagues & assignees for delegation)
CREATE TABLE IF NOT EXISTS public.team_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  role TEXT DEFAULT 'Kollega',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- Automatic User Profile Creation Trigger on Sign Up
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = timezone('utc'::text, now());

  -- Seed initial default watchlists for the new user
  INSERT INTO public.watchlists (id, user_id, name, query, filters_json, active, interval_minutes, email_frequency)
  VALUES
    (
      'wl-' || substr(md5(random()::text), 1, 8),
      new.id,
      'BIM & Digital Informationshantering (Sverige)',
      '(buyer-country IN (SWE) OR place-of-performance IN (SWE)) AND (FT ~ (BIM) OR FT ~ (VDC) OR FT ~ (Building Information Modeling) OR FT ~ (digital tvilling)) AND form-type = competition',
      '{"keywords": "BIM OR VDC OR Building Information Modeling OR digital tvilling", "countries": ["SWE"], "formType": "competition", "datePreset": "30d"}'::jsonb,
      true,
      60,
      'daily'
    ),
    (
      'wl-' || substr(md5(random()::text), 1, 8),
      new.id,
      'BIM-samordning & Projekteringsstöd (Sverige)',
      '(buyer-country IN (SWE) OR place-of-performance IN (SWE)) AND classification-cpv IN (71300000, 71240000, 71320000) AND (FT ~ (BIM-samordnare) OR FT ~ (BIM-ledare) OR FT ~ (CAD-samordning)) AND form-type = competition',
      '{"keywords": "BIM-samordnare OR BIM-ledare OR CAD-samordning", "cpv": ["71300000", "71240000", "71320000"], "countries": ["SWE"], "formType": "competition", "datePreset": "30d"}'::jsonb,
      true,
      60,
      'daily'
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_hits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Team Members Directory: All authenticated users can view and collaborate on team members
CREATE POLICY "Allow authenticated read team_members" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert team_members" ON public.team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update team_members" ON public.team_members FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete team_members" ON public.team_members FOR DELETE USING (true);

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Watchlists: Users can manage their own watchlists
CREATE POLICY "Users can view own watchlists" ON public.watchlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own watchlists" ON public.watchlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own watchlists" ON public.watchlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own watchlists" ON public.watchlists FOR DELETE USING (auth.uid() = user_id);

-- Watchlist Hits: Users can view and update their own hits
CREATE POLICY "Users can view own hits" ON public.watchlist_hits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own hits" ON public.watchlist_hits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own hits" ON public.watchlist_hits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own hits" ON public.watchlist_hits FOR DELETE USING (auth.uid() = user_id);

-- Saved Tenders: Users can manage their own pipeline
CREATE POLICY "Users can view own saved tenders" ON public.saved_tenders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved tenders" ON public.saved_tenders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved tenders" ON public.saved_tenders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved tenders" ON public.saved_tenders FOR DELETE USING (auth.uid() = user_id);

-- Chat Messages: Users can manage their own chat history
CREATE POLICY "Users can view own chats" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chats" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chats" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

-- Hidden Notices: Users can manage their own hidden notices
CREATE POLICY "Users can view own hidden notices" ON public.hidden_notices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own hidden notices" ON public.hidden_notices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own hidden notices" ON public.hidden_notices FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- Indexes: the app's most frequent queries filter/sort by these columns. Without
-- them, watchlist_hits and saved_tenders scans get slower as rows accumulate.
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_watchlist_hits_user_discovered ON public.watchlist_hits (user_id, discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_hits_user_unread ON public.watchlist_hits (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_watchlist_hits_watchlist_discovered ON public.watchlist_hits (watchlist_id, discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_hits_pending_email ON public.watchlist_hits (watchlist_id, user_id) WHERE emailed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_saved_tenders_user_updated ON public.saved_tenders (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlists_active ON public.watchlists (active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_session ON public.chat_messages (user_id, session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_hidden_notices_user ON public.hidden_notices (user_id);

-- ==============================================================================
-- Atomic counter/multi-step RPCs
--
-- These run as SECURITY INVOKER (the default) so Row Level Security still applies using
-- the calling user's own auth.uid() — they are not a way around RLS, just a way to make
-- multi-statement or read-modify-write operations atomic instead of racy when done as
-- separate round-trips from the application (see watchlistDao.updateStats/markAsRead and
-- pipelineDao.save/delete in server/src/db.js, which call these instead of doing the
-- read-then-write themselves).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.increment_watchlist_stats(
  p_id TEXT,
  p_last_run_at TIMESTAMPTZ,
  p_hit_count INTEGER,
  p_new_count_delta INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE public.watchlists
  SET last_run_at = p_last_run_at,
      last_hit_count = p_hit_count,
      new_count = new_count + p_new_count_delta
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Only the background poller (service role) calls this; it isn't user-initiated.
REVOKE ALL ON FUNCTION public.increment_watchlist_stats(TEXT, TIMESTAMPTZ, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_watchlist_stats(TEXT, TIMESTAMPTZ, INTEGER, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.adjust_watchlist_new_count(
  p_id TEXT,
  p_delta INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE public.watchlists
  SET new_count = GREATEST(0, new_count + p_delta)
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.adjust_watchlist_new_count(TEXT, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_pipeline_tender(
  p_id TEXT,
  p_user_id UUID,
  p_notice_id TEXT,
  p_title TEXT,
  p_buyer TEXT,
  p_country TEXT,
  p_deadline TEXT,
  p_estimated_value TEXT,
  p_status TEXT,
  p_priority TEXT,
  p_notes TEXT,
  p_internal_deadline TEXT,
  p_assigned_to TEXT,
  p_tags_json JSONB,
  p_notice_data_json JSONB
) RETURNS public.saved_tenders AS $$
DECLARE
  result public.saved_tenders;
BEGIN
  INSERT INTO public.saved_tenders (
    id, user_id, notice_id, title, buyer, country, deadline, estimated_value,
    status, priority, notes, internal_deadline, assigned_to, tags_json,
    notice_data_json, updated_at
  )
  VALUES (
    p_id, p_user_id, p_notice_id, p_title, p_buyer, p_country, p_deadline, p_estimated_value,
    p_status, p_priority, p_notes, p_internal_deadline, p_assigned_to, p_tags_json,
    p_notice_data_json, timezone('utc'::text, now())
  )
  ON CONFLICT (user_id, notice_id) DO UPDATE SET
    title = EXCLUDED.title,
    buyer = EXCLUDED.buyer,
    country = EXCLUDED.country,
    deadline = EXCLUDED.deadline,
    estimated_value = EXCLUDED.estimated_value,
    status = EXCLUDED.status,
    priority = EXCLUDED.priority,
    notes = EXCLUDED.notes,
    internal_deadline = EXCLUDED.internal_deadline,
    assigned_to = EXCLUDED.assigned_to,
    tags_json = EXCLUDED.tags_json,
    notice_data_json = EXCLUDED.notice_data_json,
    updated_at = timezone('utc'::text, now())
  RETURNING * INTO result;

  UPDATE public.watchlist_hits
  SET is_saved = true
  WHERE notice_id = p_notice_id AND user_id = p_user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.save_pipeline_tender(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_pipeline_tender(
  p_id TEXT,
  p_user_id UUID
) RETURNS void AS $$
DECLARE
  v_notice_id TEXT;
BEGIN
  SELECT notice_id INTO v_notice_id FROM public.saved_tenders WHERE id = p_id AND user_id = p_user_id;

  IF v_notice_id IS NOT NULL THEN
    UPDATE public.watchlist_hits SET is_saved = false WHERE notice_id = v_notice_id AND user_id = p_user_id;
    DELETE FROM public.saved_tenders WHERE id = p_id AND user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.delete_pipeline_tender(TEXT, UUID) TO authenticated;

-- ==============================================================================
-- Cross-instance cron lock: prevents multiple server instances from polling the same
-- watchlists at the same time (each would otherwise burn TED/Magnit API quota and could
-- send duplicate digest emails). Not user data, so RLS is not enabled on this table.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cron_locks (
  id TEXT PRIMARY KEY,
  locked_until TIMESTAMPTZ,
  locked_by TEXT
);

REVOKE ALL ON public.cron_locks FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.try_acquire_cron_lock(
  p_id TEXT,
  p_ttl_seconds INTEGER,
  p_holder TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  acquired BOOLEAN := false;
BEGIN
  INSERT INTO public.cron_locks (id, locked_until, locked_by)
  VALUES (p_id, now() + (p_ttl_seconds || ' seconds')::interval, p_holder)
  ON CONFLICT (id) DO UPDATE
    SET locked_until = EXCLUDED.locked_until,
        locked_by = EXCLUDED.locked_by
    WHERE public.cron_locks.locked_until IS NULL OR public.cron_locks.locked_until < now()
  RETURNING true INTO acquired;

  RETURN COALESCE(acquired, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.try_acquire_cron_lock(TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_acquire_cron_lock(TEXT, INTEGER, TEXT) TO service_role;
