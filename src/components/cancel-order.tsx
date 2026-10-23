"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelOrder({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  async function cancel() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      if (response.ok) {
        setShowConfirm(false);
        router.refresh();
        return;
      }
      const result = await response.json().catch(() => null);
      setError(result?.error ?? "Pesanan belum bisa dibatalkan. Coba lagi.");
    } catch {
      setError("Koneksi terputus. Pesanan belum dibatalkan.");
    } finally {
      setBusy(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="cancel-confirm">
        <p>Yakin batalkan pesanan ini? Kuotanya akan tersedia lagi.</p>
        <div className="cancel-confirm-actions">
          <button
            type="button"
            className="button button-small"
            style={{ background: "#c0392b", borderColor: "#c0392b" }}
            onClick={cancel}
            disabled={busy}
          >
            {busy ? "Membatalkan…" : "Ya, batalkan"}
          </button>
          <button
            type="button"
            className="button button-light button-small"
            onClick={() => setShowConfirm(false)}
            disabled={busy}
          >
            Kembali
          </button>
        </div>
        {error && (
          <small role="alert" className="field-error">
            {error}
          </small>
        )}
      </div>
    );
  }

  return (
    <span className="order-action">
      <button
        type="button"
        className="cancel-order-btn"
        onClick={() => setShowConfirm(true)}
      >
        Batalkan pesanan
      </button>
    </span>
  );
}
