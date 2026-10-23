-- Fix ambiguous column references and use standard gen_random_uuid in po_place_order
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
  where po_products.id = v_batch.product_id and po_products.active = true;
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
