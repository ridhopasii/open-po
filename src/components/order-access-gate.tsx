"use client";

import { useState } from "react";
import Link from "next/link";

export function OrderAccessGate({ orderCode }: { orderCode: string }) {
  const [phoneLast4, setPhoneLast4] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/orders/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderCode, phoneLast4 }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error || "Data tidak cocok. Periksa kode pesanan dan nomor WhatsApp.");
        return;
      }
      window.location.replace(`/pesanan/${encodeURIComponent(orderCode)}`);
    } catch {
      setError("Koneksi terputus. Coba lagi sebentar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-shell">
      <main className="order-confirm-page">
        <section className="order-access-card">
          <Link className="order-access-brand" href="/" aria-label="OpenPO beranda">
            <strong>OpenPO</strong>
            <small>by kampusfess.id</small>
          </Link>
          <span className="order-access-mark" aria-hidden="true">OP</span>
          <h1>Verifikasi pesanan</h1>
          <p>Masukkan 4 digit terakhir nomor WhatsApp yang kamu pakai saat memesan.</p>
          <form onSubmit={submit}>
            <label htmlFor="order-phone-last4">4 digit terakhir nomor WhatsApp</label>
            <input
              id="order-phone-last4"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]{4}"
              maxLength={4}
              value={phoneLast4}
              onChange={(event) => setPhoneLast4(event.target.value.replace(/\D/g, "").slice(0, 4))}
              required
            />
            {error && <p className="order-access-error" role="alert">{error}</p>}
            <button className="button button-primary button-block" type="submit" disabled={busy || phoneLast4.length !== 4}>
              {busy ? "Memeriksa..." : "Lihat pesanan"}
            </button>
          </form>
          <a href="/lacak" className="order-access-back">Kembali ke lacak pesanan</a>
        </section>
      </main>
    </div>
  );
}
