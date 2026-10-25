import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { passcode, email, password } = body;

  const validMasterPasscode = process.env.ADMIN_PASSWORD || "PolmedUSU2026AdminSecure!X9";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@openpo.id";

  let isAuthorized = false;

  const enteredKey = passcode || password;

  // 1. Cek Master Admin Passcode
  if (enteredKey && enteredKey.trim() === validMasterPasscode.trim()) {
    isAuthorized = true;
  }

  // 2. Cek Akun Supabase Admin jika input email & password
  if (!isAuthorized && email && password) {
    if (email.trim().toLowerCase() === adminEmail.toLowerCase()) {
      try {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        if (!error && data?.user) {
          isAuthorized = true;
        }
      } catch {
        // Fallback jika koneksi supabase gagal
      }
    }
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Kata sandi atau kredensial Superadmin salah." },
      { status: 401 },
    );
  }

  // Set secure HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set("openpo_admin_token", "admin_authenticated_session", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 jam
  });

  return NextResponse.json({ ok: true, message: "Akses Superadmin diberikan." });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("openpo_admin_token");
  return NextResponse.json({ ok: true, message: "Sesi Superadmin telah dikunci." });
}
