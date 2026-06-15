# Veiling Kijkdagen MVP

Open `index.html` voor de homepage en `admin.html` voor handmatige invoer.

## Supabase

1. Maak een Supabase-project.
2. Voer `supabase-schema.sql` uit in de SQL editor.
3. Open de site en vul je Supabase project-url en anon key in.

De MVP gebruikt drie tabellen:

- `auction_houses`
- `auctions`
- `viewing_days`

De adminpagina gebruikt voor deze MVP insert-policies op de anon key. Voor productie is Supabase Auth met beheerderrollen nodig.

## Afbeeldingen

Nieuwe projecten krijgen via `supabase-schema.sql` direct een `image_url` veld op
`auction_houses` en `auctions`.

Heb je het schema al eerder uitgevoerd, draai dan eenmalig
`add-image-fields.sql` in Supabase.
