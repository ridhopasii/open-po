"use client";
import { useState } from "react";
export function OrderAction({ id, status, label }: { id: string; status: "confirmed" | "ready" | "picked_up" | "cancelled"; label: string }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function update() { setBusy(true); setError(""); try { const response = await fetch(`/api/seller/orders/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) }); if (response.ok) { location.reload(); return; } const result = await response.json().catch(() => null); setError(result?.error ?? "Pesanan belum berhasil diperbarui. Coba lagi."); } catch { setError("Koneksi terputus. Pesanan belum berubah."); } finally { setBusy(false); } }
  return <span className="order-action"><button type="button" disabled={busy} onClick={update}>{busy ? "Menyimpan…" : label}</button>{error && <small role="alert">{error}</small>}</span>;
}
