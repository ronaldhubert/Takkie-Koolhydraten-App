-- ============================================================================
-- TAKKIE & SIEP KETO TRACKER: ZELFGROEIENDE PRODUCTENDATABASE IN SUPABASE
-- Plak dit script in de Supabase SQL Editor en klik op "Run"
-- ============================================================================

-- 1. Maak de 'food_products' tabel voor gedeelde producten (uit Open Food Facts, NEVO en Gemini AI)
create table if not exists public.food_products (
    id uuid primary key default gen_random_uuid(),
    name_key text unique not null,
    name text not null,
    brand text default '',
    category text default 'meal', -- 'meal' of 'drink'
    source text default 'user',   -- 'nevo', 'off' (Open Food Facts), 'ai' (Gemini), 'user'
    unit text default 'g',        -- 'g', 'ml', 'stuks', 'plakjes', 'glazen', 'el', 'tl', 'portie'
    portion_label text default '1 portie (100 g)',
    portion_grams numeric default 100,
    carbs_100g numeric default 0,
    fat_100g numeric default 0,
    protein_100g numeric default 0,
    carbs_portion integer default 0,
    fat_portion integer default 0,
    protein_portion integer default 0,
    usage_count integer default 1,
    created_by uuid references auth.users(id) on delete set null,
    updated_at timestamptz default now()
);

-- 2. Index op name_key en usage_count voor snelle zoekopdrachten
create index if not exists idx_food_products_name_key on public.food_products (name_key);
create index if not exists idx_food_products_usage on public.food_products (usage_count desc);

-- 3. Zet Row Level Security (RLS) aan
alter table public.food_products enable row level security;

-- 4. RLS Policies: alle ingelogde gebruikers mogen producten lezen, toevoegen en bijwerken
drop policy if exists "Ingelogde gebruikers mogen food_products lezen" on public.food_products;
create policy "Ingelogde gebruikers mogen food_products lezen"
on public.food_products for select to authenticated using (true);

drop policy if exists "Ingelogde gebruikers mogen food_products toevoegen" on public.food_products;
create policy "Ingelogde gebruikers mogen food_products toevoegen"
on public.food_products for insert to authenticated with check (true);

drop policy if exists "Ingelogde gebruikers mogen food_products bijwerken" on public.food_products;
create policy "Ingelogde gebruikers mogen food_products bijwerken"
on public.food_products for update to authenticated using (true) with check (true);
