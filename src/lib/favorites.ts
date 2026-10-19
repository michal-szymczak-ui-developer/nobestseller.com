import { cloudEnabled, fetchFavs, onUser, removeFav, setDone, signInWithGoogle, signOut, upsertFavs } from './cloud';

/**
 * Ulubione + „Zaliczone” (przeczytane / obejrzane).
 * Źródło prawdy w przeglądarce: localStorage; po zalogowaniu (Google) dodatkowo synchronizacja z Supabase.
 * „Zaliczone” dotyczy wyłącznie pozycji z ulubionych.
 */
const FAV_KEY = 'favorites';
const DONE_KEY = 'favorites-done';

export const favs = new Set<string>();
export const done = new Set<string>();

const listeners = new Set<() => void>();
export const subscribe = (cb: () => void) => { listeners.add(cb); };
const emit = () => listeners.forEach((f) => f());

function read(key: string, into: Set<string>) {
  into.clear();
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (Array.isArray(raw)) raw.forEach((x) => typeof x === 'string' && into.add(x));
  } catch {}
}
const save = () => {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
    localStorage.setItem(DONE_KEY, JSON.stringify([...done]));
  } catch {}
};
const load = () => { read(FAV_KEY, favs); read(DONE_KEY, done); done.forEach((id) => favs.has(id) || done.delete(id)); };
load();

// synchronizacja między kartami przeglądarki
addEventListener('storage', (e) => {
  if (e.key !== FAV_KEY && e.key !== DONE_KEY) return;
  load();
  emit();
});

let userId: string | null = null;
const warn = (msg: string) => (err: unknown) => console.warn(msg, err);

export function toggleFav(id: string) {
  const adding = !favs.has(id);
  const wasDone = done.has(id);
  if (adding) favs.add(id); else { favs.delete(id); done.delete(id); }
  save(); emit();
  if (!userId) return;
  (adding ? upsertFavs([{ id, done: false }]) : removeFav(id)).catch((err) => {
    console.warn('Nie udało się zapisać ulubionych', err);
    if (adding) favs.delete(id); else { favs.add(id); if (wasDone) done.add(id); }
    save(); emit();
  });
}

export function toggleDone(id: string) {
  if (!favs.has(id)) return;
  const on = !done.has(id);
  if (on) done.add(id); else done.delete(id);
  save(); emit();
  if (!userId) return;
  setDone(id, on).catch((err) => {
    console.warn('Nie udało się zapisać statusu', err);
    if (on) done.delete(id); else done.add(id);
    save(); emit();
  });
}

/** Aktualizuje wygląd przycisków karty (zakładka + „Zaliczone”). */
export function syncRow(row: HTMLElement) {
  const id = row.dataset.id!;
  const isFav = favs.has(id);
  const isDone = done.has(id);
  const fav = row.querySelector<HTMLButtonElement>('.fav-btn');
  const dn = row.querySelector<HTMLButtonElement>('.done-btn');
  row.dataset.fav = isFav ? '1' : '0';
  row.dataset.done = isDone ? '1' : '0';
  if (fav) {
    const label = isFav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych';
    fav.setAttribute('aria-pressed', String(isFav));
    fav.setAttribute('aria-label', label);
    fav.title = label;
  }
  if (dn) {
    const label = isDone ? 'Cofnij „Zaliczone”' : 'Oznacz jako zaliczone';
    dn.hidden = !isFav;
    dn.setAttribute('aria-pressed', String(isDone));
    dn.setAttribute('aria-label', label);
    dn.title = label;
  }
}

/** Obsługa kliknięć w zakładkę i „Zaliczone” w kontenerze z kartami (delegacja zdarzeń). */
export function bindRows(container: HTMLElement) {
  container.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const btn = t.closest<HTMLElement>('.fav-btn, .done-btn');
    if (!btn) return;
    const row = btn.closest<HTMLElement>('.row')!;
    if (btn.classList.contains('fav-btn')) toggleFav(row.dataset.id!); else toggleDone(row.dataset.id!);
  });
}

// ─── Logowanie Google + synchronizacja z Supabase (opcjonalna) ───
export function initAuth(btn: HTMLButtonElement) {
  if (!cloudEnabled) return;
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    if (!userId) { signInWithGoogle(); return; }
    await signOut();
    favs.clear(); done.clear(); // na wspólnym urządzeniu nie zostawiamy cudzych ulubionych
    save(); emit();
  });
  onUser(async (user) => {
    const id = user?.id ?? null;
    if (id === userId) return; // np. odświeżenie tokenu
    userId = id;
    btn.textContent = user ? 'Wyloguj' : 'Zaloguj się';
    btn.title = user ? `Zalogowano: ${user.email ?? ''}` : 'Zaloguj się kontem Google, aby synchronizować ulubione';
    if (!user) return;
    try {
      const remote = await fetchFavs();
      const remoteDone = new Map(remote.map((r) => [r.id, r.done]));
      // lokalne pozycje, których nie ma w koncie albo które lokalnie są „zaliczone”, a w koncie nie
      const push = [...favs]
        .filter((x) => !remoteDone.has(x) || (done.has(x) && !remoteDone.get(x)))
        .map((x) => ({ id: x, done: done.has(x) }));
      await upsertFavs(push);
      remote.forEach((r) => { favs.add(r.id); if (r.done) done.add(r.id); });
      save(); emit();
    } catch (err) {
      warn('Nie udało się zsynchronizować ulubionych')(err);
    }
  });
}
