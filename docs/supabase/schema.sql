-- gitFolio — schema Supabase. Da eseguire UNA volta in: Supabase Dashboard > SQL Editor > New query > Run.
-- Sicuro da rieseguire (idempotente dove possibile).

-- 1) Profilo utente (nome utente + foto predefinita per i nuovi CV) ---------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text check (username is null or char_length(username) between 2 and 40),
  default_photo text check (default_photo is null or char_length(default_photo) < 200000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- 2) CV salvati (max 5 per utente) --------------------------------------------------------------------
create table if not exists public.templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  data       jsonb not null check (pg_column_size(data) < 600000),
  thumbnail  text check (thumbnail is null or char_length(thumbnail) < 80000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists templates_user_updated_idx on public.templates (user_id, updated_at desc);

alter table public.templates enable row level security;

drop policy if exists "templates_select_own" on public.templates;
drop policy if exists "templates_insert_own" on public.templates;
drop policy if exists "templates_update_own" on public.templates;
drop policy if exists "templates_delete_own" on public.templates;
create policy "templates_select_own" on public.templates for select using (auth.uid() = user_id);
create policy "templates_insert_own" on public.templates for insert with check (auth.uid() = user_id);
create policy "templates_update_own" on public.templates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "templates_delete_own" on public.templates for delete using (auth.uid() = user_id);

-- Limite di 5 CV per utente, applicato dal database (non aggirabile dal client).
create or replace function public.enforce_template_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.templates where user_id = new.user_id) >= 5 then
    raise exception 'template_limit' using errcode = 'P0001', hint = 'Delete a saved template first';
  end if;
  return new;
end $$;

drop trigger if exists templates_limit on public.templates;
create trigger templates_limit before insert on public.templates
  for each row execute function public.enforce_template_limit();

-- updated_at automatico
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists templates_touch on public.templates;
create trigger templates_touch before update on public.templates
  for each row execute function public.touch_updated_at();
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- 3) Profilo creato automaticamente alla registrazione -------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  name text;
begin
  name := left(coalesce(
    nullif(new.raw_user_meta_data ->> 'user_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(new.email, '@', 1)
  ), 40);
  if name is null or char_length(name) < 2 then name := null; end if; -- mai far fallire la registrazione
  insert into public.profiles (id, username) values (new.id, name) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) Condivisione con gli amici: SOLO IL DESIGN ----------------------------------------------------------
-- Il proprietario genera un link segreto (share_id). Chiunque abbia il link legge, tramite la funzione qui sotto, solo il
-- nome del template e le impostazioni di design (colori, font, layout, stile): mai contenuti, foto, contatti o anteprima.
-- La tabella resta privata (RLS invariata): la funzione è l'unico accesso pubblico.
alter table public.templates add column if not exists share_id uuid unique;

create or replace function public.shared_design(share uuid) returns table (name text, design jsonb)
language sql stable security definer set search_path = public as $$
  select t.name, t.data -> 'design' from public.templates t where share is not null and t.share_id = share;
$$;

revoke all on function public.shared_design(uuid) from public;
grant execute on function public.shared_design(uuid) to anon, authenticated;
