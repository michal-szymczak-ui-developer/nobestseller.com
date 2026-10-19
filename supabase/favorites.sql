-- Uruchom w Supabase: SQL Editor → New query → wklej → Run.
-- Skrypt można uruchamiać wielokrotnie (także na istniejącej tabeli).
create table if not exists public.favorites (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id    text not null check (char_length(item_id) <= 300),
  done       boolean not null default false,  -- „Zaliczone” (przeczytane / obejrzane)
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.favorites add column if not exists done boolean not null default false;

alter table public.favorites enable row level security;

-- Każdy użytkownik widzi i zmienia wyłącznie własne ulubione.
drop policy if exists "favorites: select own" on public.favorites;
drop policy if exists "favorites: insert own" on public.favorites;
drop policy if exists "favorites: update own" on public.favorites;
drop policy if exists "favorites: delete own" on public.favorites;

create policy "favorites: select own" on public.favorites
  for select to authenticated using (user_id = auth.uid());
create policy "favorites: insert own" on public.favorites
  for insert to authenticated with check (user_id = auth.uid());
create policy "favorites: update own" on public.favorites
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "favorites: delete own" on public.favorites
  for delete to authenticated using (user_id = auth.uid());
