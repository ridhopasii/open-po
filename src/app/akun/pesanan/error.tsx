"use client";

import { useEffect } from "react";

export default function OrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[OpenPO Orders Error]", error);
  }, [error]);

  return (
    <div className="page-shell">
      <div className="wrap" style={{ paddingTop: 64, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📦</div>
        <h2 style={{ font: "700 20px var(--font-display)", color: "var(--pine)", margin: "0 0 8px" }}>
          Gagal memuat pesananmu
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 14, maxWidth: 320, margin: "0 auto 20px" }}>
          Terjadi error saat mengambil data pesanan. Coba refresh halaman ini.
        </p>
        <button
          onClick={reset}
          className="btn-primary"
          style={{ padding: "10px 24px" }}
        >
          Muat ulang
        </button>
      </div>
    </div>
  );
}
