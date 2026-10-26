"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatCampusDate, formatRupiah } from "@/lib/marketplace-shared";

type TrackedOrder = {
  id: string;
  order_code: string;
  buyer_name: string;
  buyer_faculty: string;
  buyer_whatsapp: string;
  quantity: number;
  unit_price_idr: number;
  total_price_idr: number;
  status: string;
  created_at: string;
  batch: {
    id: string;
    title: string;
    closes_at: string;
    pickup_at: string;
    pickup_point: string;
    pickup_note: string | null;
    status: string;
    product: {
      id: string;
      name: string;
      description: string;
      category: string;
      price_idr: number;
      seller: {
        display_name: string;
        faculty: string;
        whatsapp: string;
        avatar_path: string | null;
      };
    };
  };
};

const STEPS = [
  { key: "created", label: "Pesanan Dibuat", desc: "Tercatat di sistem OpenPO" },
  { key: "pending", label: "Menunggu Konfirmasi", desc: "Verifikasi pembayaran penjual" },
  { key: "confirmed", label: "Diproses / Disiapkan", desc: "Penjual menyiapkan barang" },
  { key: "ready", label: "Siap Diambil", desc: "Sudah di titik kumpul kampus" },
  { key: "picked_up", label: "Pesanan Selesai", desc: "Sudah diterima pembeli" },
];

function getStepIndex(status: string) {
  switch (status) {
    case "pending":
      return 1;
    case "confirmed":
      return 2;
    case "ready":
      return 3;
    case "picked_up":
      return 4;
    case "cancelled":
      return -1;
    default:
      return 1;
  }
}

function getProductPhoto(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("risol")) return "/images/risol-mayo.jpg";
  if (lower.includes("matcha")) return "/images/matcha-latte.jpg";
  if (lower.includes("kopi")) return "/images/kopi-susu.jpg";
  if (lower.includes("brownies")) return "/images/brownies.jpg";
  if (lower.includes("kaos") || lower.includes("baju")) return "/images/kaos-angkatan.jpg";
  return "/images/kopi-susu.jpg";
}

function sanitizeWa(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

export function OrderTracker() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("kode") || searchParams.get("q") || searchParams.get("code") || "";
  const initialPhone = searchParams.get("phone") || searchParams.get("wa") || "";

  const [codeQuery, setCodeQuery] = useState(initialCode);
  const [phoneLast4, setPhoneLast4] = useState(initialPhone.slice(-4));
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [recentOrders, setRecentOrders] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("openpo_recent_orders") || "[]");
      if (Array.isArray(stored)) {
        setRecentOrders(stored);
      }
    } catch {}
  }, []);

  async function handleSearch(codeText: string, phoneText: string) {
    const cleanCode = codeText.trim().toUpperCase();
    const cleanPhone = phoneText.trim().replace(/\D/g, "").slice(-4);
    if (!cleanCode) {
      setErrorMessage("Masukkan Kode Pesanan kamu.");
      return;
    }
    if (cleanPhone.length < 4) {
      setErrorMessage("Masukkan 4 digit terakhir nomor WhatsApp pemesan untuk verifikasi.");
      return;
    }

    setBusy(true);
    setErrorMessage("");
    setSearched(true);

    try {
      const res = await fetch(`/api/orders/track?code=${encodeURIComponent(cleanCode)}&phone=${encodeURIComponent(cleanPhone)}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Gagal memuat status pesanan.");
        setOrders([]);
      } else {
        setOrders(data.orders || []);
      }
    } catch {
      setErrorMessage("Koneksi terganggu. Silakan coba kembali.");
      setOrders([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (initialCode && initialPhone.length >= 4) {
      handleSearch(initialCode, initialPhone);
    }
  }, [initialCode, initialPhone]);

  return (
    <div className="tracker-container">
      <div className="tracker-hero">
        <span className="section-label">LIVE TRACKING KAMPUS · PRIVASI TERJAMIN</span>
        <h1>Lacak Status Pesanan OpenPO</h1>
        <p>
          Masukkan <strong>Kode Pesanan</strong> dan <strong>4 Digit Terakhir WhatsApp</strong> yang kamu pakai saat memesan untuk melihat status perkembangan pesananmu realtime.
        </p>

        <form
          className="tracker-search-box"
          style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(codeQuery, phoneLast4);
          }}
        >
          <div className="tracker-input-wrap" style={{ flex: "1 1 240px", minWidth: "220px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={codeQuery}
              onChange={(e) => setCodeQuery(e.target.value)}
              placeholder="Kode Pesanan (PO-XXXXXXXXXX)"
              required
            />
          </div>
          <div className="tracker-input-wrap" style={{ flex: "0 1 180px", minWidth: "150px" }}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={phoneLast4}
              onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, ""))}
              placeholder="4 digit akhir WA"
              title="4 digit terakhir nomor WhatsApp pemesan"
              required
            />
          </div>
          <button type="submit" className="button" disabled={busy || !codeQuery.trim() || phoneLast4.length < 4}>
            {busy ? "Mencari…" : "Lacak Pesanan"}
          </button>
        </form>

        {recentOrders.length > 0 && (
          <div className="tracker-recent-chips" style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>
              🕒 Pesanan Terakhir di Perangkat Ini:
            </span>
            {recentOrders.map((code) => (
              <button
                key={code}
                type="button"
                className="button button-small button-light"
                style={{ minHeight: "30px", padding: "0 10px", fontSize: "11.5px", fontWeight: 700, borderRadius: "99px" }}
                onClick={() => {
                  setCodeQuery(code);
                  if (phoneLast4.length >= 4) {
                    handleSearch(code, phoneLast4);
                  }
                }}
              >
                {code}
              </button>
            ))}
          </div>
        )}

        <p className="tracker-privacy-hint" style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--muted, #64748b)" }}>
          🔒 <em>Privasi terjamin: Informasi kontak dan nama pemesan disamarkan secara otomatis demi keamanan data.</em>
        </p>
      </div>

      {errorMessage && (
        <div className="tracker-alert error">
          <p>{errorMessage}</p>
        </div>
      )}

      {searched && !busy && orders.length === 0 && !errorMessage && (
        <div className="tracker-empty">
          <div className="empty-icon">🔍</div>
          <h3>Pesanan tidak ditemukan</h3>
          <p>Periksa kembali kode pesanan atau nomor WhatsApp yang kamu masukkan.</p>
        </div>
      )}

      {orders.length > 0 && (
        <div className="tracked-orders-list">
          {orders.map((order) => {
            const stepIdx = getStepIndex(order.status);
            const isCancelled = order.status === "cancelled";
            const sellerWa = sanitizeWa(order.batch.product.seller.whatsapp);
            const waChatUrl = `https://wa.me/${sellerWa}?text=${encodeURIComponent(
              `Halo kak ${order.batch.product.seller.display_name}, saya ${order.buyer_name} mau tanya perihal pesanan *${order.batch.product.name}* (Kode: ${order.order_code}). Terima kasih!`
            )}`;

            return (
              <article key={order.id} className="tracked-card">
                <header className="tracked-card-header">
                  <div>
                    <span className="order-code-badge">{order.order_code}</span>
                    <span className="order-time-meta">Dipesan {formatCampusDate(order.created_at)}</span>
                  </div>
                  <span className={`status-pill status-${order.status}`}>
                    {order.status === "pending" && "🟡 Menunggu Konfirmasi"}
                    {order.status === "confirmed" && "🔵 Dikonfirmasi Penjual"}
                    {order.status === "ready" && "🟢 Siap Diambil di Selasar"}
                    {order.status === "picked_up" && "🟣 Selesai"}
                    {order.status === "cancelled" && "🔴 Dibatalkan"}
                  </span>
                </header>

                <div className="tracked-card-body">
                  <div className="tracked-item-preview">
                    <div className="preview-image-box">
                      <Image
                        src={getProductPhoto(order.batch.product.name)}
                        alt={order.batch.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="preview-details">
                      <span className="preview-category">{order.batch.product.category}</span>
                      <h3>{order.batch.product.name}</h3>
                      <p className="preview-qty-price">
                        {order.quantity} porsi × {formatRupiah(order.unit_price_idr)} ={" "}
                        <strong>{formatRupiah(order.total_price_idr)}</strong>
                      </p>
                      <div className="buyer-tag">
                        Pemesan: <strong>{order.buyer_name}</strong> ({order.buyer_faculty})
                      </div>
                    </div>
                  </div>

                  {/* Visual Timeline Progress */}
                  <div className="tracked-timeline">
                    <h4>Tahapan Pesanan</h4>
                    {isCancelled ? (
                      <div className="timeline-cancelled-notice">
                        Pesanan ini telah dibatalkan. Hubungi penjual jika ada kekeliruan.
                      </div>
                    ) : (
                      <div className="timeline-stepper">
                        {STEPS.map((s, idx) => {
                          const isDone = idx <= stepIdx;
                          const isCurrent = idx === stepIdx;
                          return (
                            <div
                              key={s.key}
                              className={`timeline-step ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}
                            >
                              <div className="step-marker">
                                {isDone ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                ) : (
                                  <span>{idx + 1}</span>
                                )}
                              </div>
                              <div className="step-info">
                                <strong className="step-title">{s.label}</strong>
                                <small className="step-desc">{s.desc}</small>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Pickup & Seller Action Row */}
                  <div className="tracked-pickup-info">
                    <div className="pickup-box">
                      <div className="pickup-item">
                        <span className="pickup-label">TITIK PENGAMBILAN</span>
                        <strong className="pickup-val">{order.batch.pickup_point}</strong>
                      </div>
                      <div className="pickup-item">
                        <span className="pickup-label">JADWAL AMBIL</span>
                        <strong className="pickup-val">{formatCampusDate(order.batch.pickup_at)}</strong>
                      </div>
                      {order.batch.pickup_note && (
                        <div className="pickup-item note">
                          <span className="pickup-label">CATATAN PENJUAL</span>
                          <span className="pickup-val-note">{order.batch.pickup_note}</span>
                        </div>
                      )}
                    </div>

                    <div className="seller-contact-box">
                      <span className="contact-label">Penjual Terverifikasi:</span>
                      <strong>{order.batch.product.seller.display_name}</strong>
                      <small>{order.batch.product.seller.faculty}</small>
                      <a
                        href={waChatUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button-wa"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.44 19.65L5.27 16.61L5.09 16.31C4.27 15.01 3.81 13.48 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z" />
                        </svg>
                        Hubungi via WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
