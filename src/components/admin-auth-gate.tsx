"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminAuthGate() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode.trim() || busy) return;

    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Kata sandi superadmin tidak sesuai.");
        return;
      }

      // Success -> reload to enter admin dashboard
      router.refresh();
    } catch {
      setError("Gagal menghubungi server. Periksa koneksi internet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-lock-screen">
      <div className="admin-lock-card">
        <div className="lock-icon-wrap">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <span className="lock-badge">SUPERADMIN ACCESS ONLY</span>
        <h2>Panel Kendali Terkunci</h2>
        <p>
          Halaman ini khusus untuk Tim Superadmin dan Moderasi Kampus OpenPO. Masukkan kata sandi keamanan untuk melanjutkan.
        </p>

        <form onSubmit={handleSubmit} className="admin-lock-form">
          <div className="password-input-group">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan kata sandi admin..."
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              required
              autoFocus
              className="admin-pass-input"
            />
            <button
              type="button"
              className="pass-toggle-btn"
              onClick={() => setShowPassword((v) => !v)}
              title={showPassword ? "Sembunyikan" : "Tampilkan"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {error && <div className="admin-lock-error">⚠️ {error}</div>}

          <button type="submit" className="button admin-lock-btn" disabled={busy}>
            {busy ? "Memverifikasi..." : "Buka Panel Admin →"}
          </button>
        </form>

        <div className="admin-lock-footer">
          <Link href="/" className="text-link">
            ← Kembali ke Etalase Utama
          </Link>
        </div>
      </div>
    </div>
  );
}
