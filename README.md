# Veiling Kijkdagen MVP

Open `index.html` voor de homepage en `admin.html` voor handmatige invoer.

## Supabase

1. Maak een Supabase-project.
2. Voer `supabase-schema.sql` uit in de SQL editor.
3. Open de site en vul je Supabase project-url en anon key in.

Wil je dat bezoekers niets hoeven in te vullen, zet dan je publieke waarden in
`shared.js`:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_KEY`

Gebruik hiervoor alleen de Supabase Project URL en Publishable/anon key. Gebruik
nooit een secret key of service_role key in deze website.

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

Heb je later het postcodeveld toegevoegd, draai dan eenmalig
`add-postal-code-field.sql` in Supabase.

## Tijdafspraak MS Access

De datum/tijdvelden bevatten Nederlandse kloktijden in UTC-velden: 11:00+00:00 betekent in deze dataset 11:00 Nederlandse tijd. De website toont deze kloktijd ongewijzigd, ook op apparaten met een andere tijdzone. Admininvoer gebruikt dezelfde afspraak. Agenda-downloads zetten de kloktijd om naar een werkelijk UTC-tijdstip met Europe/Amsterdam (zomer- en wintertijd). Deze afspraak geldt voor alle kijkdagen; meng geen echte UTC-tijdstippen met deze Access-invoer.
