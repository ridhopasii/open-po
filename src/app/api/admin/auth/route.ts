import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminToken, logAdminAudit } from "@/lib/admin-auth";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import crypto from "crypto";

export async function POST(request: Request) {
  // 1. Rate limiting: Maksimal 5 percobaan per IP per 15 menit
  const clientIp = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(`admin_login:${clientIp}`, 5, 15 * 60 * 1000);

  if (!rateLimitResult.ok) {
    return NextResponse.json(
      {
        error: `Terlalu banyak percobaan masuk gagal. Coba lagi dalam ${rateLimitResult.retryAfterSeconds} detik.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds) },
      },
    );
  }

  const body = await request.json().catch(() => ({}));
  const { passcode, email, password } = body;

  const validMasterPasscode = process.env.ADMIN_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL;

  let isAuthorized = false;
  let actorIdentity = "unknown";
  let assignedRole: "superadmin" | "admin" | "moderator" = "admin";

  // 2. Autentikasi via Akun Supabase (Login berbasis akun & peran)
  if (email && password) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: String(email).trim(),
        password: String(password),
      });

      if (!error && data?.user) {
        const user = data.user;
        const role = user.app_metadata?.role || user.user_metadata?.role;
        const isMatchedEmail = adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase();

        if (role === "admin" || role === "superadmin" || isMatchedEmail) {
          isAuthorized = true;
          actorIdentity = user.email || user.id;
          assignedRole = role === "superadmin" || isMatchedEmail ? "superadmin" : "admin";
        }
      }
    } catch {
      // Supabase auth attempt failed
    }
  }

  // 3. Fallback: Autentikasi via ADMIN_PASSWORD environment variable
  // Wajib diset di environment variables, TIDAK BOLEH fallback ke string hardcoded
  if (!isAuthorized && passcode && validMasterPasscode) {
    const inputPasscode = String(passcode).trim();
    const envPasscode = validMasterPasscode.trim();

    const inBuf = Buffer.from(inputPasscode);
    const envBuf = Buffer.from(envPasscode);

    if (inBuf.length === envBuf.length && crypto.timingSafeEqual(inBuf, envBuf)) {
      isAuthorized = true;
      actorIdentity = "master_passcode_holder";
      assignedRole = "superadmin";
    }
  }

  if (!isAuthorized) {
    await logAdminAudit({
      actor: `failed_attempt:${clientIp}`,
      action: "admin_login_failed",
      targetType: "system",
      targetId: "admin_auth",
      details: { email: email ? String(email).slice(0, 3) + "***" : undefined },
      ipAddress: clientIp,
    });

    return NextResponse.json(
      { error: "Kredensial atau kata sandi admin tidak sesuai." },
      { status: 401 },
    );
  }

  // Set secure signed HTTP-only cookie
  const signedToken = createAdminToken(assignedRole);
  const cookieStore = await cookies();
  cookieStore.set("openpo_admin_token", signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 jam
  });

  await logAdminAudit({
    actor: actorIdentity,
    action: "admin_login_success",
    targetType: "system",
    targetId: "admin_auth",
    details: { role: assignedRole },
    ipAddress: clientIp,
  });

  return NextResponse.json({ ok: true, message: "Akses admin berhasil diverifikasi." });
}

export async function DELETE(request: Request) {
  const clientIp = getClientIdentifier(request);
  const cookieStore = await cookies();
  cookieStore.delete("openpo_admin_token");

  await logAdminAudit({
    actor: "admin_user",
    action: "admin_logout",
    targetType: "system",
    targetId: "admin_auth",
    ipAddress: clientIp,
  });

  return NextResponse.json({ ok: true, message: "Sesi admin telah ditutup." });
}
