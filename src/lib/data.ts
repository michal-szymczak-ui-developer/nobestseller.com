import fs from 'node:fs';
import path from 'node:path';

export type Kind = 'books' | 'movies';

export interface ListRef {
  slug: string;
  title: string;
}

export interface Item {
  id: string;
  kind: Kind;
  title: string;
  creator: string;
  year: string;
  genre: string;
  age: string;
  ageNum: number;
  description: string;
  lists: ListRef[];
  yearNum: number;
  era: string;
  country: string;
  originalTitle: string;
}

export interface ListInfo extends ListRef {
  kind: Kind;
  description: string;
  count: number;
  /** Grupa w filtrze „Źródło listy” (pole "grupa" w pliku listy), domyślnie instytucje. */
  group: string;
}

export const DEFAULT_GROUP = 'Instytucje';

const DATA_DIR = path.resolve('data');
const KINDS: Kind[] = ['books', 'movies'];

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, ' ').trim();

const slugify = (s: string) => norm(s).replace(/ /g, '-');

const upperFirst = (s: string) => (s ? s[0].toLocaleUpperCase('pl') + s.slice(1) : s);

/** Gatunek bez dopisku w nawiasie: "powieść (realizm magiczny)" -> "Powieść" */
function mainGenre(raw: string): string {
  const m = /^([^(]*)\((.*)\)\s*$/.exec(raw ?? '');
  const genre = (m ? m[1] : (raw ?? '')).trim() || 'inne';
  return upperFirst(genre);
}

function ageNumber(age: string): number {
  const n = parseInt(age, 10);
  return Number.isNaN(n) ? 0 : n;
}

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };
const roman = (s: string) =>
  [...s].reduce((sum, c, i, a) => sum + (ROMAN[c] < (ROMAN[a[i + 1]] ?? 0) ? -ROMAN[c] : ROMAN[c]), 0);

/** Rok do sortowania: "1913–1927" -> 1913, "VIII w. p.n.e." -> -750, "od 1952" -> 1952 */
export function parseYear(raw: string): number {
  const s = raw.trim();
  const bce = /p\.n\.e/.test(s);
  const digits = /\d+/.exec(s);
  if (digits) return bce ? -parseInt(digits[0], 10) : parseInt(digits[0], 10);
  const rm = /\b([IVXL]+)\b/.exec(s);
  if (!rm) return 0;
  const mid = roman(rm[1]) * 100 - 50;
  return bce ? -mid : mid;
}

export const ERAS: Record<Kind, string[]> = {
  books: ['Do 1500', '1500–1899', '1900–1949', '1950–1979', 'Od 1980'],
  movies: ['Przed 1950', 'Lata 50.', 'Lata 60.', 'Lata 70.', 'Lata 80.', 'Od 1990'],
};

function eraOf(kind: Kind, y: number): string {
  if (kind === 'books') {
    return y < 1500 ? 'Do 1500' : y < 1900 ? '1500–1899' : y < 1950 ? '1900–1949' : y < 1980 ? '1950–1979' : 'Od 1980';
  }
  if (y < 1950) return 'Przed 1950';
  if (y >= 1990) return 'Od 1990';
  return `Lata ${String(y).slice(2, 3)}0.`;
}

function readList(file: string, kind: Kind) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const base = path.basename(file, '.json');
  // Obsługiwane: sama tablica pozycji albo { "nazwa", "opis", "pozycje": [...] }
  const entries: Record<string, string>[] = Array.isArray(raw) ? raw : raw.pozycje;
  const title: string = (!Array.isArray(raw) && raw.nazwa) || base.replace(/_/g, ' ');
  const description: string = (!Array.isArray(raw) && raw.opis) || '';
  const group: string = (!Array.isArray(raw) && raw.grupa) || DEFAULT_GROUP;
  return { slug: slugify(base), title, description, group, entries };
}

export function loadAll(): { items: Item[]; lists: ListInfo[] } {
  const byId = new Map<string, Item>();
  const lists: ListInfo[] = [];

  for (const kind of KINDS) {
    const dir = path.join(DATA_DIR, kind);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      const { slug, title, description, group, entries } = readList(path.join(dir, f), kind);
      const ref: ListRef = { slug, title };
      lists.push({ ...ref, kind, description, group, count: entries.length });

      for (const e of entries) {
        const t = e['tytuł'] ?? e['tytul'] ?? e['title'];
        if (!t) throw new Error(`${f}: pozycja bez tytułu`);
        const creator = e['autor'] ?? e['reżyser'] ?? e['rezyser'] ?? e['twórca'] ?? '';
        const id = `${kind}-${slugify(t)}-${slugify(creator)}`;
        const existing = byId.get(id);
        if (existing) {
          if (!existing.lists.some((l) => l.slug === slug)) existing.lists.push(ref);
          continue;
        }
        const genre = mainGenre(e['gatunek']);
        const age = e['kategoria_wiekowa'] ?? '';
        const year = String(e['rok'] ?? '');
        const yearNum = parseYear(year);
        byId.set(id, {
          id, kind, title: t, creator, year, yearNum, era: eraOf(kind, yearNum),
          genre, age, ageNum: ageNumber(age),
          description: e['opis'] ?? '',
          country: e['kraj'] ?? '',
          originalTitle: e['tytuł_oryginalny'] && e['tytuł_oryginalny'] !== t ? e['tytuł_oryginalny'] : '',
          lists: [ref],
        });
      }
    }
  }
  return { items: [...byId.values()], lists };
}
