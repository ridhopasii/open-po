"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next =
    params.get("next")?.startsWith("/") && !params.get("next")?.startsWith("//")
      ? params.get("next")!
      : "/penjual";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        setMessage("Cek emailmu untuk tautan konfirmasi, lalu kembali untuk masuk.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ada kendala. Coba lagi sebentar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="text-link">
          ← Kembali ke etalase
        </Link>
        <span className="section-label">AKUN OPEN PO</span>
        <h1>{mode === "signin" ? "Senang melihatmu lagi." : "Mulai dari satu akun."}</h1>
        <p>
          {mode === "signin"
            ? "Masuk untuk memesan atau mengelola PO kampusmu."
            : "Buat akun untuk mulai pesan atau membuka PO."}
        </p>

        <form className="form-stack" onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Kata sandi
            <input
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="button" disabled={busy}>
            {busy ? "Sebentar…" : mode === "signin" ? "Masuk" : "Buat akun"}
          </button>
          {message && (
            <p role="status" className="form-message">
              {message}
            </p>
          )}
        </form>

        <p className="auth-switch">
          {mode === "signin" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
          <Link
            href={
              mode === "signin"
                ? `/daftar?next=${encodeURIComponent(next)}`
                : `/masuk?next=${encodeURIComponent(next)}`
            }
          >
            {mode === "signin" ? "Daftar" : "Masuk"}
          </Link>
        </p>
        <p className="auth-note">Akun yang sama dipakai untuk pesan dan berjualan di Open PO.</p>

        <div className="presets-container">
          <div className="presets-header">
            <span className="presets-title">⚡ Akses Cepat Pengujian (1-Klik Isi)</span>
            <span className="presets-subtitle">Klik salah satu profil untuk langsung mengisi akun:</span>
          </div>
          <div className="presets-grid">
            <button
              type="button"
              className="preset-btn"
              onClick={() => {
                setEmail("seller.nadia@openpo.id");
                setPassword("Kampus2026!");
              }}
            >
              <div className="preset-badge seller">Penjual 👩‍🍳</div>
              <strong className="preset-name">Nadia Putri (F. Pertanian)</strong>
              <small className="preset-desc">Kelola PO Kopi Susu & Risol Mayo</small>
            </button>

            <button
              type="button"
              className="preset-btn"
              onClick={() => {
                setEmail("buyer.bima@openpo.id");
                setPassword("Kampus2026!");
              }}
            >
              <div className="preset-badge buyer">Pembeli 🎒</div>
              <strong className="preset-name">Bima Prakoso (Fasilkom)</strong>
              <small className="preset-desc">Pantau pesanan & lacak status</small>
            </button>

            <button
              type="button"
              className="preset-btn"
              onClick={() => {
                setEmail("admin@openpo.id");
                setPassword("AdminOpenPO2026!");
              }}
            >
              <div className="preset-badge admin">Superadmin 🛡️</div>
              <strong className="preset-name">Admin Kampus Pusat</strong>
              <small className="preset-desc">Moderasi PO & verifikasi penjual</small>
            </button>
          </div>
        </div>

        {next.includes("/penjual") && (
          <div className="demo-login-shortcut">
            <span>Ingin coba fitur penjual langsung tanpa login?</span>
            <Link href="/penjual?demo=1" className="button button-outline button-small">
              Buka Demo Interaktif Ruang Penjual →
            </Link>
          </div>
        )}

        {next.includes("/akun") && (
          <div className="demo-login-shortcut">
            <span>Ingin coba melihat akun pembeli langsung tanpa login?</span>
            <Link href="/akun/pesanan?demo=1" className="button button-outline button-small">
              Buka Demo Akun Pembeli (Bima Prakoso) →
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
