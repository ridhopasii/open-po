"use client";

import { useEffect, useState } from "react";
import { formatRupiah } from "@/lib/marketplace-shared";

type OrderSuccessActionsProps = {
  orderCode: string;
  expiresAt?: string | null;
  status: string;
  hasProof: boolean;
  totalAmount: number;
  bankName?: string | null;
  bankNumber?: string | null;
  bankHolder?: string | null;
  qrisNmid?: string | null;
};

const STAGES = [
  { key: "created", label: "Dipesan", desc: "Pesanan masuk sistem" },
  { key: "paid", label: "Dibayar", desc: "Bukti transfer diunggah" },
  { key: "confirmed", label: "Diverifikasi", desc: "Dikonfirmasi penjual" },
  { key: "ready", label: "Siap Diambil", desc: "Tiba di titik kumpul" },
  { key: "picked_up", label: "Selesai", desc: "Pesanan sudah diambil" },
];

function getStageIndex(status: string, hasProof: boolean) {
  if (status === "cancelled") return -1;
  if (status === "picked_up") return 4;
  if (status === "ready") return 3;
  if (status === "confirmed") return 2;
  if (hasProof) return 1;
  return 0;
}

export function OrderSuccessActions({
  orderCode,
  expiresAt,
  status,
  hasProof,
  totalAmount,
  bankName,
  bankNumber,
  bankHolder,
  qrisNmid,
}: OrderSuccessActionsProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isExpired: boolean } | null>(null);

  const stageIndex = getStageIndex(status, hasProof);

  useEffect(() => {
    if (!expiresAt || status !== "pending" || hasProof) return;

    function calcRemaining() {
      const diff = new Date(expiresAt!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds, isExpired: false });
    }

    calcRemaining();
    const interval = setInterval(calcRemaining, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, status, hasProof]);

  function copyText(text: string, setCopied: (v: boolean) => void) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="order-interactive-suite" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* 5-Step Order Progress Timeline */}
      <div
        className="order-timeline-card"
        style={{
          background: "var(--color-bg-secondary, #f8fafc)",
          border: "1px solid var(--color-border, #e2e8f0)",
          borderRadius: "16px",
          padding: "16px",
        }}
      >
        <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted, #64748b)", marginBottom: "12px" }}>
          Timeline Status Pesanan
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", position: "relative" }}>
          {STAGES.map((s, idx) => {
            const isDone = stageIndex >= idx;
            const isCurrent = stageIndex === idx;
            return (
              <div
                key={s.key}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 800,
                    marginBottom: "6px",
                    background: isCurrent ? "var(--color-primary, #059669)" : isDone ? "#10b981" : "#e2e8f0",
                    color: isDone ? "#ffffff" : "#64748b",
                    boxShadow: isCurrent ? "0 0 0 4px rgba(16, 185, 129, 0.2)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  {isDone && idx < stageIndex ? "✓" : idx + 1}
                </div>
                <strong style={{ fontSize: "11px", color: isDone ? "var(--color-text, #0f172a)" : "#94a3b8", lineHeight: 1.2 }}>
                  {s.label}
                </strong>
                <span style={{ fontSize: "9.5px", color: "#94a3b8", marginTop: "2px", display: "none" }}>
                  {s.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Code Copy & Timer Card */}
      <div
        className="order-code-copy-card"
        style={{
          background: "#ffffff",
          border: "2px solid var(--color-primary, #059669)",
          borderRadius: "16px",
          padding: "18px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          boxShadow: "0 4px 16px rgba(5, 150, 105, 0.08)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
              Kode Unik Pesanan
            </span>
            <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "0.06em", color: "#0f172a" }}>
              {orderCode}
            </div>
          </div>
          <button
            type="button"
            onClick={() => copyText(orderCode, setCopiedCode)}
            className="button button-small"
            style={{
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: 700,
              borderRadius: "99px",
              backgroundColor: copiedCode ? "#10b981" : "var(--color-primary, #059669)",
              color: "#ffffff",
              cursor: "pointer",
              border: "none",
            }}
          >
            {copiedCode ? "✓ Kode Tersalin!" : "📋 Salin Kode"}
          </button>
        </div>

        {/* 2-Hour Payment Expiry Countdown */}
        {timeLeft && status === "pending" && !hasProof && (
          <div
            style={{
              background: timeLeft.isExpired ? "#fee2e2" : "#fef3c7",
              border: `1px solid ${timeLeft.isExpired ? "#fca5a5" : "#fde68a"}`,
              borderRadius: "10px",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              color: timeLeft.isExpired ? "#b91c1c" : "#92400e",
            }}
          >
            <span style={{ fontWeight: 600 }}>
              ⏱️ Batas Waktu Pembayaran (2 Jam):
            </span>
            <strong style={{ fontFamily: "monospace", fontSize: "14px" }}>
              {timeLeft.isExpired
                ? "Kedaluwarsa"
                : `${String(timeLeft.hours).padStart(2, "0")}:${String(timeLeft.minutes).padStart(2, "0")}:${String(timeLeft.seconds).padStart(2, "0")}`}
            </strong>
          </div>
        )}
      </div>

      {/* Seller Bank / Transfer Instructions Card */}
      {(bankName || bankNumber || qrisNmid) && (
        <div
          className="order-bank-instruction-card"
          style={{
            background: "var(--color-bg-secondary, #f8fafc)",
            border: "1px solid var(--color-border, #cbd5e1)",
            borderRadius: "16px",
            padding: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>
            <span>💳 Rekening Pembayaran Penjual</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
            {bankName && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b" }}>Bank / E-Wallet</span>
                <strong style={{ textTransform: "uppercase" }}>{bankName}</strong>
              </div>
            )}
            {bankNumber && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b" }}>Nomor Rekening</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <code style={{ background: "#ffffff", padding: "2px 8px", borderRadius: "6px", fontWeight: 800, fontSize: "14px", border: "1px solid #e2e8f0" }}>
                    {bankNumber}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyText(bankNumber, setCopiedBank)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "#2563eb", fontSize: "11px", fontWeight: 700 }}
                  >
                    {copiedBank ? "✓ Salin" : "Salin"}
                  </button>
                </div>
              </div>
            )}
            {bankHolder && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b" }}>Atas Nama</span>
                <strong>{bankHolder}</strong>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #e2e8f0" }}>
              <span style={{ color: "#64748b" }}>Nominal Pas Transfer</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <strong style={{ color: "var(--color-primary, #059669)", fontSize: "15px" }}>
                  {formatRupiah(totalAmount)}
                </strong>
                <button
                  type="button"
                  onClick={() => copyText(String(totalAmount), setCopiedAmount)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#2563eb", fontSize: "11px", fontWeight: 700 }}
                >
                  {copiedAmount ? "✓ Salin" : "Salin"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
