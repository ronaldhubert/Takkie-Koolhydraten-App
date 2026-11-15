-- ============================================================================
-- TAKKIE & SIEP KETO TRACKER: TEAMS & REALTIME CHAT SETUP VOOR SUPABASE
-- Plak dit script in de Supabase SQL Editor en klik op "Run"
-- ============================================================================

-- 1. Maak de 'teams' tabel ("Takkie's Roeleketoe Clubjes")
create table if not exists public.teams (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    invite_code text unique not null,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz default now()
);

-- 2. Voeg team- en profielvelden toe aan 'profiles'
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists pet_choice text default 'takkie';
alter table public.profiles add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.profiles add column if not exists streak integer default 0;

-- 3. Maak de 'team_messages' tabel ("Takkie & Siep's Huiskamer")
create table if not exists public.team_messages (
    id uuid primary key default gen_random_uuid(),
    team_id uuid not null references public.teams(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    sender_name text not null,
    sender_pet text default 'takkie',
    msg_type text default 'text', -- 'text', 'reaction', 'system', 'sos', 'recipe'
    content text not null,
    recipe_payload jsonb,
    created_at timestamptz default now()
);

-- 4. Zet Row Level Security (RLS) aan
alter table public.teams enable row level security;
alter table public.team_messages enable row level security;

-- 5. RLS Policies voor 'teams' (ingelogde gebruikers mogen clubjes maken en zoeken op code)
drop policy if exists "Ingelogde gebruikers mogen teams lezen" on public.teams;
create policy "Ingelogde gebruikers mogen teams lezen"
on public.teams for select to authenticated using (true);

drop policy if exists "Ingelogde gebruikers mogen teams aanmaken" on public.teams;
create policy "Ingelogde gebruikers mogen teams aanmaken"
on public.teams for insert to authenticated with check (true);

-- 6. RLS Policies voor 'team_messages' (leden lezen en sturen berichten in hun clubje)
drop policy if exists "Teamleden mogen berichten lezen" on public.team_messages;
create policy "Teamleden mogen berichten lezen"
on public.team_messages for select to authenticated using (true);

drop policy if exists "Teamleden mogen berichten sturen" on public.team_messages;
create policy "Teamleden mogen berichten sturen"
on public.team_messages for insert to authenticated with check (true);

-- 7. Zorg dat teamleden elkaars voortgang (profiles, daily_logs, meals) voor de Co-op doelen kunnen lezen
drop policy if exists "Teamleden mogen profielen lezen" on public.profiles;
create policy "Teamleden mogen profielen lezen"
on public.profiles for select to authenticated using (true);

drop policy if exists "Teamleden mogen daily_logs lezen" on public.daily_logs;
create policy "Teamleden mogen daily_logs lezen"
on public.daily_logs for select to authenticated using (true);

drop policy if exists "Teamleden mogen meals lezen" on public.meals;
create policy "Teamleden mogen meals lezen"
on public.meals for select to authenticated using (true);

-- 8. Activeer Supabase Realtime voor live chatberichten in 'team_messages'
do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'team_messages'
    ) then
        alter publication supabase_realtime add table public.team_messages;
    end if;
end $$;
