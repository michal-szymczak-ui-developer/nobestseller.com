import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

/** Synchronizacja jest opcjonalna – bez kluczy strona działa tylko z localStorage. */
export const cloudEnabled = Boolean(url && key);

const client: SupabaseClient | null = cloudEnabled ? createClient(url!, key!) : null;

export interface FavRow { id: string; done: boolean; }

export const signInWithGoogle = () =>
  client?.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname },
  });

export const signOut = () => client?.auth.signOut();

/** Wywołuje cb z aktualnym użytkownikiem (lub null) – po wczytaniu sesji i po każdej jej zmianie. */
export function onUser(cb: (user: User | null) => void) {
  client?.auth.onAuthStateChange((_e, session) => cb(session?.user ?? null));
}

export async function fetchFavs(): Promise<FavRow[]> {
  const { data, error } = await client!.from('favorites').select('item_id, done');
  if (error) throw error;
  return data.map((r) => ({ id: r.item_id as string, done: Boolean(r.done) }));
}

/** Dodaje lub aktualizuje (id + flaga „zaliczone”). */
export async function upsertFavs(rows: FavRow[]) {
  if (!rows.length) return;
  const { error } = await client!
    .from('favorites')
    .upsert(rows.map((r) => ({ item_id: r.id, done: r.done })), { onConflict: 'user_id,item_id' });
  if (error) throw error;
}

export async function setDone(id: string, done: boolean) {
  const { error } = await client!.from('favorites').update({ done }).eq('item_id', id);
  if (error) throw error;
}

export async function removeFav(id: string) {
  const { error } = await client!.from('favorites').delete().eq('item_id', id);
  if (error) throw error;
}
