-- Web Push (Stap B): opslag van push-gegevens per apparaat
-- Plak dit in de Supabase SQL Editor en klik op Run.

create table if not exists public.push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    created_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Eigen push-gegevens lezen" on public.push_subscriptions;
create policy "Eigen push-gegevens lezen"
on public.push_subscriptions for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Eigen push-gegevens toevoegen" on public.push_subscriptions;
create policy "Eigen push-gegevens toevoegen"
on public.push_subscriptions for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Eigen push-gegevens wijzigen" on public.push_subscriptions;
create policy "Eigen push-gegevens wijzigen"
on public.push_subscriptions for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Eigen push-gegevens verwijderen" on public.push_subscriptions;
create policy "Eigen push-gegevens verwijderen"
on public.push_subscriptions for delete to authenticated
using (user_id = auth.uid());
