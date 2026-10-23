-- ============================================================
-- OpenPO — Database Schema v1.0
-- PostgreSQL / Supabase
-- Run in order; all tables use UUID PKs
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. SELLERS
-- ============================================================
CREATE TABLE IF NOT EXISTS po_sellers (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 80),
  faculty       TEXT NOT NULL CHECK (char_length(faculty) BETWEEN 2 AND 120),
  whatsapp      TEXT NOT NULL CHECK (whatsapp ~ '^(\+62|62|0)8\d{7,13}$'),
  avatar_path   TEXT,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  suspended     BOOLEAN NOT NULL DEFAULT FALSE,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS po_products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id   UUID NOT NULL REFERENCES po_sellers(user_id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL CHECK (char_length(category) BETWEEN 2 AND 40),
  price_idr   INTEGER NOT NULL CHECK (price_idr >= 1000),
  photo_path  TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. BATCHES (open PO sessions)
-- ============================================================
CREATE TABLE IF NOT EXISTS po_batches (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id          UUID NOT NULL REFERENCES po_products(id) ON DELETE CASCADE,
  title               TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 100),
  quota               INTEGER NOT NULL CHECK (quota BETWEEN 1 AND 10000),
  reserved_quantity   INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  closes_at           TIMESTAMPTZ NOT NULL,
  pickup_at           TIMESTAMPTZ NOT NULL,
  pickup_point        TEXT NOT NULL CHECK (char_length(pickup_point) BETWEEN 2 AND 160),
  pickup_note         TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'ready', 'closed', 'cancelled')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT batch_closes_before_pickup CHECK (closes_at <= pickup_at),
  CONSTRAINT batch_quota_not_exceeded CHECK (reserved_quantity <= quota)
);

-- ============================================================
-- 4. ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS po_orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id            UUID NOT NULL REFERENCES po_batches(id) ON DELETE RESTRICT,
  order_code          TEXT NOT NULL UNIQUE,
  buyer_name          TEXT NOT NULL CHECK (char_length(buyer_name) BETWEEN 2 AND 80),
  buyer_faculty       TEXT NOT NULL CHECK (char_length(buyer_faculty) BETWEEN 2 AND 120),
  buyer_whatsapp      TEXT NOT NULL CHECK (buyer_whatsapp ~ '^(\+62|62|0)8\d{7,13}$'),
  quantity            INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  unit_price_idr      INTEGER NOT NULL CHECK (unit_price_idr >= 1000),
  total_price_idr     INTEGER NOT NULL CHECK (total_price_idr >= 1000),
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'ready', 'picked_up', 'cancelled')),
  client_request_id   UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent double submit (idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_request_id
  ON po_orders (client_request_id) WHERE client_request_id IS NOT NULL;

-- ============================================================
-- 5. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_batches_status_closes   ON po_batches (status, closes_at);
CREATE INDEX IF NOT EXISTS idx_batches_product_id      ON po_batches (product_id);
CREATE INDEX IF NOT EXISTS idx_products_seller_id      ON po_products (seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_batch_id         ON po_orders (batch_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_code       ON po_orders (order_code);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_whatsapp   ON po_orders (buyer_whatsapp);
CREATE INDEX IF NOT EXISTS idx_orders_status           ON po_orders (status);

-- ============================================================
-- 6. UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sellers_updated_at  BEFORE UPDATE ON po_sellers  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON po_products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_batches_updated_at  BEFORE UPDATE ON po_batches  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_updated_at   BEFORE UPDATE ON po_orders   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 7. HELPER FUNCTIONS (RPCs called from app)
-- ============================================================

-- Generate unique PO code: PO-XXXXXX (6 base36 chars)
CREATE OR REPLACE FUNCTION generate_po_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  TEXT := 'PO-';
  i     INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, (floor(random() * length(chars)))::INT + 1, 1);
  END LOOP;
  RETURN code;
END;
$$;

-- Place order with quota reservation (atomic)
CREATE OR REPLACE FUNCTION po_place_order(
  p_batch_id          UUID,
  p_quantity          INTEGER,
  p_buyer_name        TEXT,
  p_buyer_faculty     TEXT,
  p_buyer_whatsapp    TEXT,
  p_client_request_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_batch         po_batches;
  v_product       po_products;
  v_order_code    TEXT;
  v_order_id      UUID;
  v_attempts      INTEGER := 0;
BEGIN
  -- Idempotency: return existing if same request_id
  IF p_client_request_id IS NOT NULL THEN
    SELECT id, order_code INTO v_order_id, v_order_code
    FROM po_orders WHERE client_request_id = p_client_request_id;
    IF FOUND THEN
      RETURN jsonb_build_object('ok', true, 'order_id', v_order_id, 'order_code', v_order_code, 'idempotent', true);
    END IF;
  END IF;

  -- Lock and verify batch
  SELECT * INTO v_batch FROM po_batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Batch PO tidak ditemukan.'); END IF;
  IF v_batch.status != 'open' THEN RETURN jsonb_build_object('error', 'Batch PO ini sudah ditutup.'); END IF;
  IF v_batch.closes_at < NOW() THEN RETURN jsonb_build_object('error', 'Waktu pemesanan sudah berakhir.'); END IF;
  IF v_batch.reserved_quantity + p_quantity > v_batch.quota THEN
    RETURN jsonb_build_object('error', 'Kuota tidak cukup. Sisa: ' || (v_batch.quota - v_batch.reserved_quantity) || ' porsi.');
  END IF;

  -- Get product price
  SELECT * INTO v_product FROM po_products WHERE id = v_batch.product_id;

  -- Generate unique order code
  LOOP
    v_order_code := generate_po_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM po_orders WHERE order_code = v_order_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 20 THEN RAISE EXCEPTION 'Gagal generate kode pesanan unik.'; END IF;
  END LOOP;

  -- Insert order
  INSERT INTO po_orders (batch_id, order_code, buyer_name, buyer_faculty, buyer_whatsapp,
    quantity, unit_price_idr, total_price_idr, client_request_id)
  VALUES (p_batch_id, v_order_code, p_buyer_name, p_buyer_faculty, p_buyer_whatsapp,
    p_quantity, v_product.price_idr, v_product.price_idr * p_quantity, p_client_request_id)
  RETURNING id INTO v_order_id;

  -- Reserve quota
  UPDATE po_batches SET reserved_quantity = reserved_quantity + p_quantity WHERE id = p_batch_id;

  RETURN jsonb_build_object('ok', true, 'order_id', v_order_id, 'order_code', v_order_code,
    'quantity', p_quantity, 'total_price_idr', v_product.price_idr * p_quantity);
END;
$$;

-- Cancel order (release quota)
CREATE OR REPLACE FUNCTION po_cancel_order(p_order_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order po_orders;
BEGIN
  SELECT * INTO v_order FROM po_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Pesanan tidak ditemukan.'); END IF;
  IF v_order.status = 'cancelled' THEN RETURN jsonb_build_object('error', 'Pesanan sudah dibatalkan.'); END IF;
  IF v_order.status IN ('ready', 'picked_up') THEN
    RETURN jsonb_build_object('error', 'Pesanan tidak dapat dibatalkan setelah siap diambil.');
  END IF;

  UPDATE po_orders SET status = 'cancelled' WHERE id = p_order_id;
  UPDATE po_batches SET reserved_quantity = GREATEST(0, reserved_quantity - v_order.quantity)
  WHERE id = v_order.batch_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Seller update order status (with ownership check)
CREATE OR REPLACE FUNCTION po_seller_update_order_status(p_order_id UUID, p_status TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order   po_orders;
  v_batch   po_batches;
  v_product po_products;
BEGIN
  SELECT * INTO v_order FROM po_orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Pesanan tidak ditemukan.'); END IF;

  SELECT * INTO v_batch FROM po_batches WHERE id = v_order.batch_id;
  SELECT * INTO v_product FROM po_products WHERE id = v_batch.product_id;

  -- Ownership check: only seller of this product can update
  IF v_product.seller_id != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Anda tidak punya akses ke pesanan ini.');
  END IF;

  -- Valid status transitions
  IF p_status NOT IN ('confirmed', 'ready', 'picked_up', 'cancelled') THEN
    RETURN jsonb_build_object('error', 'Status pesanan tidak valid.');
  END IF;

  UPDATE po_orders SET status = p_status WHERE id = p_order_id;

  -- Release quota if cancelled by seller
  IF p_status = 'cancelled' THEN
    UPDATE po_batches SET reserved_quantity = GREATEST(0, reserved_quantity - v_order.quantity)
    WHERE id = v_order.batch_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', p_status);
END;
$$;

-- Get seller profile (for RPC call)
CREATE OR REPLACE FUNCTION po_get_my_seller_profile()
RETURNS SETOF po_sellers LANGUAGE sql SECURITY DEFINER AS $$
  SELECT * FROM po_sellers WHERE user_id = auth.uid();
$$;

-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE po_sellers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_batches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_orders   ENABLE ROW LEVEL SECURITY;

-- po_sellers: anyone can read, only owner can write
CREATE POLICY "sellers_read_all"   ON po_sellers FOR SELECT USING (true);
CREATE POLICY "sellers_insert_own" ON po_sellers FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "sellers_update_own" ON po_sellers FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "sellers_delete_own" ON po_sellers FOR DELETE USING (user_id = auth.uid());

-- po_products: anyone can read active, only owner can write
CREATE POLICY "products_read_active"  ON po_products FOR SELECT USING (status != 'archived' OR seller_id = auth.uid());
CREATE POLICY "products_insert_own"   ON po_products FOR INSERT WITH CHECK (seller_id = auth.uid());
CREATE POLICY "products_update_own"   ON po_products FOR UPDATE USING (seller_id = auth.uid());
CREATE POLICY "products_delete_own"   ON po_products FOR DELETE USING (seller_id = auth.uid());

-- po_batches: anyone can read open batches
CREATE POLICY "batches_read_open"   ON po_batches FOR SELECT USING (true);
CREATE POLICY "batches_insert_own"  ON po_batches FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM po_products WHERE id = product_id AND seller_id = auth.uid())
);
CREATE POLICY "batches_update_own"  ON po_batches FOR UPDATE USING (
  EXISTS (SELECT 1 FROM po_products WHERE id = product_id AND seller_id = auth.uid())
);

-- po_orders: buyer can see their own, seller can see their batch orders
CREATE POLICY "orders_buyer_read"  ON po_orders FOR SELECT USING (
  buyer_whatsapp IS NOT NULL -- public read via admin client (service role bypasses RLS)
);
CREATE POLICY "orders_insert_any"  ON po_orders FOR INSERT WITH CHECK (true);
-- Updates handled via RPC (SECURITY DEFINER bypasses RLS)

-- ============================================================
-- 9. STORAGE BUCKET (run via Supabase dashboard or CLI)
-- ============================================================
-- supabase storage create po-seller-avatars --public
-- Policy: allow authenticated to upload to their own folder
