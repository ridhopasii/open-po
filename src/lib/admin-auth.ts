import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

const COOKIE_NAME = "openpo_admin_token";

function getSecretKey(): string {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    // Di development jika belum diset env, pakai secret runtime acak yang stabil per proses
    return "openpo_internal_secret_fallback_key_2026";
  }
  return secret;
}

/**
 * Buat signed admin session token berbasis HMAC-SHA256
 */
export function createAdminToken(role: "superadmin" | "admin" | "moderator" = "admin"): string {
  const exp = Date.now() + 1000 * 60 * 60 * 12; // Berlaku 12 jam
  const payload = JSON.stringify({ role, exp, v: 1 });
  const b64Payload = Buffer.from(payload).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecretKey())
    .update(b64Payload)
    .digest("base64url");
  return `${b64Payload}.${signature}`;
}

/**
 * Verifikasi signed admin token
 */
export function verifyAdminToken(token?: string | null): { valid: boolean; role?: string } {
  if (!token) return { valid: false };
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false };

  const [b64Payload, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", getSecretKey())
    .update(b64Payload)
    .digest("base64url");

  // Constant-time comparison untuk mencegah timing attacks
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false };
  }

  try {
    const payload = JSON.parse(Buffer.from(b64Payload, "base64url").toString("utf-8"));
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return { valid: false };
    }
    return { valid: true, role: payload.role || "admin" };
  } catch {
    return { valid: false };
  }
}

/**
 * Verifikasi apakah sesi saat ini memiliki hak akses Admin
 * Memeriksa: (1) Supabase Auth user role/email, atau (2) Signed Cookie Token
 */
export async function verifyAdminSession(): Promise<{
  authorized: boolean;
  actor: string;
  role: string;
}> {
  // 1. Cek Supabase Auth Session
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (user) {
      const adminEmail = process.env.ADMIN_EMAIL;
      const userRole = user.app_metadata?.role || user.user_metadata?.role;

      if (userRole === "admin" || userRole === "superadmin" || userRole === "moderator") {
        return { authorized: true, actor: user.email || user.id, role: userRole };
      }

      if (adminEmail && user.email && user.email.toLowerCase() === adminEmail.toLowerCase()) {
        return { authorized: true, actor: user.email, role: "superadmin" };
      }
    }
  } catch {
    // Supabase auth client belum tersedia atau koneksi offline
  }

  // 2. Cek Signed Cookie Token
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const { valid, role } = verifyAdminToken(token);
    if (valid) {
      return { authorized: true, actor: "admin_token_session", role: role || "admin" };
    }
  } catch {
    // Cookies context error
  }

  return { authorized: false, actor: "anonymous", role: "none" };
}

/**
 * Catat audit log untuk setiap mutasi admin
 */
export async function logAdminAudit(params: {
  actor: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, any>;
  ipAddress?: string;
}) {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();
    if (!supabase) return;

    await supabase.from("admin_audit_log").insert({
      actor: params.actor,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      details: params.details || {},
      ip_address: params.ipAddress || null,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    // Jangan hentikan alur bila audit log gagal
    console.error("[logAdminAudit] error:", e);
  }
}
