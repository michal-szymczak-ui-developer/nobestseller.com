# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

nobestseller.com — statyczna strona (Astro 5, `output: 'static'`, TypeScript strict) z katalogiem książek i filmów z list polecanych/kanonicznych. Treść i UI są po polsku. Wdrażana na GitHub Pages (`public/CNAME`).

## Commands

- `npm run dev` — serwer deweloperski Astro
- `npm run build` — build do `dist/`
- `npm run preview` — podgląd buildu
- `npm run check` — walidacja plików `data/**/*.json` (`scripts/validate.mjs`); zwraca exit 1 przy błędach

Brak testów i lintera. CI (`.github/workflows/deploy.yml`, push na `main`) uruchamia `npm ci` → `npm run check` → `npm run build` → deploy na Pages (Node 20), więc błąd walidacji danych blokuje wdrożenie.

## Architecture

Dane → jedna funkcja ładująca → jedna strona:

- `data/books/*.json` i `data/movies/*.json` — każdy plik to jedna lista. Format: `{ "nazwa", "opis", "grupa", "pozycje": [...] }` albo goła tablica pozycji; opcjonalne `grupa` (domyślnie „Instytucje”, np. „Reżyserzy”) dzieli listy w filtrze „Źródło listy”. Nazwa pliku (bez `.json`) daje slug listy i fallback tytułu.
- `src/lib/data.ts` — `loadAll()` czyta wszystkie pliki w czasie buildu (`fs`, ścieżka `data/` względem cwd), normalizuje pozycje do `Item` i **deduplikuje** pozycje między listami po `id = kind-slug(tytuł)-slug(twórca)`; ta sama pozycja z wielu list dostaje wiele wpisów w `lists`. Wylicza też `yearNum` (`parseYear` obsługuje m.in. "1913–1927", "od 1952", rzymskie wieki "VIII w. p.n.e."), `era` (przedziały w `ERAS`), główny gatunek (część przed nawiasem, wielka litera) i `ageNum`.
- `src/pages/index.astro` — jedyna strona; wywołuje `loadAll()` i przekazuje wynik do `src/components/Catalog.astro` (filtrowanie/UI katalogu), osadzonego w `src/layouts/Base.astro`.

### Ulubione i synchronizacja

Ulubione (zakładka przy tytule) i „Zaliczone” (przeczytane/obejrzane, tylko dla ulubionych) trzymane są w `localStorage` (`favorites`, `favorites-done` — listy `Item.id`). Logika stanu, kliknięć i logowania: `src/lib/favorites.ts`; opcjonalna synchronizacja przez Supabase po zalogowaniu Google: `src/lib/cloud.ts`, schemat (kolumna `done`) i polityki RLS w `supabase/favorites.sql`. Karty pozycji nie są renderowane w HTML: dane trafiają do strony jako JSON (`payloadJson` w `src/lib/row.ts`), a karty (`rowHtml`, style w `src/styles/row.css`) buduje przeglądarka — w katalogu po 100 sztuk (leniwe ładowanie, przycisk „Pokaż więcej” + IntersectionObserver). Wspólny pasek górny to `Topbar.astro`; widok ulubionych to osobna strona `src/pages/ulubione.astro` (sekcje Książki i Filmy). Bez `PUBLIC_SUPABASE_URL`/`PUBLIC_SUPABASE_ANON_KEY` (`.env`, w CI zmienne repozytorium `vars.*`) przycisk logowania jest ukryty i działa tylko localStorage.

### Format pozycji w JSON

Pola: `tytuł`, `rok` (tekst), `gatunek`, `kategoria_wiekowa` (`"6+"|"12+"|"16+"|"18+"`), `opis`; twórca w `autor` (książki) lub `reżyser` (filmy); filmy dodatkowo `tytuł_oryginalny`, `kraj`. Walidator wymaga: `tytuł`, `gatunek`, `kategoria_wiekowa`, `opis` oraz `autor`/`reżyser`. Loader akceptuje też warianty bez polskich znaków (`tytul`, `rezyser`) i BOM na początku pliku.

Dla filmów `gatunek` musi być dokładnie jedną z: Akcja, Przygodowy, Komedia, Dramat, Thriller, Kryminał, Horror, Science fiction, Fantasy, Romans, Animacja, Familijny, Dokumentalny, Biograficzny, Wojenny. Tytuły filmów po polsku wg polskiej dystrybucji, reżyserzy pełnym imieniem i nazwiskiem (spójność między listami jest ważna, bo dedup opiera się na slugu tytułu + twórcy — różnice w zapisie tworzą duplikaty).

`README.MD` zawiera prompt używany do generowania nowych list filmów (np. `data/movies/Nolan.json`): tylko pozycje faktycznie polecone publicznie, bez zmyślania, sortowanie chronologiczne, opisy rzeczowe.
