import type { Item, Kind } from './data';

/**
 * Wspólna, lekka reprezentacja pozycji dla strony (JSON osadzany w HTML) oraz renderowanie karty po stronie
 * przeglądarki. Dzięki temu w DOM trafia tylko porcja kart (leniwe ładowanie), a nie cały katalog.
 */
export interface RowItem {
  id: string;
  kind: Kind;
  title: string;
  creator: string;
  original: string;
  year: string;
  yearNum: number;
  genre: string;
  era: string;
  age: string;
  ageNum: number;
  desc: string;
  country: string;
  lists: string[]; // slugi list
}

export interface DataPayload {
  items: RowItem[];
  titles: Record<string, string>; // slug listy → tytuł
}

/** Po stronie serwera (build): Item → JSON do osadzenia w stronie. Zwraca bezpieczny w <script> tekst. */
export function payloadJson(items: Item[]): string {
  const titles: Record<string, string> = {};
  const rows: RowItem[] = items.map((i) => {
    i.lists.forEach((l) => { titles[l.slug] = l.title; });
    return {
      id: i.id, kind: i.kind, title: i.title, creator: i.creator, original: i.originalTitle, year: i.year,
      yearNum: i.yearNum, genre: i.genre, era: i.era, age: i.age, ageNum: i.ageNum, desc: i.description,
      country: i.country, lists: i.lists.map((l) => l.slug),
    };
  });
  return JSON.stringify({ items: rows, titles } satisfies DataPayload).replace(/</g, '\\u003c');
}

// Paleta okładek inspirowana obrazami Joana Miró: czerwień, ultramaryna, żółć, zieleń, czerń, róż, błękit
const MIRO = [
  { bg: '#d8372b', fg: '#fff' },
  { bg: '#1f45a0', fg: '#fff' },
  { bg: '#f4c20d', fg: '#161616' },
  { bg: '#2e8b57', fg: '#fff' },
  { bg: '#171717', fg: '#fff' },
  { bg: '#e8756b', fg: '#161616' },
  { bg: '#6aa6d6', fg: '#161616' },
  { bg: '#f08a24', fg: '#161616' },
];
const coverColor = (s: string) => {
  let h = 5381;
  for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return MIRO[h % MIRO.length];
};

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);
const listsWord = (n: number) => (n < 5 ? 'listy' : 'list');
const lastName = (s: string) => s.split(/[,;]/)[0].trim().split(' ').pop() ?? '';

/** Tekst do wyszukiwarki. */
export const searchText = (i: RowItem) =>
  `${i.title} ${i.original} ${i.creator} ${i.country} ${i.desc}`.toLowerCase();

const HEART = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M6 3h12v18l-6-4.5L6 21Z"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 9.5"/></svg>';

/** HTML pojedynczej karty (style: src/styles/row.css). */
export function rowHtml(i: RowItem, titles: Record<string, string>): string {
  const c = coverColor(i.title + i.creator);
  const n = i.lists.length;
  const name = (slug: string) => esc(titles[slug] ?? slug);
  const badge = (slug: string, cls: string) =>
    `<button type="button" class="${cls}" data-list="${esc(slug)}" title="Pokaż tylko tę listę">${name(slug)}</button>`;
  const source = n === 1
    ? badge(i.lists[0], 'src-badge src-tag')
    : `<span class="tip-wrap"><span class="points-badge" tabindex="0" aria-haspopup="true">${n} ${listsWord(n)}</span>` +
      `<span class="tip" role="tooltip"><span class="tip-box">${i.lists.map((s) => badge(s, 'src-badge')).join('')}</span></span></span>`;
  return (
    `<li class="row" data-id="${esc(i.id)}" data-kind="${i.kind}" data-fav="0" data-done="0">` +
    `<div class="cover" style="--cover-bg:${c.bg};--cover-fg:${c.fg}" aria-hidden="true">` +
    `<span class="c-title">${esc(i.title)}</span><span class="c-by">${esc(lastName(i.creator))}</span></div>` +
    `<div class="info"><div class="title-row"><h2 class="item-title">${esc(i.title)}</h2>` +
    `<button type="button" class="fav-btn" aria-pressed="false" aria-label="Dodaj do ulubionych" title="Dodaj do ulubionych">${HEART}</button>` +
    `<button type="button" class="done-btn" aria-pressed="false" aria-label="Oznacz jako zaliczone" title="Oznacz jako zaliczone" hidden>${CHECK}</button></div>` +
    `<div class="by">${esc(i.creator)}${i.original ? `<span>·</span><em>${esc(i.original)}</em>` : ''}</div>` +
    `<p class="desc">${esc(i.desc)}</p>` +
    `<div class="tags">${source}<span class="tag">${esc(i.genre)}</span>` +
    `${i.country ? `<span class="tag">${esc(i.country)}</span>` : ''}${i.age ? `<span class="tag">${esc(i.age)}</span>` : ''}` +
    `<span class="tag tag-done">Zaliczone</span></div></div>` +
    `<div class="side"><span class="year">${esc(i.year)}</span></div></li>`
  );
}
