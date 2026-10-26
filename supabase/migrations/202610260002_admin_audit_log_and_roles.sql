-- ============================================================================
-- Migrasi: 202610260002_admin_audit_log_and_roles.sql
-- Deskripsi: Tabel audit log admin untuk melacak seluruh aksi moderasi,
--            perubahan status pesanan, batch, serta suspensi penjual.
-- Rollback: DROP TABLE IF EXISTS public.admin_audit_log CASCADE;
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indeks untuk pencarian dan audit performa tinggi
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON public.admin_audit_log (actor);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON public.admin_audit_log (target_type, target_id);

-- RLS: Hanya service_role yang dapat membaca dan menulis audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_audit_log' AND policyname = 'admin_audit_log_service_role_all'
  ) THEN
    CREATE POLICY admin_audit_log_service_role_all ON public.admin_audit_log
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
