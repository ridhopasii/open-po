-- ============================================================
-- OpenPO — Seed Data (Demo/Development)
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING)
-- ============================================================

-- NOTE: Replace these UUIDs with real auth.users IDs in production
-- These are for local development / demo only

-- Demo sellers (requires manual auth.users entries)
-- INSERT INTO po_sellers (user_id, display_name, faculty, whatsapp, verified) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'Nadia Putri', 'Fakultas Pertanian', '081234567801', true),
--   ('00000000-0000-0000-0000-000000000002', 'Rizky Rahman', 'Fakultas Teknik', '081234567802', true),
--   ('00000000-0000-0000-0000-000000000003', 'Siti Aisyah', 'Fakultas Ekonomi', '081234567803', false)
-- ON CONFLICT (user_id) DO NOTHING;

-- Uncomment and adapt above after creating test users via Supabase Auth dashboard
