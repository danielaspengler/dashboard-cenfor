-- Modelo de acceso (Daniela, 04/09/2026): sin roles ni permisos por área o
-- marca. Una lista de mails autorizados. Quien está, ve todo; quien no
-- está, no entra ni ve nada.
--
-- Dos capas, a propósito:
--   1. No puede crear la cuenta  → trigger que rechaza el alta.
--   2. No puede leer ningún dato → RLS contra la misma lista.
-- La primera es comodidad: hace que el rechazo se vea en el momento. La
-- segunda es el candado real: si mañana aparece un usuario creado por otra
-- vía, sigue sin poder leer una sola fila.

create table public.emails_autorizados (
  email      text primary key,
  nota       text,
  created_at timestamptz not null default now()
);
alter table public.emails_autorizados enable row level security;
-- Sin policies a propósito: se administra desde el panel de Supabase, no
-- desde la app. Nadie tiene por qué leer esta lista desde el navegador.

comment on table public.emails_autorizados is
  'Quién puede usar el dashboard. Agregar un mail acá lo habilita; borrarlo lo deja afuera de inmediato, aunque ya tenga cuenta creada.';

insert into public.emails_autorizados (email, nota) values
  ('danispengler97@gmail.com', 'Daniela — HOLT');

-- ── Capa 1: no se puede crear la cuenta ──────────────────────────────
create or replace function public.solo_mails_autorizados()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.emails_autorizados a
    where lower(a.email) = lower(new.email)
  ) then
    raise exception 'Este correo no está autorizado para usar el dashboard.'
      using errcode = '42501';
  end if;

  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger solo_mails_autorizados
  after insert on auth.users
  for each row execute function public.solo_mails_autorizados();

revoke execute on function public.solo_mails_autorizados() from public, anon, authenticated;

-- ── Capa 2: RLS contra la misma lista ────────────────────────────────
create or replace function public.esta_autorizado()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.emails_autorizados a on lower(a.email) = lower(p.email)
    where p.id = auth.uid()
  );
$$;

revoke execute on function public.esta_autorizado() from public, anon;
grant execute on function public.esta_autorizado() to authenticated;

drop policy if exists "brands_read"            on public.brands;
drop policy if exists "areas_read"             on public.areas;
drop policy if exists "locations_read"         on public.locations;
drop policy if exists "reviews_read"           on public.reviews;
drop policy if exists "review_snapshots_read"  on public.review_snapshots;
drop policy if exists "ms_read"                on public.mystery_shopper_visits;
drop policy if exists "audits_read"            on public.audits;
drop policy if exists "accesos_read_own"       on public.encargado_accesos;

create policy "brands_read"           on public.brands                 for select to authenticated using (public.esta_autorizado());
create policy "areas_read"            on public.areas                  for select to authenticated using (public.esta_autorizado());
create policy "locations_read"        on public.locations              for select to authenticated using (public.esta_autorizado());
create policy "reviews_read"          on public.reviews                for select to authenticated using (public.esta_autorizado());
create policy "review_snapshots_read" on public.review_snapshots       for select to authenticated using (public.esta_autorizado());
create policy "ms_read"               on public.mystery_shopper_visits for select to authenticated using (public.esta_autorizado());
create policy "audits_read"           on public.audits                 for select to authenticated using (public.esta_autorizado());

-- Ya no hay roles ni permisos por área: sobran las funciones y la tabla de
-- accesos del modelo anterior.
drop table if exists public.encargado_accesos;
drop function if exists public.ve_area(text);
drop function if exists public.ve_marca(uuid);
drop function if exists public.es_direccion();
alter table public.profiles drop column if exists role;
alter table public.profiles drop column if exists brand_id;
