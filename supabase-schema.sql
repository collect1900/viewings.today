create extension if not exists "pgcrypto";

create table if not exists public.auction_houses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text not null,
  website text,
  image_url text,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  auction_house_id uuid not null references public.auction_houses(id) on delete cascade,
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  url text,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.viewing_days (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text,
  created_at timestamptz not null default now(),
  constraint viewing_days_end_after_start check (ends_at > starts_at)
);

create index if not exists viewing_days_starts_at_idx on public.viewing_days(starts_at);
create index if not exists auctions_auction_house_id_idx on public.auctions(auction_house_id);
create index if not exists viewing_days_auction_id_idx on public.viewing_days(auction_id);

alter table public.auction_houses enable row level security;
alter table public.auctions enable row level security;
alter table public.viewing_days enable row level security;

create policy "Public read auction houses"
on public.auction_houses for select
to anon
using (true);

create policy "Public read auctions"
on public.auctions for select
to anon
using (true);

create policy "Public read viewing days"
on public.viewing_days for select
to anon
using (true);

-- MVP-policy: handig voor handmatige admin via anon key.
-- Vervang dit later door Supabase Auth en policies per ingelogde beheerder.
create policy "MVP insert auction houses"
on public.auction_houses for insert
to anon
with check (true);

create policy "MVP insert auctions"
on public.auctions for insert
to anon
with check (true);

create policy "MVP insert viewing days"
on public.viewing_days for insert
to anon
with check (true);

insert into public.auction_houses (name, address, city, website, latitude, longitude)
values
  ('Venduehuis Den Haag', 'Nobelstraat 5', 'Den Haag', 'https://venduehuis.com', 52.0809, 4.3075),
  ('AAG Auctioneers', 'Lekstraat 63', 'Amsterdam', 'https://aagauctioneers.com', 52.3425, 4.9082)
on conflict do nothing;
