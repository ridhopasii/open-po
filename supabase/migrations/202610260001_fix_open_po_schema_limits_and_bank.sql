-- Migration: Fix OpenPO schema, remove artificial limits, and add seller payment details
-- Date: 2026-10-26

-- 1. Ensure po_products has photo_path and status columns
alter table if exists public.po_products
  add column if not exists photo_path text,
  add column if not exists status text default 'active';

-- 2. Add bank and QRIS payment details to po_sellers
alter table if exists public.po_sellers
  add column if not exists bank_name text,
  add column if not exists bank_number text,
  add column if not exists bank_holder text,
  add column if not exists qris_nmid text;

drop function if exists public.po_get_my_seller_profile();
create or replace function public.po_get_my_seller_profile()
returns table (
  display_name text,
  faculty text,
  whatsapp text,
  avatar_path text,
  bank_name text,
  bank_number text,
  bank_holder text,
  qris_nmid text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.display_name,
    s.faculty,
    s.whatsapp,
    s.avatar_path,
    s.bank_name,
    s.bank_number,
    s.bank_holder,
    s.qris_nmid
  from public.po_sellers s
  where s.user_id = (select auth.uid());
$$;

revoke all on function public.po_get_my_seller_profile() from public, anon;
grant execute on function public.po_get_my_seller_profile() to authenticated;

-- 3. Relax artificial quota constraint on po_batches (allow quota >= 1 without arbitrary 10000 ceiling)
alter table if exists public.po_batches drop constraint if exists po_batches_quota_check;
alter table if exists public.po_batches add constraint po_batches_quota_check check (quota >= 1);

-- 4. Update po_create_batch RPC to remove quota > 10000 cap
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
    or p_quota is null or p_quota < 1
    or p_closes_at is null or p_closes_at <= now()
    or p_pickup_at is null or p_pickup_at <= p_closes_at
    or char_length(trim(coalesce(p_pickup_point, ''))) not between 2 and 160 then
    raise exception 'Periksa kembali data produk dan jadwal PO.';
  end if;

  insert into public.po_sellers (user_id, display_name, faculty, whatsapp)
  values (v_user_id, trim(p_seller_name), trim(p_faculty), trim(p_whatsapp))
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      faculty = excluded.faculty,
      whatsapp = excluded.whatsapp,
      updated_at = now();

  insert into public.po_products (seller_id, name, description, category, price_idr)
  values (v_user_id, trim(p_product_name), trim(coalesce(p_description, '')), trim(coalesce(p_category, 'Lainnya')), p_price_idr)
  returning id into v_product_id;

  insert into public.po_batches (
    product_id, title, quota, closes_at, pickup_at, pickup_point, pickup_note, status
  ) values (
    v_product_id, trim(p_batch_title), p_quota, p_closes_at, p_pickup_at,
    trim(p_pickup_point), trim(coalesce(p_pickup_note, '')), 'open'
  )
  returning id into v_batch_id;

  return v_batch_id;
end;
$$;

-- 5. Update po_place_order RPC to remove p_quantity > 100 limit and allow any quantity within quota
create or replace function public.po_place_order(
  p_batch_id uuid,
  p_quantity integer,
  p_buyer_name text,
  p_buyer_faculty text,
  p_buyer_whatsapp text,
  p_client_request_id uuid
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
  v_existing public.po_orders%rowtype;
begin
  if v_user_id is null then raise exception 'Silakan masuk sebelum memesan.'; end if;
  if p_client_request_id is null then raise exception 'Kode request unik diperlukan.'; end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Jumlah pesanan minimal 1.';
  end if;
  if char_length(trim(coalesce(p_buyer_name, ''))) not between 2 and 80
    or char_length(trim(coalesce(p_buyer_faculty, ''))) not between 2 and 120
    or char_length(trim(coalesce(p_buyer_whatsapp, ''))) not between 8 and 24 then
    raise exception 'Lengkapi nama, fakultas, dan nomor WhatsApp.';
  end if;

  select * into v_batch from public.po_batches where po_batches.id = p_batch_id for update;
  if not found then raise exception 'Batch PO tidak ditemukan.'; end if;

  select * into v_existing from public.po_orders
  where po_orders.buyer_id = v_user_id and po_orders.client_request_id = p_client_request_id;
  if found then
    if v_existing.batch_id <> p_batch_id
      or v_existing.quantity <> p_quantity
      or v_existing.buyer_name <> trim(p_buyer_name)
      or v_existing.buyer_faculty <> trim(p_buyer_faculty)
      or v_existing.buyer_whatsapp <> trim(p_buyer_whatsapp) then
      raise exception 'Permintaan ini sudah dipakai untuk pesanan lain. Muat ulang halaman lalu coba lagi.';
    end if;
    return query select v_existing.id, v_existing.order_code, v_existing.total_price_idr;
    return;
  end if;

  if v_batch.status <> 'open' or v_batch.closes_at <= now() then
    raise exception 'PO ini sudah ditutup.';
  end if;
  if v_batch.reserved_quantity + p_quantity > v_batch.quota then
    raise exception 'Kuota tidak cukup untuk jumlah tersebut.';
  end if;

  select po_products.price_idr into v_price from public.po_products
  where po_products.id = v_batch.product_id and (po_products.active = true or coalesce(po_products.status, 'active') = 'active');
  if not found then raise exception 'Produk ini sedang tidak tersedia.'; end if;

  insert into public.po_orders (
    order_code, batch_id, buyer_id, buyer_name, buyer_faculty,
    buyer_whatsapp, quantity, unit_price_idr, client_request_id
  ) values (
    'PO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    v_batch.id, v_user_id, trim(p_buyer_name), trim(p_buyer_faculty),
    trim(p_buyer_whatsapp), p_quantity, v_price, p_client_request_id
  ) returning * into v_order;

  update public.po_batches
  set reserved_quantity = po_batches.reserved_quantity + p_quantity,
      status = case when po_batches.reserved_quantity + p_quantity >= po_batches.quota then 'closed' else po_batches.status end,
      updated_at = now()
  where po_batches.id = v_batch.id;

  return query select v_order.id, v_order.order_code, v_order.total_price_idr;
end;
$$;
