-- ============================================================
-- OpenPO — Migration 000002: Enhance Orders & Batches
-- 1. Support guest orders without requiring an auth.users id
-- 2. Add payment tracking & order notes
-- 3. Add batch product variants
-- ============================================================

-- 1. Allow guest buyers without accounts
ALTER TABLE po_orders ALTER COLUMN buyer_id DROP NOT NULL;

-- 2. Add payment and notes tracking to po_orders
ALTER TABLE po_orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cod';
ALTER TABLE po_orders ADD COLUMN IF NOT EXISTS payment_proof_path TEXT;
ALTER TABLE po_orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Add product variants to po_batches
ALTER TABLE po_batches ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
