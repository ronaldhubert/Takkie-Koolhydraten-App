-- Privéberichten binnen het clubje (Stap A)
-- Plak dit in de Supabase SQL Editor en klik op Run.

-- 1. Ontvanger-kolom: leeg = bericht voor het hele clubje, gevuld = privébericht
alter table public.team_messages
    add column if not exists recipient_id uuid references auth.users(id) on delete cascade;

-- 2. Lezen: clubjeberichten voor iedereen, privéberichten alleen voor afzender en ontvanger
drop policy if exists "Teamleden mogen berichten lezen" on public.team_messages;
create policy "Teamleden mogen berichten lezen"
on public.team_messages for select to authenticated
using (
    recipient_id is null
    or recipient_id = auth.uid()
    or user_id = auth.uid()
);

-- 3. Sturen: je mag alleen berichten onder je eigen naam versturen
drop policy if exists "Teamleden mogen berichten sturen" on public.team_messages;
create policy "Teamleden mogen berichten sturen"
on public.team_messages for insert to authenticated
with check (user_id = auth.uid());
