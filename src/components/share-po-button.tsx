"use client";

import { useState } from "react";

export function SharePoButton({
  title,
  price,
  batchId,
  remaining,
}: {
  title: string;
  price: number;
  batchId: string;
  remaining: number;
}) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/po/${batchId}`
    : `https://open-po.vercel.app/po/${batchId}`;

  const shareText = `🔥 Ada Open PO "${title}" di Kampus! Sisa ${remaining} item lagi. Pesan di sini sebelum ditutup: ${url}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Open PO: ${title}`,
          text: `Pesan pre-order ${title} sekarang di OpenPO Kampus!`,
          url,
        });
        return;
      } catch {}
    }
    handleCopy();
  }

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "12px" }}>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="button button-small"
        style={{
          background: "#25D366",
          color: "#fff",
          border: "none",
          minHeight: "34px",
          padding: "0 14px",
          fontSize: "12.5px",
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          borderRadius: "10px",
        }}
      >
        <span>Bagikan ke WA &amp; Story</span>
      </a>

      <button
        type="button"
        onClick={handleCopy}
        className="button button-small button-outline"
        style={{
          minHeight: "34px",
          padding: "0 12px",
          fontSize: "12px",
          fontWeight: 600,
          borderRadius: "10px",
        }}
      >
        {copied ? "Tautan Tersalin" : "Salin Tautan PO"}
      </button>
    </div>
  );
}
