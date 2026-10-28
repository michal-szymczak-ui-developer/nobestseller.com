# nobestseller.com v1.0

Katalog książek i filmów z list polecanych i kanonicznych (np. Le Monde, Rzeczpospolita, Scorsese, Kubrick, Nolan, lista watykańska). Treść i interfejs są po polsku.

## Jak jest zbudowany serwis

- **Statyczna strona w Astro 5 (TypeScript).** Cały serwis jest budowany do plików HTML/JS/CSS (`output: 'static'`), bez własnego serwera.
- **Dane w plikach JSON.** Każda lista to jeden plik w `data/books/` lub `data/movies/` (nazwa pliku to identyfikator listy). Nowa lista to nowy plik, bez zmian w kodzie.
- **Jedna funkcja ładująca dane.** `src/lib/data.ts` czyta wszystkie pliki podczas buildu, ujednolica pola i łączy duplikaty: ta sama pozycja z kilku list jest jednym wpisem z informacją o wszystkich listach. Wylicza też rok liczbowy, epokę/dekadę, gatunek główny i wiek.
- **Walidacja danych przed publikacją.** `npm run check` (`scripts/validate.mjs`) sprawdza wymagane pola i dozwolone wartości. Błąd w danych zatrzymuje wdrożenie.
- **Katalog z filtrami po stronie przeglądarki.** `src/components/Catalog.astro` osadza dane jako JSON, a skrypt filtruje je na żywo i doładowuje karty po 100 sztuk (leniwe ładowanie), dzięki czemu strona i przełączanie Książki/Filmy działają szybko (lista źródłowa, gatunek, epoka, wiek, liczba list), wyszukuje i sortuje. Stan filtrów jest zapisywany w adresie URL, więc widok można zapisać w zakładkach lub wysłać dalej.
- **Układ responsywny.** Na desktopie filtry są w stałym panelu po lewej, a na tabletach i telefonach w wysuwanym panelu (drawer).
- **Wspólne komponenty.** `src/lib/row.ts` buduje kartę pozycji z okładką generowaną z tytułu w paletach Joana Miró, a `Topbar.astro` to pasek górny z przełącznikiem motywu jasnego i ciemnego oraz logowaniem.
- **Ulubione i „Zaliczone”.** Zakładka przy tytule dodaje pozycję do ulubionych, a pozycje ulubione można oznaczyć jako zaliczone (przeczytane lub obejrzane). Stan jest w `localStorage`, a obsługuje go `src/lib/favorites.ts`.
- **Osobna strona Ulubione.** `src/pages/ulubione.astro` pokazuje dwie sekcje, Książki i Filmy, z filtrem Wszystkie / Do zaliczenia / Zaliczone.
- **Opcjonalna synchronizacja między urządzeniami.** Po zalogowaniu kontem Google ulubione trafiają do Supabase (`src/lib/cloud.ts`, schemat i reguły dostępu w `supabase/favorites.sql`), a każdy użytkownik widzi tylko własne dane. Bez kluczy Supabase przycisk logowania jest ukryty, a strona działa tylko lokalnie.
- **Wdrożenie przez FTP.** Push na `main` uruchamia workflow (`.github/workflows/deploy-ftp.yml`): `npm ci`, `npm run check`, `npm run build` i wysyłkę katalogu `dist/` na hosting. Wymaga sekretów `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`.

## Uruchomienie lokalne

```bash
npm install
npm run dev      # serwer deweloperski
npm run check    # walidacja danych
npm run build    # build do dist/
```

Aby włączyć logowanie i synchronizację, skopiuj `.env.example` do `.env` i uzupełnij `PUBLIC_SUPABASE_URL` oraz `PUBLIC_SUPABASE_ANON_KEY`. Na GitHubie te same wartości dodaje się jako zmienne repozytorium (Actions → Variables). Klucza `service_role` nie umieszczaj w projekcie.
