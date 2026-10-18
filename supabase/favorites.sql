-- Uruchom raz w Supabase: SQL Editor → New query → wklej → Run.
create table if not exists public.favorites (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id    text not null check (char_length(item_id) <= 300),
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.favorites enable row level security;

-- Każdy użytkownik widzi i zmienia wyłącznie własne ulubione.
create policy "favorites: select own" on public.favorites
  for select to authenticated using (user_id = auth.uid());
create policy "favorites: insert own" on public.favorites
  for insert to authenticated with check (user_id = auth.uid());
create policy "favorites: delete own" on public.favorites
  for delete to authenticated using (user_id = auth.uid());
