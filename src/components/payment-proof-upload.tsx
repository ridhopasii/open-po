"use client";

import { useState } from "react";

export function PaymentProofUpload({
  orderCode,
  initialProofPath,
}: {
  orderCode: string;
  initialProofPath?: string | null;
}) {
  const [proofUrl, setProofUrl] = useState<string | null>(initialProofPath || null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMsg("Format harus berupa JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg("Ukuran foto maksimal 4MB.");
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append("proof", file);

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/payment-proof`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal mengunggah bukti transfer.");
      } else {
        setProofUrl(data.publicUrl || data.path);
        setSuccessMsg("Bukti transfer berhasil diunggah!");
      }
    } catch {
      setErrorMsg("Terjadi gangguan koneksi internet.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="payment-proof-box" style={{ marginTop: "1rem", padding: "1rem", background: "var(--color-bg-secondary, #f8fafc)", borderRadius: "12px", border: "1px dashed var(--color-border, #cbd5e1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <strong>Bukti Transfer / Pembayaran</strong>
        {proofUrl ? (
          <span style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: "600" }}>✓ Terunggah</span>
        ) : (
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Opsional</span>
        )}
      </div>

      {proofUrl ? (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <a
            href={proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "0.85rem", color: "#2563eb", textDecoration: "underline" }}
          >
            Lihat Struk / Bukti Transfer
          </a>
          <label style={{ fontSize: "0.75rem", cursor: "pointer", color: "#64748b" }}>
            (Ganti Foto)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              style={{ display: "none" }}
              disabled={isUploading}
            />
          </label>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 0.5rem 0" }}>
            Jika kamu membayar via transfer QRIS atau bank, unggah struk/screenshot pembayaranmu di sini untuk verifikasi cepat:
          </p>
          <label className="button button-light button-small" style={{ display: "inline-block", cursor: isUploading ? "not-allowed" : "pointer" }}>
            {isUploading ? "Mengunggah..." : "📷 Unggah Bukti Transfer"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              style={{ display: "none" }}
              disabled={isUploading}
            />
          </label>
        </div>
      )}

      {errorMsg && <p style={{ color: "#dc2626", fontSize: "0.8rem", marginTop: "0.5rem" }}>{errorMsg}</p>}
      {successMsg && <p style={{ color: "#16a34a", fontSize: "0.8rem", marginTop: "0.5rem" }}>{successMsg}</p>}
    </div>
  );
}
