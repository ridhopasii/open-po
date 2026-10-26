-- Migration: 202610260004_atomic_order_and_quota.sql
-- Purpose: Add order expiration (2 hours), atomic quota locking, and auto-release for expired orders
-- Idempotent: Can be run multiple times safely
-- Rollback instructions:
--   DROP FUNCTION IF EXISTS public.release_expired_po_orders();
--   DROP FUNCTION IF EXISTS public.po_place_order_v2;
--   ALTER TABLE public.po_orders DROP COLUMN IF EXISTS expires_at;

BEGIN;

-- 1. Ensure expires_at exists on po_orders (default: 2 hours from creation)
ALTER TABLE public.po_orders
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 hours');

-- Ensure seller verification fields exist
ALTER TABLE public.po_sellers
  ADD COLUMN IF NOT EXISTS verified_student BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'KTM Mahasiswa';

-- Index for efficient querying of pending expired orders
CREATE INDEX IF NOT EXISTS idx_po_orders_status_expires_at
  ON public.po_orders (status, expires_at)
  WHERE status = 'pending';

-- 2. Function to automatically release expired pending orders and restore batch quota
CREATE OR REPLACE FUNCTION public.release_expired_po_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_count integer := 0;
BEGIN
  -- Loop through expired pending orders
  FOR v_rec IN
    SELECT id, batch_id, quantity
    FROM public.po_orders
    WHERE status = 'pending'
      AND payment_proof_path IS NULL
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
    FOR UPDATE
  LOOP
    -- Mark order as cancelled due to expiration
    UPDATE public.po_orders
    SET status = 'cancelled',
        notes = CASE 
                  WHEN notes IS NULL OR notes = '' THEN '[Dibatalkan sistem: batas bayar 2 jam kedaluwarsa]'
                  ELSE notes || ' [Dibatalkan sistem: batas bayar 2 jam kedaluwarsa]'
                END,
        updated_at = NOW()
    WHERE id = v_rec.id;

    -- Return quota to batch
    UPDATE public.po_batches
    SET reserved_quantity = GREATEST(0, reserved_quantity - v_rec.quantity),
        status = CASE 
                   WHEN status = 'closed' AND closes_at > NOW() AND (reserved_quantity - v_rec.quantity) < quota 
                   THEN 'open' 
                   ELSE status 
                 END,
        updated_at = NOW()
    WHERE id = v_rec.batch_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 3. Atomic Order Placement Function v2 supporting guest & authenticated buyers
CREATE OR REPLACE FUNCTION public.po_place_order_v2(
  p_batch_id uuid,
  p_quantity integer,
  p_buyer_name text,
  p_buyer_faculty text,
  p_buyer_whatsapp text,
  p_payment_method text,
  p_notes text,
  p_client_request_id uuid,
  p_buyer_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  order_code text,
  quantity integer,
  unit_price_idr integer,
  total_price_idr bigint,
  status text,
  payment_method text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch public.po_batches%rowtype;
  v_price integer;
  v_order public.po_orders%rowtype;
  v_existing public.po_orders%rowtype;
  v_clean_code text;
  v_chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_i integer;
  v_rand text := '';
BEGIN
  -- First trigger release of any expired orders on this batch
  PERFORM public.release_expired_po_orders();

  IF p_client_request_id IS NULL THEN 
    RAISE EXCEPTION 'ID unik permintaan (requestId) wajib disertakan.'; 
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 100 THEN
    RAISE EXCEPTION 'Jumlah pesanan harus antara 1 dan 100 item.';
  END IF;

  IF char_length(trim(coalesce(p_buyer_name, ''))) NOT BETWEEN 2 AND 80
     OR char_length(trim(coalesce(p_buyer_faculty, ''))) NOT BETWEEN 2 AND 120
     OR char_length(trim(coalesce(p_buyer_whatsapp, ''))) NOT BETWEEN 8 AND 24 THEN
    RAISE EXCEPTION 'Lengkapi nama (2-80 huruf), fakultas, dan nomor WhatsApp yang sah.';
  END IF;

  -- Lock batch row for concurrency protection
  SELECT * INTO v_batch 
  FROM public.po_batches 
  WHERE po_batches.id = p_batch_id 
  FOR UPDATE;

  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Batch PO tidak ditemukan.'; 
  END IF;

  -- Idempotency check: if already processed for this requestId
  SELECT * INTO v_existing 
  FROM public.po_orders
  WHERE po_orders.client_request_id = p_client_request_id;

  IF FOUND THEN
    RETURN QUERY 
    SELECT v_existing.id, v_existing.order_code, v_existing.quantity,
           v_existing.unit_price_idr, v_existing.total_price_idr,
           v_existing.status, v_existing.payment_method, v_existing.expires_at;
    RETURN;
  END IF;

  -- Batch status & deadline check
  IF v_batch.status <> 'open' OR v_batch.closes_at <= NOW() THEN
    RAISE EXCEPTION 'PO ini sudah ditutup atau melewati batas waktu pemesanan.';
  END IF;

  -- Strict atomic quota check
  IF v_batch.reserved_quantity + p_quantity > v_batch.quota THEN
    RAISE EXCEPTION 'Mohon maaf, sisa kuota PO tidak mencukupi untuk jumlah yang kamu pesan.';
  END IF;

  -- Get active product price
  SELECT po_products.price_idr INTO v_price 
  FROM public.po_products
  WHERE po_products.id = v_batch.product_id AND po_products.active = true;

  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Produk ini sedang tidak aktif.'; 
  END IF;

  -- Generate 10-char Base32 random code PO-XXXXXXXXXX
  FOR v_i IN 1..10 LOOP
    v_rand := v_rand || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
  END LOOP;
  v_clean_code := 'PO-' || v_rand;

  -- Insert order record
  INSERT INTO public.po_orders (
    order_code,
    batch_id,
    buyer_id,
    buyer_name,
    buyer_faculty,
    buyer_whatsapp,
    quantity,
    unit_price_idr,
    payment_method,
    notes,
    client_request_id,
    status,
    expires_at
  ) VALUES (
    v_clean_code,
    v_batch.id,
    p_buyer_id,
    trim(p_buyer_name),
    trim(p_buyer_faculty),
    trim(p_buyer_whatsapp),
    p_quantity,
    v_price,
    coalesce(p_payment_method, 'cod'),
    trim(coalesce(p_notes, '')),
    p_client_request_id,
    'pending',
    NOW() + INTERVAL '2 hours'
  ) RETURNING * INTO v_order;

  -- Increment reserved quota atomically
  UPDATE public.po_batches
  SET reserved_quantity = po_batches.reserved_quantity + p_quantity,
      status = CASE 
                 WHEN po_batches.reserved_quantity + p_quantity >= po_batches.quota THEN 'closed' 
                 ELSE po_batches.status 
               END,
      updated_at = NOW()
  WHERE po_batches.id = v_batch.id;

  RETURN QUERY 
  SELECT v_order.id, v_order.order_code, v_order.quantity,
         v_order.unit_price_idr, v_order.total_price_idr,
         v_order.status, v_order.payment_method, v_order.expires_at;
END;
$$;

COMMIT;
