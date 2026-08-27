-- ==============================================================================
-- TED Upphandlingsbevakare: Supabase Database Schema with Multi-User & RLS
-- ==============================================================================

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
  );

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
