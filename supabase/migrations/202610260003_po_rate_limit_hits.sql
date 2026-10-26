-- Migration: 202610260003_po_rate_limit_hits.sql
-- Purpose: Distributed rate limiting table and atomic increment function for OpenPO
-- Idempotent: Safe to run repeatedly
-- Rollback instructions:
--   DROP FUNCTION IF EXISTS public.hit_po_rate_limit(TEXT, INT);
--   DROP TABLE IF EXISTS public.po_rate_limit_hits;

BEGIN;

CREATE TABLE IF NOT EXISTS public.po_rate_limit_hits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_po_rate_limit_hits_expires_at 
  ON public.po_rate_limit_hits (expires_at);

-- RLS: Service role only (internal use)
ALTER TABLE public.po_rate_limit_hits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'po_rate_limit_hits' AND policyname = 'po_rate_limit_service_role'
  ) THEN
    CREATE POLICY po_rate_limit_service_role 
      ON public.po_rate_limit_hits 
      FOR ALL 
      TO service_role 
      USING (true) 
      WITH CHECK (true);
  END IF;
END $$;

-- Atomic hit counter
CREATE OR REPLACE FUNCTION public.hit_po_rate_limit(p_key TEXT, p_window_seconds INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  -- Clear out expired entry if present
  DELETE FROM public.po_rate_limit_hits WHERE key = p_key AND expires_at < v_now;

  INSERT INTO public.po_rate_limit_hits (key, count, expires_at)
  VALUES (p_key, 1, v_now + (p_window_seconds || ' seconds')::INTERVAL)
  ON CONFLICT (key) DO UPDATE
  SET count = public.po_rate_limit_hits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

COMMIT;
