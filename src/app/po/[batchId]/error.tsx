"use client";

import { useEffect } from "react";

export default function PODetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[OpenPO PO Detail Error]", error);
  }, [error]);

  return (
    <div className="page-shell">
      <div className="wrap" style={{ paddingTop: 64, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🛒</div>
        <h2 style={{ font: "700 20px var(--font-display)", color: "var(--pine)", margin: "0 0 8px" }}>
          Gagal memuat detail PO
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 14, maxWidth: 320, margin: "0 auto 20px" }}>
          Terjadi error. Mungkin PO ini sudah tutup atau tidak ditemukan.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={reset}
            className="btn-primary"
            style={{ padding: "10px 20px" }}
          >
            Coba lagi
          </button>
          <a
            href="/"
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              color: "var(--pine)",
              font: "600 14px var(--font-body)",
              textDecoration: "none",
            }}
          >
            Lihat etalase
          </a>
        </div>
      </div>
    </div>
  );
}
