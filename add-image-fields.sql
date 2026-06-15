alter table public.auction_houses
add column if not exists image_url text;

alter table public.auctions
add column if not exists image_url text;
