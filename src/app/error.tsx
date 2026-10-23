"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log ke console (bisa diganti dengan Sentry dsb.)
    console.error("[OpenPO Error]", error);
  }, [error]);

  return (
    <div className="page-shell">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: 16,
          textAlign: "center",
          padding: "32px 16px",
        }}
      >
        <div style={{ fontSize: 48 }}>😕</div>
        <h2
          style={{
            font: "700 22px var(--font-display)",
            color: "var(--pine)",
            margin: 0,
          }}
        >
          Ups, ada yang salah
        </h2>
        <p
          style={{
            color: "var(--muted)",
            fontSize: 14,
            maxWidth: 360,
            margin: 0,
          }}
        >
          Halaman ini mengalami error yang tidak terduga. Tim kami sudah
          diberitahu.
        </p>
        {error.digest && (
          <code
            style={{
              background: "#f4f2f7",
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              color: "#7a6f88",
            }}
          >
            Error ID: {error.digest}
          </code>
        )}
        <button
          onClick={reset}
          style={{
            marginTop: 8,
            padding: "10px 24px",
            borderRadius: 8,
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            font: "600 14px var(--font-body)",
            cursor: "pointer",
          }}
        >
          Coba lagi
        </button>
        <a
          href="/"
          style={{
            fontSize: 13,
            color: "var(--muted)",
            textDecoration: "underline",
          }}
        >
          Kembali ke beranda
        </a>
      </div>
    </div>
  );
}
