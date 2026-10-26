"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { formatRupiah } from "@/lib/marketplace-shared";
import { PaymentProofUpload } from "@/components/payment-proof-upload";

type BuyerDefaults = { name: string; faculty: string; whatsapp: string };

type PlacedOrderResult = {
  id: string;
  order_code: string;
  quantity: number;
  unit_price_idr: number;
  total_price_idr: number;
  status: string;
};

// Validasi WA di sisi client (sama dengan server untuk konsistensi)
const WA_REGEX = /^(\+62|62|0)8\d{7,13}$/;

function sanitizeWa(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

export function OrderForm({
  batchId,
  batchTitle,
  price,
  remaining,
  pickupPoint,
  sellerName,
  sellerFaculty,
  sellerWhatsapp,
  sellerBankName,
  sellerBankNumber,
  sellerBankHolder,
  sellerQrisNmid,
  isLoggedIn = false,
  buyer = { name: "", faculty: "", whatsapp: "" },
}: {
  batchId: string;
  batchTitle?: string;
  price: number;
  remaining: number;
  pickupPoint?: string;
  sellerName?: string;
  sellerFaculty?: string;
  sellerWhatsapp?: string;
  sellerBankName?: string | null;
  sellerBankNumber?: string | null;
  sellerBankHolder?: string | null;
  sellerQrisNmid?: string | null;
  isLoggedIn?: boolean;
  buyer?: BuyerDefaults;
}) {
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState(buyer.name || "");
  const [faculty, setFaculty] = useState(buyer.faculty || "");
  const [whatsapp, setWhatsapp] = useState(buyer.whatsapp || "");
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "transfer" | "cod">("qris");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [waError, setWaError] = useState("");
  const [copiedBank, setCopiedBank] = useState(false);
  const [agreedConsent, setAgreedConsent] = useState(true);
  const [orderResult, setOrderResult] = useState<PlacedOrderResult | null>(null);

  const requestRef = useRef<{ fingerprint: string; id: string } | null>(null);

  function validateWa(value: string) {
    if (!value) {
      setWaError("");
      return;
    }
    if (!WA_REGEX.test(value.trim())) {
      setWaError("Gunakan format 08xx, 628xx, atau +628xx");
    } else {
      setWaError("");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || remaining < 1) return;

    if (!WA_REGEX.test(whatsapp.trim())) {
      setWaError("Gunakan format 08xx, 628xx, atau +628xx");
      return;
    }

    const fingerprint = JSON.stringify([batchId, quantity, buyerName, faculty, whatsapp, notes]);
    if (requestRef.current?.fingerprint !== fingerprint) {
      requestRef.current = { fingerprint, id: crypto.randomUUID() };
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          batchId,
          quantity,
          buyerName: buyerName.trim(),
          faculty: faculty.trim(),
          whatsapp: whatsapp.trim(),
          paymentMethod: paymentMethod === "qris" ? "transfer_qris" : (paymentMethod === "transfer" ? "transfer_bank" : "cod"),
          notes: notes.trim(),
          requestId: requestRef.current.id,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(result?.error ?? "Pesanan belum tersimpan. Periksa koneksi lalu coba lagi.");
        return;
      }

      setOrderResult(result.order);

      // Simpan riwayat pesanan ke localStorage untuk kenyamanan pembeli tamu (Guest UX)
      if (typeof window !== "undefined" && result.order?.order_code) {
        try {
          const recent = JSON.parse(localStorage.getItem("openpo_recent_orders") || "[]");
          const updated = [result.order.order_code, ...recent.filter((c: string) => c !== result.order.order_code)].slice(0, 8);
          localStorage.setItem("openpo_recent_orders", JSON.stringify(updated));
        } catch {}
      }
    } catch {
      setMessage("Koneksi terputus. Data pesananmu belum mendapat konfirmasi; coba kirim lagi.");
    } finally {
      setBusy(false);
    }
  }

  const totalPrice = price * quantity;
  const sellerWaClean = sanitizeWa(sellerWhatsapp || "");
  const activeBankName = sellerBankName || "Rekening Penjual (Konfirmasi via WA)";
  const activeBankNumber = sellerBankNumber || "Hubungi WA Penjual";
  const activeBankHolder = sellerBankHolder || sellerName || "Mitra Penjual OpenPO";
  const activeQrisNmid = sellerQrisNmid || "Konfirmasi QRIS ke WA Penjual";

  const waConfirmUrl = orderResult
    ? `https://wa.me/${sellerWaClean}?text=${encodeURIComponent(
        `Halo kak ${sellerName || "Penjual"}! Saya ${buyerName} (${faculty}) sudah melakukan pemesanan via OpenPO:\n\n` +
          `📦 *${batchTitle || "Produk PO"}*\n` +
          `🔖 Kode Pesanan: *${orderResult.order_code}*\n` +
          `🔢 Jumlah: ${quantity} item\n` +
          `💵 Total: ${formatRupiah(totalPrice)}\n` +
          `💳 Metode Bayar: ${paymentMethod.toUpperCase()}\n` +
          (notes ? `📝 Catatan: ${notes}\n` : "") +
          `\nMohon dicek ya kak, terima kasih!`
      )}`
    : "#";

  return (
    <>
      <form className="form-stack order-form-card" onSubmit={submit}>
        {!isLoggedIn && (
          <div className="guest-order-notice">
            <span className="notice-icon">⚡</span>
            <div>
              <strong>Pesan Instan (Tanpa Wajib Akun)</strong>
              <small>Pesanan otomatis tercatat & bisa dilacak pakai kode PO.</small>
            </div>
          </div>
        )}

        <label>
          Nama Lengkap
          <input
            name="buyerName"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            placeholder="Contoh: Bima Prakoso"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
          />
        </label>

        <label>
          Fakultas / Program Studi
          <input
            name="faculty"
            required
            minLength={2}
            maxLength={120}
            autoComplete="organization-title"
            placeholder="Contoh: Fasilkom 2023 / Teknik Sipil Polmed"
            value={faculty}
            onChange={(e) => setFaculty(e.target.value)}
          />
        </label>

        <label>
          Nomor WhatsApp Aktif
          <input
            name="whatsapp"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="08xxxxxxxxxx"
            value={whatsapp}
            onChange={(e) => {
              setWhatsapp(e.target.value);
              validateWa(e.target.value);
            }}
            className={waError ? "input-error" : ""}
          />
          {waError && (
            <span className="field-error" role="alert">
              {waError}
            </span>
          )}
        </label>

        <label>
          Jumlah Pesanan (Sisa kuota: {remaining})
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
            <div className="quantity-control">
              <button
                type="button"
                aria-label="Kurangi jumlah"
                disabled={quantity <= 1}
                onClick={() => setQuantity((n) => Math.max(1, n - 1))}
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={remaining}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val)) setQuantity(1);
                  else setQuantity(Math.min(remaining, Math.max(1, val)));
                }}
                className="quantity-input"
                style={{
                  width: "55px",
                  textAlign: "center",
                  border: "none",
                  outline: "none",
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "var(--polmed-900)",
                  background: "transparent",
                }}
                aria-label="Jumlah pesanan"
              />
              <button
                type="button"
                aria-label="Tambah jumlah"
                disabled={quantity >= remaining}
                onClick={() => setQuantity((n) => Math.min(remaining, n + 1))}
              >
                +
              </button>
            </div>

            {/* Quick Pills */}
            {remaining >= 5 && (
              <button
                type="button"
                className="button button-small button-light"
                style={{ minHeight: "36px", padding: "0 10px", fontSize: "11px", fontWeight: 700 }}
                onClick={() => setQuantity((n) => Math.min(remaining, n + 5))}
              >
                +5
              </button>
            )}
            {remaining >= 10 && (
              <button
                type="button"
                className="button button-small button-light"
                style={{ minHeight: "36px", padding: "0 10px", fontSize: "11px", fontWeight: 700 }}
                onClick={() => setQuantity((n) => Math.min(remaining, n + 10))}
              >
                +10
              </button>
            )}
          </div>
        </label>

        <label>
          Catatan Tambahan (Opsional)
          <input
            type="text"
            placeholder="Contoh: Less sugar / Ukuran XL / Sambal banyak"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {/* Payment Method Selector */}
        <div className="payment-method-selector">
          <span className="payment-selector-label">Metode Pembayaran</span>
          <div className="payment-options-grid">
            <button
              type="button"
              className={`payment-option ${paymentMethod === "qris" ? "active" : ""}`}
              onClick={() => setPaymentMethod("qris")}
            >
              <span className="pay-badge">Instan</span>
              <strong>QRIS Kampus</strong>
              <small>BCA, GoPay, Dana, OVO</small>
            </button>
            <button
              type="button"
              className={`payment-option ${paymentMethod === "transfer" ? "active" : ""}`}
              onClick={() => setPaymentMethod("transfer")}
            >
              <span className="pay-badge">Transfer</span>
              <strong>Transfer Bank</strong>
              <small>{sellerBankName || "Rekening Penjual"}</small>
            </button>
            <button
              type="button"
              className={`payment-option ${paymentMethod === "cod" ? "active" : ""}`}
              onClick={() => setPaymentMethod("cod")}
            >
              <span className="pay-badge">Titik Ambil</span>
              <strong>Bayar di Titik Kumpul</strong>
              <small>Tunai saat pengambilan</small>
            </button>
          </div>
        </div>

        <div className="total-row">
          <span>Total Pembayaran</span>
          <strong>{formatRupiah(totalPrice)}</strong>
        </div>

        <label className="order-consent-checkbox" style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.8rem", color: "var(--muted, #64748b)", cursor: "pointer", margin: "14px 0" }}>
          <input
            type="checkbox"
            required
            checked={agreedConsent}
            onChange={(e) => setAgreedConsent(e.target.checked)}
            style={{ marginTop: "2px", accentColor: "#059669" }}
          />
          <span style={{ lineHeight: "1.4" }}>
            Saya menyetujui pemakaian nama & nomor WhatsApp untuk konfirmasi pesanan & pengingat jadwal pickup sesuai UU PDP No. 27/2022.
          </span>
        </label>

        <button className="button button-primary button-block" disabled={busy || remaining < 1 || !agreedConsent}>
          {busy
            ? "Mencatat Pesanan…"
            : remaining < 1
            ? "Kuota Batch Penuh"
            : `Pesan Sekarang · ${formatRupiah(totalPrice)}`}
        </button>

        {message && (
          <p role="alert" className="form-message">
            {message}
          </p>
        )}
      </form>

      {/* Interactive Success Modal & Receipt */}
      {orderResult && (
        <div className="order-modal-backdrop">
          <div className="order-modal-card">
            <div className="modal-success-icon">🎉</div>
            <span className="modal-badge-success">PESANAN BERHASIL TERCATAT</span>
            <h2>Terima Kasih, {buyerName}!</h2>
            <p className="modal-desc">
              Pesananmu telah resmi masuk ke sistem kuota penjual. Simpan kode pesananmu di bawah ini:
            </p>

            <div className="modal-code-box">
              <small>KODE PESANAN RESMI</small>
              <div className="code-display">{orderResult.order_code}</div>
              <span className="code-hint">Gunakan kode ini saat pengambilan di selasar</span>
            </div>

            <div className="modal-summary-box">
              <div className="summary-item">
                <span>Produk:</span>
                <strong>{batchTitle || "Pesanan Pre-Order"}</strong>
              </div>
              <div className="summary-item">
                <span>Jumlah:</span>
                <strong>{orderResult.quantity} item</strong>
              </div>
              <div className="summary-item">
                <span>Total Bayar:</span>
                <strong className="summary-price">{formatRupiah(orderResult.total_price_idr || totalPrice)}</strong>
              </div>
              <div className="summary-item">
                <span>Metode:</span>
                <span className="method-pill">{paymentMethod.toUpperCase()}</span>
              </div>
              {pickupPoint && (
                <div className="summary-item">
                  <span>Titik Ambil:</span>
                  <strong>📍 {pickupPoint}</strong>
                </div>
              )}
            </div>

            {/* Payment Details */}
            {paymentMethod === "qris" && (
              <div className="modal-pay-instruction">
                <h4>Instruksi Pembayaran QRIS</h4>
                <div className="dummy-qris-box">
                  <div className="qris-head">
                    <span className="qris-brand">QRIS PENJUAL</span>
                    <small>{sellerQrisNmid ? `NMID: ${activeQrisNmid}` : activeQrisNmid}</small>
                  </div>
                  <span className="qris-total">{formatRupiah(totalPrice)}</span>
                  <small>
                    Bayar via QRIS penjual (BCA, GoPay, OVO, ShopeePay, Dana) lalu unggah struk bukti bayar di bawah ini atau kirim ke WhatsApp penjual.
                  </small>
                </div>
              </div>
            )}

            {paymentMethod === "transfer" && (
              <div className="modal-pay-instruction">
                <h4>Rekening Transfer Penjual</h4>
                <div className="bank-account-box">
                  <span className="bank-name">{activeBankName}</span>
                  <strong className="bank-number">{activeBankNumber}</strong>
                  <span className="bank-holder">a.n. {activeBankHolder}</span>
                  {sellerBankNumber && (
                    <button
                      type="button"
                      className="button button-light button-small"
                      onClick={() => {
                        navigator.clipboard.writeText(sellerBankNumber.replace(/\s+/g, ""));
                        setCopiedBank(true);
                        setTimeout(() => setCopiedBank(false), 2000);
                      }}
                    >
                      {copiedBank ? "✓ Tersalin ke Clipboard" : "Salin No. Rekening"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Upload Bukti Pembayaran Langsung */}
            {paymentMethod !== "cod" && (
              <PaymentProofUpload orderCode={orderResult.order_code} />
            )}

            <div className="modal-action-buttons">
              <a
                href={waConfirmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="button button-wa button-block"
              >
                📲 Konfirmasi ke WA Penjual Sekarang
              </a>

              <Link
                href={`/pesanan/${encodeURIComponent(orderResult.order_code)}`}
                className="button button-primary button-block"
              >
                📋 Lihat Halaman Pesananku
              </Link>

              <Link
                href={`/lacak?q=${encodeURIComponent(orderResult.order_code)}`}
                className="button button-light button-block"
              >
                🔍 Lacak Status Real-time
              </Link>

              <button
                type="button"
                className="button button-light button-block"
                onClick={() => setOrderResult(null)}
              >
                Kembali ke Detail Produk
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
