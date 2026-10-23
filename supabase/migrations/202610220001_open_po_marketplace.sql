create extension if not exists pgcrypto;

create table if not exists public.po_sellers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  faculty text not null check (char_length(faculty) between 2 and 120),
  whatsapp text not null check (char_length(whatsapp) between 8 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.po_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.po_sellers (user_id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text not null default '' check (char_length(description) <= 1200),
  category text not null default 'Lainnya' check (char_length(category) <= 40),
  price_idr integer not null check (price_idr > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.po_batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.po_products (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 100),
  quota integer not null check (quota between 1 and 10000),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  closes_at timestamptz not null,
  pickup_at timestamptz not null,
  pickup_point text not null check (char_length(pickup_point) between 2 and 160),
  pickup_note text not null default '' check (char_length(pickup_note) <= 300),
  status text not null default 'open' check (status in ('open', 'closed', 'ready', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint po_batches_reserved_within_quota check (reserved_quantity <= quota),
  constraint po_batches_dates_ordered check (pickup_at > closes_at)
);

create table if not exists public.po_orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  batch_id uuid not null references public.po_batches (id) on delete restrict,
  buyer_id uuid not null references auth.users (id) on delete restrict,
  buyer_name text not null check (char_length(buyer_name) between 2 and 80),
  buyer_faculty text not null check (char_length(buyer_faculty) between 2 and 120),
  buyer_whatsapp text not null check (char_length(buyer_whatsapp) between 8 and 24),
  quantity integer not null check (quantity between 1 and 1000),
  unit_price_idr integer not null check (unit_price_idr > 0),
  total_price_idr bigint generated always as (quantity::bigint * unit_price_idr::bigint) stored,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'ready', 'picked_up', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists po_products_seller_idx on public.po_products (seller_id, created_at desc);
create index if not exists po_batches_product_status_idx on public.po_batches (product_id, status, closes_at);
create index if not exists po_orders_batch_idx on public.po_orders (batch_id, status);
create index if not exists po_orders_buyer_idx on public.po_orders (buyer_id, created_at desc);

alter table public.po_sellers enable row level security;
alter table public.po_products enable row level security;
alter table public.po_batches enable row level security;
alter table public.po_orders enable row level security;

drop policy if exists "po_sellers_public_read" on public.po_sellers;
create policy "po_sellers_public_read" on public.po_sellers
  for select to anon, authenticated using (true);
drop policy if exists "po_sellers_self_insert" on public.po_sellers;
create policy "po_sellers_self_insert" on public.po_sellers
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "po_sellers_self_update" on public.po_sellers;
create policy "po_sellers_self_update" on public.po_sellers
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "po_products_public_read" on public.po_products;
create policy "po_products_public_read" on public.po_products
  for select to anon, authenticated using (
    active or seller_id = (select auth.uid())
  );
drop policy if exists "po_products_seller_insert" on public.po_products;
create policy "po_products_seller_insert" on public.po_products
  for insert to authenticated with check (
    exists (select 1 from public.po_sellers s where s.user_id = (select auth.uid()) and s.user_id = seller_id)
  );
drop policy if exists "po_products_seller_update" on public.po_products;
create policy "po_products_seller_update" on public.po_products
  for update to authenticated using (seller_id = (select auth.uid()))
  with check (seller_id = (select auth.uid()));
drop policy if exists "po_products_seller_delete" on public.po_products;
create policy "po_products_seller_delete" on public.po_products
  for delete to authenticated using (seller_id = (select auth.uid()));

drop policy if exists "po_batches_public_read" on public.po_batches;
create policy "po_batches_public_read" on public.po_batches
  for select to anon, authenticated using (
    (status = 'open' and closes_at > now()) or exists (
      select 1 from public.po_products p
      where p.id = product_id and p.seller_id = (select auth.uid())
    )
  );
drop policy if exists "po_batches_seller_insert" on public.po_batches;
create policy "po_batches_seller_insert" on public.po_batches
  for insert to authenticated with check (exists (
    select 1 from public.po_products p
    where p.id = product_id and p.seller_id = (select auth.uid())
  ));
drop policy if exists "po_batches_seller_update" on public.po_batches;
create policy "po_batches_seller_update" on public.po_batches
  for update to authenticated using (exists (
    select 1 from public.po_products p
    where p.id = product_id and p.seller_id = (select auth.uid())
  )) with check (exists (
    select 1 from public.po_products p
    where p.id = product_id and p.seller_id = (select auth.uid())
  ));

drop policy if exists "po_orders_buyer_or_seller_read" on public.po_orders;
create policy "po_orders_buyer_or_seller_read" on public.po_orders
  for select to authenticated using (
    buyer_id = (select auth.uid()) or exists (
      select 1 from public.po_batches b
      join public.po_products p on p.id = b.product_id
      where b.id = batch_id and p.seller_id = (select auth.uid())
    )
  );

create or replace function public.po_create_batch(
  p_seller_name text,
  p_faculty text,
  p_whatsapp text,
  p_product_name text,
  p_description text,
  p_category text,
  p_price_idr integer,
  p_batch_title text,
  p_quota integer,
  p_closes_at timestamptz,
  p_pickup_at timestamptz,
  p_pickup_point text,
  p_pickup_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_product_id uuid;
  v_batch_id uuid;
begin
  if v_user_id is null then raise exception 'Silakan masuk sebagai penjual.'; end if;
  if char_length(trim(coalesce(p_seller_name, ''))) not between 2 and 80
    or char_length(trim(coalesce(p_faculty, ''))) not between 2 and 120
    or char_length(trim(coalesce(p_whatsapp, ''))) not between 8 and 24
    or char_length(trim(coalesce(p_product_name, ''))) not between 2 and 100
    or char_length(trim(coalesce(p_batch_title, ''))) not between 2 and 100
    or p_price_idr is null or p_price_idr < 1000
    or p_quota is null or p_quota < 1 or p_quota > 10000
    or p_closes_at is null or p_closes_at <= now()
    or p_pickup_at is null or p_pickup_at <= p_closes_at
    or char_length(trim(coalesce(p_pickup_point, ''))) not between 2 and 160 then
    raise exception 'Periksa kembali data produk dan jadwal PO.';
  end if;

  insert into public.po_sellers (user_id, display_name, faculty, whatsapp)
  values (v_user_id, trim(p_seller_name), trim(p_faculty), trim(p_whatsapp))
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    faculty = excluded.faculty,
    whatsapp = excluded.whatsapp,
    updated_at = now();

  insert into public.po_products (seller_id, name, description, category, price_idr)
  values (v_user_id, trim(p_product_name), trim(coalesce(p_description, '')),
    trim(coalesce(p_category, 'Lainnya')), p_price_idr)
  returning id into v_product_id;

  insert into public.po_batches (
    product_id, title, quota, closes_at, pickup_at, pickup_point, pickup_note
  ) values (
    v_product_id, trim(p_batch_title), p_quota, p_closes_at, p_pickup_at,
    trim(p_pickup_point), trim(coalesce(p_pickup_note, ''))
  ) returning id into v_batch_id;

  return v_batch_id;
end;
$$;

create or replace function public.po_seller_update_order_status(
  p_order_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.po_orders%rowtype;
  v_batch public.po_batches%rowtype;
begin
  if p_status not in ('confirmed', 'ready', 'picked_up', 'cancelled') then
    raise exception 'Status pesanan tidak valid.';
  end if;

  select o.* into v_order
  from public.po_orders o
  join public.po_batches b on b.id = o.batch_id
  join public.po_products p on p.id = b.product_id
  where o.id = p_order_id and p.seller_id = auth.uid()
  for update of o;
  if not found then raise exception 'Pesanan tidak ditemukan.'; end if;

  if not (
    (v_order.status = 'pending' and p_status in ('confirmed', 'cancelled')) or
    (v_order.status = 'confirmed' and p_status in ('ready', 'cancelled')) or
    (v_order.status = 'ready' and p_status in ('picked_up', 'cancelled'))
  ) then
    raise exception 'Perubahan status pesanan tidak diperbolehkan.';
  end if;

  update public.po_orders set status = p_status, updated_at = now() where id = v_order.id;

  if p_status = 'cancelled' then
    select * into v_batch from public.po_batches where id = v_order.batch_id for update;
    update public.po_batches
    set reserved_quantity = greatest(0, reserved_quantity - v_order.quantity),
        status = case when status = 'closed' and closes_at > now() then 'open' else status end,
        updated_at = now()
    where id = v_order.batch_id;
  end if;
end;
$$;

create or replace function public.po_place_order(
  p_batch_id uuid,
  p_quantity integer,
  p_buyer_name text,
  p_buyer_faculty text,
  p_buyer_whatsapp text
)
returns table (id uuid, order_code text, total_price_idr bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_batch public.po_batches%rowtype;
  v_price integer;
  v_order public.po_orders%rowtype;
begin
  if v_user_id is null then raise exception 'Silakan masuk sebelum memesan.'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 100 then
    raise exception 'Jumlah pesanan harus antara 1 dan 100.';
  end if;
  if char_length(trim(coalesce(p_buyer_name, ''))) not between 2 and 80
    or char_length(trim(coalesce(p_buyer_faculty, ''))) not between 2 and 120
    or char_length(trim(coalesce(p_buyer_whatsapp, ''))) not between 8 and 24 then
    raise exception 'Lengkapi nama, fakultas, dan nomor WhatsApp.';
  end if;

  select * into v_batch from public.po_batches where po_batches.id = p_batch_id for update;
  if not found then raise exception 'Batch PO tidak ditemukan.'; end if;
  if v_batch.status <> 'open' or v_batch.closes_at <= now() then
    raise exception 'PO ini sudah ditutup.';
  end if;
  if v_batch.reserved_quantity + p_quantity > v_batch.quota then
    raise exception 'Kuota tidak cukup untuk jumlah tersebut.';
  end if;

  select price_idr into v_price from public.po_products
    where po_products.id = v_batch.product_id and active = true;
  if not found then raise exception 'Produk ini sedang tidak tersedia.'; end if;

  insert into public.po_orders (
    order_code, batch_id, buyer_id, buyer_name, buyer_faculty,
    buyer_whatsapp, quantity, unit_price_idr
  ) values (
    'PO-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8)),
    v_batch.id, v_user_id, trim(p_buyer_name), trim(p_buyer_faculty),
    trim(p_buyer_whatsapp), p_quantity, v_price
  ) returning * into v_order;

  update public.po_batches
  set reserved_quantity = reserved_quantity + p_quantity,
      status = case when reserved_quantity + p_quantity >= quota then 'closed' else status end,
      updated_at = now()
  where po_batches.id = v_batch.id;

  return query select v_order.id, v_order.order_code, v_order.total_price_idr;
end;
$$;

create or replace function public.po_cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.po_orders%rowtype;
  v_batch public.po_batches%rowtype;
begin
  select * into v_order from public.po_orders
  where id = p_order_id and buyer_id = auth.uid() and status = 'pending'
  for update;
  if not found then raise exception 'Pesanan tidak dapat dibatalkan.'; end if;

  select * into v_batch from public.po_batches where id = v_order.batch_id for update;
  update public.po_orders set status = 'cancelled', updated_at = now() where id = v_order.id;
  update public.po_batches
  set reserved_quantity = greatest(0, reserved_quantity - v_order.quantity),
      status = case when status = 'closed' and closes_at > now() then 'open' else status end,
      updated_at = now()
  where id = v_order.batch_id;
end;
$$;

revoke select on public.po_sellers from anon, authenticated;
grant select (user_id, display_name, faculty) on public.po_sellers to anon, authenticated;
grant select on public.po_products, public.po_batches to anon, authenticated;
grant select on public.po_orders to authenticated;
grant insert, update on public.po_sellers to authenticated;
revoke insert, update, delete on public.po_products, public.po_batches from authenticated;
revoke all on function public.po_place_order(uuid, integer, text, text, text) from public, anon;
revoke all on function public.po_cancel_order(uuid) from public, anon;
revoke all on function public.po_create_batch(text, text, text, text, text, text, integer, text, integer, timestamptz, timestamptz, text, text) from public, anon;
revoke all on function public.po_seller_update_order_status(uuid, text) from public, anon;
grant execute on function public.po_place_order(uuid, integer, text, text, text) to authenticated;
grant execute on function public.po_cancel_order(uuid) to authenticated;
grant execute on function public.po_create_batch(text, text, text, text, text, text, integer, text, integer, timestamptz, timestamptz, text, text) to authenticated;
grant execute on function public.po_seller_update_order_status(uuid, text) to authenticated;

comment on table public.po_sellers is 'Seller profiles for the standalone Open PO campus marketplace.';
comment on table public.po_products is 'Open PO product catalog; isolated with po_ prefix for StudentPlace coexistence.';
