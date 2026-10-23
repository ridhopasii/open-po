"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { OrderAction } from "@/components/order-action";
import { SellerAvatarUpload } from "@/components/seller-avatar-upload";
import { PrefillProduct, SellerForm } from "@/components/seller-form";
import { SellerIdentity } from "@/components/seller-identity";
import { LogoutButton } from "@/components/logout-button";
import { formatCampusDate, formatRupiah, getSellerAvatarUrl } from "@/lib/marketplace-shared";

export type SellerOrder = {
  id: string;
  order_code: string;
  buyer_name: string;
  buyer_faculty: string;
  buyer_whatsapp: string;
  quantity: number;
  total_price_idr: number;
  status: string;
  created_at: string;
};

export type SellerBatch = {
  id: string;
  title: string;
  quota: number;
  reserved_quantity: number;
  closes_at: string;
  pickup_at: string;
  pickup_point: string;
  status: string;
  product: { name: string; price_idr: number };
  orders: SellerOrder[];
};

export type SellerProfile = {
  display_name: string;
  faculty: string;
  whatsapp: string;
  avatar_path?: string | null;
};

export type SellerProduct = {
  id: string;
  name: string;
  category: string;
  price_idr: number;
  description: string;
  photo?: string;
  total_batches: number;
  total_sold: number;
  status: "active" | "draft";
};

type MainTab = "batches" | "products" | "broadcast" | "payment" | "create";

function whatsappDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  ready: "Siap diambil",
  picked_up: "Selesai",
  cancelled: "Dibatalkan",
};

const initialCatalogProducts: SellerProduct[] = [
  {
    id: "prod-1",
    name: "Risol Mayo Beef Melted (Isi 4)",
    category: "Makanan",
    price_idr: 12000,
    description: "Risol renyah isi smoked beef, telur rebus, dan mayo lumer racikan khusus. Halal & higienis.",
    photo: "/images/risol-mayo.jpg",
    total_batches: 3,
    total_sold: 58,
    status: "active",
  },
  {
    id: "prod-2",
    name: "Kopi Susu Aren Kampus (Bottle 250ml)",
    category: "Minuman",
    price_idr: 10000,
    description: "Espresso robusta lokal dipadu susu segar dan gula aren murni. Pas untuk nemenin nugas.",
    photo: "/images/kopi-susu.jpg",
    total_batches: 4,
    total_sold: 92,
    status: "active",
  },
  {
    id: "prod-3",
    name: "Cold Brew Matcha Latte Oatmilk",
    category: "Minuman",
    price_idr: 18000,
    description: "Matcha premium import Jepang dipadukan dengan oatmilk creamy dan gula tebu alami.",
    photo: "/images/matcha-latte.jpg",
    total_batches: 2,
    total_sold: 45,
    status: "active",
  },
  {
    id: "prod-4",
    name: "Brownies Sekat Fudgy (9 Sekat)",
    category: "Makanan",
    price_idr: 18000,
    description: "Brownies cokelat pekat dengan tekstur fudgy berkilau, aneka topping: almond, keju, choco chips.",
    photo: "/images/brownies.jpg",
    total_batches: 3,
    total_sold: 60,
    status: "active",
  },
  {
    id: "prod-5",
    name: "Kaos Angkatan Cotton Combed 24s",
    category: "Fashion",
    price_idr: 95000,
    description: "Kaos sablon DTF tahan cuci bahan premium 24s adem, tersedia ukuran S sampai XXL.",
    photo: "/images/kaos-angkatan.jpg",
    total_batches: 1,
    total_sold: 61,
    status: "active",
  },
];

export function SellerDashboardView({
  seller,
  batches: initialBatches,
  products: initialProductsProp,
  isDemo = false,
  newBatchId,
}: {
  seller: SellerProfile | null;
  batches: SellerBatch[];
  products?: SellerProduct[];
  isDemo?: boolean;
  newBatchId?: string;
}) {
  const [mainTab, setMainTab] = useState<MainTab>("batches");
  const [batches, setBatches] = useState<SellerBatch[]>(initialBatches);
  const [products, setProducts] = useState<SellerProduct[]>(
    initialProductsProp !== undefined ? initialProductsProp : (isDemo ? initialCatalogProducts : [])
  );
  const [batchTab, setBatchTab] = useState<"all" | "open" | "ready" | "closed">("all");
  const [selectedBatchForRecap, setSelectedBatchForRecap] = useState<SellerBatch | null>(null);
  const [prefillProduct, setPrefillProduct] = useState<PrefillProduct | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New product modal state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("Makanan");
  const [newProdPrice, setNewProdPrice] = useState("15000");
  const [newProdDesc, setNewProdDesc] = useState("");

  // Store & payment settings state
  const [bankName, setBankName] = useState("BCA (Bank Central Asia)");
  const [bankNumber, setBankNumber] = useState("8210 9328 11");
  const [bankHolder, setBankHolder] = useState(seller?.display_name ?? "Nadia Putri");
  const [qrisNmid, setQrisNmid] = useState("ID102026OPENPO01");
  const [qrisNote, setQrisNote] = useState("Dukung BCA, GoPay, OVO, Dana, LinkAja, ShopeePay");

  // Broadcast Hub state
  const [broadcastBatchId, setBroadcastBatchId] = useState<string>(batches[0]?.id || "");
  const selectedBroadcastBatch = useMemo(() => {
    return batches.find((b) => b.id === broadcastBatchId) || batches[0] || null;
  }, [batches, broadcastBatchId]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // Financial & Operational Metrics
  const metrics = useMemo(() => {
    let totalOmzet = 0;
    let totalOrders = 0;
    let totalQuota = 0;
    let totalReserved = 0;
    let activeCount = 0;

    batches.forEach((b) => {
      totalQuota += b.quota;
      totalReserved += b.reserved_quantity;
      if (b.status === "open") activeCount++;

      (b.orders || []).forEach((o) => {
        if (o.status !== "cancelled") {
          totalOmzet += o.total_price_idr;
          totalOrders++;
        }
      });
    });

    const quotaPct = totalQuota > 0 ? Math.round((totalReserved / totalQuota) * 100) : 0;

    return { totalOmzet, totalOrders, quotaPct, activeCount };
  }, [batches]);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    if (batchTab === "all") return batches;
    if (batchTab === "open") return batches.filter((b) => b.status === "open");
    if (batchTab === "ready") return batches.filter((b) => b.status === "ready");
    return batches.filter((b) => b.status === "closed" || b.status === "cancelled");
  }, [batches, batchTab]);

  // Actions
  function copyPoLink(batchId: string, productName: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://open-po.vercel.app";
    const url = `${origin}/po/${batchId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast(`Link PO "${productName}" berhasil disalin!`);
    }
  }

  function handleOpenBatchFromProduct(prod: SellerProduct) {
    setPrefillProduct({
      name: prod.name,
      category: prod.category,
      price: prod.price_idr,
      description: prod.description,
    });
    setMainTab("create");
    showToast(`Data barang "${prod.name}" terhubung ke formulir buka PO!`);
  }

  async function handleAddNewProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newProdName.trim()) return;

    try {
      const res = await fetch("/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProdName.trim(),
          category: newProdCategory,
          price_idr: Number(newProdPrice) || 10000,
          description: newProdDesc.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Gagal menambah produk.");
        return;
      }

      const created: SellerProduct = {
        id: data.product.id,
        name: data.product.name,
        category: data.product.category,
        price_idr: data.product.price_idr,
        description: newProdDesc.trim(),
        total_batches: 0,
        total_sold: 0,
        status: "active",
        photo: newProdCategory === "Minuman" ? "/images/matcha-latte.jpg" : "/images/risol-mayo.jpg",
      };

      setProducts((prev) => [created, ...prev]);
      setShowAddProductModal(false);
      setNewProdName("");
      setNewProdDesc("");
      showToast(`Barang dagangan "${created.name}" berhasil disimpan ke database!`);
    } catch {
      showToast("Terjadi gangguan koneksi internet saat menambah barang.");
    }
  }

  async function handleDeleteProduct(prodId: string, prodName: string) {
    if (!confirm(`Hapus/arsipkan barang "${prodName}" dari katalog tokomu?`)) return;

    try {
      const res = await fetch(`/api/seller/products/${prodId}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== prodId));
        showToast(`Barang "${prodName}" berhasil diarsipkan.`);
      } else {
        const d = await res.json();
        showToast(d.error || "Gagal menghapus barang.");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan.");
    }
  }

  function handleDemoStatusChange(orderId: string, newStatus: string) {
    setBatches((prev) =>
      prev.map((b) => ({
        ...b,
        orders: b.orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      })),
    );
    showToast(`Status pesanan berhasil diubah ke: ${STATUS_LABELS[newStatus] ?? newStatus}`);
  }

  function downloadBatchCsv(batch: SellerBatch) {
    const headers = "Kode Pesanan,Nama Pembeli,Fakultas,WhatsApp,Jumlah,Total Bayar,Status\n";
    const rows = (batch.orders || [])
      .map(
        (o) =>
          `"${o.order_code}","${o.buyer_name}","${o.buyer_faculty}","${o.buyer_whatsapp}",${o.quantity},${o.total_price_idr},"${STATUS_LABELS[o.status] ?? o.status}"`,
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Rekap_PO_${batch.product.name.replace(/[^a-zA-Z0-9]+/g, "_")}.csv`;
    link.click();
    showToast("File rekap pesanan CSV berhasil diunduh!");
  }

  function copyBroadcastText(type: "announce" | "reminder" | "ready") {
    if (!selectedBroadcastBatch) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://open-po.vercel.app";
    const url = `${origin}/po/${selectedBroadcastBatch.id}`;
    const remaining = Math.max(0, selectedBroadcastBatch.quota - selectedBroadcastBatch.reserved_quantity);

    let text = "";
    if (type === "announce") {
      text =
        `📢 *OPEN PRE-ORDER KAMPUS: ${selectedBroadcastBatch.product.name.toUpperCase()}*\n\n` +
        `👨‍🍳 Penjual: ${seller?.display_name ?? "Penjual Mahasiswa"} (${seller?.faculty ?? "Kampus"})\n` +
        `💰 Harga: ${formatRupiah(selectedBroadcastBatch.product.price_idr)} / item\n` +
        `📦 Kuota Tersedia: ${remaining} dari ${selectedBroadcastBatch.quota} porsi\n` +
        `⏰ Batas Pesan: ${formatCampusDate(selectedBroadcastBatch.closes_at)}\n` +
        `📍 Titik Ambil: ${selectedBroadcastBatch.pickup_point}\n\n` +
        `👉 *Pesan langsung tanpa perlu buat akun:*\n${url}\n\n` +
        `_Kuota otomatis terkunci saat penuh!_`;
    } else if (type === "reminder") {
      text =
        `🚨 *LAST CALL PRE-ORDER KAMPUS!*\n\n` +
        `Batch *${selectedBroadcastBatch.product.name}* sebentar lagi akan ditutup!\n` +
        `Sisa kuota: *${remaining} porsi lagi*.\n\n` +
        `⏰ Ditutup: ${formatCampusDate(selectedBroadcastBatch.closes_at)}\n` +
        `📍 Ambil di: ${selectedBroadcastBatch.pickup_point}\n\n` +
        `👉 Amankan porsimu sekarang:\n${url}`;
    } else {
      text =
        `🎉 *PESANAN PRE-ORDER SUDAH SIAP DIAMBIL!*\n\n` +
        `Halo teman-teman pemesan *${selectedBroadcastBatch.product.name}*!\n` +
        `Barang sudah selesai disiapkan dan saat ini sudah berada di titik kumpul:\n\n` +
        `📍 *${selectedBroadcastBatch.pickup_point}*\n` +
        `⏰ Jadwal: ${formatCampusDate(selectedBroadcastBatch.pickup_at)}\n\n` +
        `Silakan datang dan tunjukkan Kode Pesanan masing-masing. Terima kasih banyak!`;
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast("Teks broadcast berhasil disalin ke clipboard!");
    }
  }

  return (
    <div className="seller-dashboard-wrap">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="seller-toast" role="alert">
          <span>✓</span> {toastMessage}
        </div>
      )}

      {/* Newly Published Banner */}
      {newBatchId && (
        <div className="success-banner" role="status">
          🎉 Batch PO baru berhasil diterbitkan ke etalase kampus! Bagikan tautan ini ke grup WA:{" "}
          <Link href={`/po/${newBatchId}`}>{`/po/${newBatchId}`}</Link>
        </div>
      )}

      {/* Profile Bar */}
      <div className="seller-profile-banner">
        <div className="seller-profile-left">
          <SellerIdentity
            name={seller?.display_name ?? "Nadia Putri (Dapur Mahasiswa)"}
            faculty={seller?.faculty ?? "Fakultas Pertanian · Wirausaha Kampus"}
            avatarUrl={getSellerAvatarUrl(seller?.avatar_path)}
          />
          {!isDemo && <SellerAvatarUpload hasPhoto={Boolean(seller?.avatar_path)} />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div className="seller-status-chip">
            <span className="status-dot dot-green" />
            <span>Toko Aktif Menerima PO</span>
          </div>
          {!isDemo && (
            <LogoutButton className="button button-light button-small">
              Keluar Akun
            </LogoutButton>
          )}
        </div>
      </div>

      {/* Visual Workflow Stepper */}
      <div className="seller-pipeline-bar" aria-label="Alur Bisnis Pre-Order Mahasiswa">
        <div className={`pipeline-step ${mainTab === "products" ? "active" : ""}`}>
          <div className="step-num">1</div>
          <div className="step-text">
            <strong>Katalog Barang</strong>
            <small>Atur menu & harga jualan</small>
          </div>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className={`pipeline-step ${mainTab === "create" ? "active" : ""}`}>
          <div className="step-num">2</div>
          <div className="step-text">
            <strong>Buka Batch PO</strong>
            <small>Tentukan kuota & titik ambil</small>
          </div>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className={`pipeline-step ${mainTab === "broadcast" ? "active" : ""}`}>
          <div className="step-num">3</div>
          <div className="step-text">
            <strong>Broadcast WA</strong>
            <small>Sebar link ke grup kampus</small>
          </div>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className={`pipeline-step ${mainTab === "batches" ? "active" : ""}`}>
          <div className="step-num">4</div>
          <div className="step-text">
            <strong>Kelola & Serah Terima</strong>
            <small>Konfirmasi & serah terima</small>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <section className="seller-metrics-grid" aria-label="Ringkasan Performa Penjual">
        <div className="metric-box">
          <span className="metric-label">TOTAL OMZET PO</span>
          <strong className="metric-val">{formatRupiah(metrics.totalOmzet)}</strong>
          <small className="metric-hint">Dari pesanan terkonfirmasi</small>
        </div>
        <div className="metric-box">
          <span className="metric-label">PESANAN DITERIMA</span>
          <strong className="metric-val">{metrics.totalOrders} pesanan</strong>
          <small className="metric-hint">Warga kampus yang memesan</small>
        </div>
        <div className="metric-box">
          <span className="metric-label">KETERISIAN KUOTA</span>
          <strong className="metric-val">{metrics.quotaPct}%</strong>
          <small className="metric-hint">Rata-rata kuota terpenuhi</small>
        </div>
        <div className="metric-box">
          <span className="metric-label">PO SEDANG AKTIF</span>
          <strong className="metric-val">{metrics.activeCount} Batch</strong>
          <small className="metric-hint">Dapat dipesan di etalase</small>
        </div>
      </section>

      {/* Main Navigation Tabs */}
      <div className="seller-nav-tabs">
        <button
          type="button"
          className={`seller-tab-btn ${mainTab === "batches" ? "active" : ""}`}
          onClick={() => setMainTab("batches")}
        >
          📦 Batch PO & Pesanan ({batches.length})
        </button>
        <button
          type="button"
          className={`seller-tab-btn ${mainTab === "products" ? "active" : ""}`}
          onClick={() => setMainTab("products")}
        >
          🏷️ Katalog Barang ({products.length})
        </button>
        <button
          type="button"
          className={`seller-tab-btn ${mainTab === "broadcast" ? "active" : ""}`}
          onClick={() => setMainTab("broadcast")}
        >
          📢 Pusat Broadcast WA
        </button>
        <button
          type="button"
          className={`seller-tab-btn ${mainTab === "payment" ? "active" : ""}`}
          onClick={() => setMainTab("payment")}
        >
          💳 Rekening & Toko
        </button>
        <button
          type="button"
          className={`seller-tab-btn seller-tab-highlight ${mainTab === "create" ? "active" : ""}`}
          onClick={() => {
            setPrefillProduct(null);
            setMainTab("create");
          }}
        >
          ➕ Buka PO Baru
        </button>
      </div>

      {/* ========================================================
          TAB 1: BATCHES & INCOMING ORDERS
         ======================================================== */}
      {mainTab === "batches" && (
        <section className="seller-batch-section">
          <div className="batch-section-header">
            <div>
              <h2>Batch PO & Pesanan Masuk</h2>
              <p>Kelola pesanan pembeli, pantau kuota, dan lakukan konfirmasi pengambilan di selasar.</p>
            </div>
            <div className="batch-filter-pills">
              <button
                type="button"
                className={`pill-btn ${batchTab === "all" ? "active" : ""}`}
                onClick={() => setBatchTab("all")}
              >
                Semua ({batches.length})
              </button>
              <button
                type="button"
                className={`pill-btn ${batchTab === "open" ? "active" : ""}`}
                onClick={() => setBatchTab("open")}
              >
                Sedang Buka ({batches.filter((b) => b.status === "open").length})
              </button>
              <button
                type="button"
                className={`pill-btn ${batchTab === "ready" ? "active" : ""}`}
                onClick={() => setBatchTab("ready")}
              >
                Siap Ambil ({batches.filter((b) => b.status === "ready").length})
              </button>
              <button
                type="button"
                className={`pill-btn ${batchTab === "closed" ? "active" : ""}`}
                onClick={() => setBatchTab("closed")}
              >
                Ditutup ({batches.filter((b) => b.status === "closed" || b.status === "cancelled").length})
              </button>
            </div>
          </div>

          {filteredBatches.length > 0 ? (
            <div className="seller-batch-list">
              {filteredBatches.map((batch) => {
                const remaining = Math.max(0, batch.quota - batch.reserved_quantity);
                const pct = Math.round((batch.reserved_quantity / batch.quota) * 100);

                return (
                  <article className="seller-batch-card" key={batch.id}>
                    {/* Batch Card Header */}
                    <div className="batch-card-top">
                      <div>
                        <div className="batch-meta-row">
                          <span className={`status-pill status-${batch.status}`}>
                            {batch.status.toUpperCase()}
                          </span>
                          <span className="batch-quota-badge">
                            {batch.reserved_quantity} / {batch.quota} TERPESAN ({pct}%)
                          </span>
                        </div>
                        <h3 className="batch-card-title">{batch.product.name}</h3>
                        <p className="batch-card-info">
                          <strong>{formatRupiah(batch.product.price_idr)}</strong> / item · Tutup{" "}
                          {formatCampusDate(batch.closes_at)} · Ambil {formatCampusDate(batch.pickup_at)} di{" "}
                          <u>{batch.pickup_point}</u>
                        </p>
                      </div>

                      <div className="batch-quick-actions">
                        <button
                          type="button"
                          className="button button-outline button-small"
                          onClick={() => copyPoLink(batch.id, batch.product.name)}
                          title="Salin tautan halaman PO untuk dibagikan"
                        >
                          🔗 Salin Link
                        </button>
                        <button
                          type="button"
                          className="button button-outline button-small"
                          onClick={() => {
                            setBroadcastBatchId(batch.id);
                            setMainTab("broadcast");
                          }}
                          title="Buka generator broadcast WhatsApp untuk batch ini"
                        >
                          📢 Format WA
                        </button>
                        <button
                          type="button"
                          className="button button-light button-small"
                          onClick={() => setSelectedBatchForRecap(batch)}
                          title="Lihat ringkasan dan cetak rekap pesanan"
                        >
                          📄 Rekap CSV
                        </button>
                        <Link
                          className="button button-light button-small"
                          href={`/po/${batch.id}`}
                          target="_blank"
                        >
                          Lihat PO ↗
                        </Link>
                      </div>
                    </div>

                    {/* Quota Progress Bar */}
                    <div className="batch-progress-bar">
                      <div
                        className="batch-progress-fill"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    {/* Orders Table */}
                    {batch.orders?.length ? (
                      <div className="order-table-wrap">
                        <table className="order-table">
                          <thead>
                            <tr>
                              <th>Pembeli & Kontak</th>
                              <th>Qty</th>
                              <th>Total</th>
                              <th>Status & Tindakan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {batch.orders.map((order) => {
                              const waClean = whatsappDigits(order.buyer_whatsapp);
                              const waMessage = encodeURIComponent(
                                `Halo kak ${order.buyer_name}! Pesanan Open PO "${batch.product.name}" (Kode: ${order.order_code}) sudah ${
                                  order.status === "ready" ? "siap diambil di " + batch.pickup_point : "dikonfirmasi"
                                }. Ditunggu ya kak!`,
                              );

                              return (
                                <tr key={order.id}>
                                  <td>
                                    <b>{order.buyer_name}</b>
                                    <small className="buyer-fac-row">
                                      {order.buyer_faculty} ·{" "}
                                      <a
                                        href={`https://wa.me/${waClean}?text=${waMessage}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="wa-link-btn"
                                        title="Kirim pesan konfirmasi langsung ke WhatsApp pembeli"
                                      >
                                        💬 Chat WA ({order.buyer_whatsapp})
                                      </a>
                                    </small>
                                    <small className="order-code-text">Kode: {order.order_code}</small>
                                  </td>
                                  <td>
                                    <strong>{order.quantity}</strong> item
                                  </td>
                                  <td>
                                    <strong className="order-price-val">
                                      {formatRupiah(order.total_price_idr)}
                                    </strong>
                                  </td>
                                  <td>
                                    <div className="order-status-block">
                                      <span className={`order-status status-${order.status}`}>
                                        {STATUS_LABELS[order.status] ?? order.status}
                                      </span>

                                      {/* Action buttons */}
                                      <div className="order-action-list">
                                        {order.status === "pending" && (
                                          <OrderAction id={order.id} status="confirmed" label="Konfirmasi" />
                                        )}
                                        {order.status === "confirmed" && (
                                          <OrderAction id={order.id} status="ready" label="Siap diambil" />
                                        )}
                                        {order.status === "ready" && (
                                          <OrderAction id={order.id} status="picked_up" label="Sudah diambil" />
                                        )}
                                        {["pending", "confirmed", "ready"].includes(order.status) && (
                                          <OrderAction id={order.id} status="cancelled" label="Batalkan" />
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="empty-batch-orders">
                        <p>Belum ada pesanan masuk untuk batch ini.</p>
                        <button
                          type="button"
                          className="button button-small"
                          onClick={() => {
                            setBroadcastBatchId(batch.id);
                            setMainTab("broadcast");
                          }}
                        >
                          📢 Buka Format Broadcast WA Grup Kampus
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="seller-empty-state">
              <p>Tidak ada batch PO pada kategori filter ini.</p>
            </div>
          )}
        </section>
      )}

      {/* ========================================================
          TAB 2: KATALOG BARANG DAGANGAN (PRODUCTS MANAGEMENT)
         ======================================================== */}
      {mainTab === "products" && (
        <section className="seller-products-section">
          <div className="products-head-bar">
            <div>
              <h2>Katalog Barang & Menu Jualan</h2>
              <p>
                Kelola menu dan produk jualanmu. Kamu bisa membuka batch PO baru dari barang ini hanya dengan 1 klik!
              </p>
            </div>
            <button
              type="button"
              className="button button-primary button-small"
              onClick={() => setShowAddProductModal(true)}
            >
              ➕ Tambah Barang Baru
            </button>
          </div>

          <div className="seller-products-grid">
            {products.map((prod) => (
              <div className="seller-product-card" key={prod.id}>
                {prod.photo && (
                  <div className="product-card-photo">
                    <Image
                      src={prod.photo}
                      alt={prod.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 300px"
                    />
                    <span className="prod-cat-badge">{prod.category}</span>
                  </div>
                )}
                <div className="product-card-body">
                  <h3>{prod.name}</h3>
                  <p className="prod-desc">{prod.description}</p>
                  <div className="prod-meta-row">
                    <span className="prod-price">{formatRupiah(prod.price_idr)}</span>
                    <span className="prod-stats">
                      {prod.total_batches} Batch · {prod.total_sold} Terjual
                    </span>
                  </div>
                  <div className="prod-actions" style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="button button-primary button-small"
                      style={{ flex: 1 }}
                      onClick={() => handleOpenBatchFromProduct(prod)}
                    >
                      🚀 Buka Batch PO
                    </button>
                    <button
                      type="button"
                      className="button button-secondary button-small"
                      onClick={() => handleDeleteProduct(prod.id, prod.name)}
                      title="Hapus / Arsipkan barang dari katalog"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div className="seller-empty-state" style={{ gridColumn: "1 / -1" }}>
                <p>Belum ada barang dagangan di katalog tokomu.</p>
                <button
                  type="button"
                  className="button button-primary button-small"
                  onClick={() => setShowAddProductModal(true)}
                >
                  ➕ Tambah Barang Dagangan Sekarang
                </button>
              </div>
            )}
          </div>

          {/* Modal Tambah Barang Baru */}
          {showAddProductModal && (
            <div className="recap-modal-overlay" onClick={() => setShowAddProductModal(false)}>
              <div className="recap-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="recap-modal-head">
                  <h3>Tambah Barang Dagangan ke Katalog</h3>
                  <button
                    type="button"
                    className="close-modal-btn"
                    onClick={() => setShowAddProductModal(false)}
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleAddNewProduct} className="form-stack modal-form-body">
                  <label>
                    Nama Barang / Menu Jualan
                    <input
                      required
                      placeholder="Contoh: Dimsum Ayam Mentai (Isi 6)"
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                    />
                  </label>
                  <label>
                    Kategori
                    <select
                      value={newProdCategory}
                      onChange={(e) => setNewProdCategory(e.target.value)}
                    >
                      <option value="Makanan">Makanan</option>
                      <option value="Minuman">Minuman</option>
                      <option value="Fashion">Fashion</option>
                      <option value="Merchandise">Merchandise</option>
                      <option value="Kerajinan">Kerajinan</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </label>
                  <label>
                    Harga Standar (Rp)
                    <input
                      type="number"
                      required
                      min={1000}
                      step={500}
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                    />
                  </label>
                  <label>
                    Deskripsi Singkat & Varian
                    <textarea
                      rows={3}
                      placeholder="Porsi, rasa, halal, ketahanan suhu, atau ukuran..."
                      value={newProdDesc}
                      onChange={(e) => setNewProdDesc(e.target.value)}
                    />
                  </label>
                  <div className="recap-modal-footer">
                    <button type="submit" className="button button-primary button-small">
                      Simpan Barang ke Katalog
                    </button>
                    <button
                      type="button"
                      className="button button-light button-small"
                      onClick={() => setShowAddProductModal(false)}
                    >
                      Batal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ========================================================
          TAB 3: PUSAT BROADCAST WA (WHATSAPP HUB)
         ======================================================== */}
      {mainTab === "broadcast" && (
        <section className="broadcast-hub-section">
          <div className="broadcast-head">
            <div>
              <h2>Pusat Broadcast WhatsApp & Promosi</h2>
              <p>
                Salin format pesan siap kirim untuk disebar ke grup kelas, angkatan, himpunan, atau UKM kampus.
              </p>
            </div>
            {batches.length > 1 && (
              <div className="batch-selector-wrap">
                <label>Pilih Batch PO:</label>
                <select
                  value={broadcastBatchId}
                  onChange={(e) => setBroadcastBatchId(e.target.value)}
                  className="batch-select-dropdown"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.product.name} ({b.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {selectedBroadcastBatch ? (
            <div className="broadcast-templates-grid">
              {/* Template 1: Announce */}
              <div className="broadcast-card">
                <div className="broadcast-card-head">
                  <span className="template-badge badge-green">📢 Pengumuman Buka PO</span>
                  <h3>Pesan Pembukaan Batch Baru</h3>
                  <p>Kirim saat batch baru dibuka agar kuota cepat terisi.</p>
                </div>
                <div className="template-preview-box">
                  <code>
                    📢 *OPEN PRE-ORDER KAMPUS: {selectedBroadcastBatch.product.name.toUpperCase()}*<br /><br />
                    👨‍🍳 Penjual: {seller?.display_name ?? "Penjual Mahasiswa"} ({seller?.faculty ?? "Kampus"})<br />
                    💰 Harga: {formatRupiah(selectedBroadcastBatch.product.price_idr)} / item<br />
                    📦 Kuota Tersedia: {Math.max(0, selectedBroadcastBatch.quota - selectedBroadcastBatch.reserved_quantity)} porsi<br />
                    ⏰ Batas Pesan: {formatCampusDate(selectedBroadcastBatch.closes_at)}<br />
                    📍 Titik Ambil: {selectedBroadcastBatch.pickup_point}<br /><br />
                    👉 Pesan langsung tanpa buat akun di:<br />
                    {typeof window !== "undefined" ? window.location.origin : "https://openpo.id"}/po/{selectedBroadcastBatch.id}
                  </code>
                </div>
                <div className="broadcast-card-actions">
                  <button
                    type="button"
                    className="button button-small"
                    onClick={() => copyBroadcastText("announce")}
                  >
                    📋 Salin Teks
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `📢 *OPEN PRE-ORDER KAMPUS: ${selectedBroadcastBatch.product.name.toUpperCase()}*\n\n` +
                      `👨‍🍳 Penjual: ${seller?.display_name ?? "Penjual Mahasiswa"}\n` +
                      `💰 Harga: ${formatRupiah(selectedBroadcastBatch.product.price_idr)} / item\n` +
                      `⏰ Tutup: ${formatCampusDate(selectedBroadcastBatch.closes_at)}\n` +
                      `📍 Ambil: ${selectedBroadcastBatch.pickup_point}\n\n` +
                      `👉 Yuk pesan langsung: ${typeof window !== "undefined" ? window.location.origin : "https://openpo.id"}/po/${selectedBroadcastBatch.id}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="button button-wa button-small"
                  >
                    💬 Buka WhatsApp Langsung
                  </a>
                </div>
              </div>

              {/* Template 2: Last Call */}
              <div className="broadcast-card">
                <div className="broadcast-card-head">
                  <span className="template-badge badge-orange">⏰ Pengingat Last Call</span>
                  <h3>Pesan Menjelang Batch Ditutup</h3>
                  <p>Kirim 2–3 jam sebelum batas pesan berakhir untuk dorong sisa kuota.</p>
                </div>
                <div className="template-preview-box">
                  <code>
                    🚨 *LAST CALL PRE-ORDER KAMPUS!*<br /><br />
                    Batch *{selectedBroadcastBatch.product.name}* sebentar lagi akan ditutup!<br />
                    Sisa kuota: *{Math.max(0, selectedBroadcastBatch.quota - selectedBroadcastBatch.reserved_quantity)} porsi lagi*.<br /><br />
                    ⏰ Ditutup: {formatCampusDate(selectedBroadcastBatch.closes_at)}<br />
                    📍 Ambil di: {selectedBroadcastBatch.pickup_point}<br /><br />
                    👉 Amankan porsimu sekarang:<br />
                    {typeof window !== "undefined" ? window.location.origin : "https://openpo.id"}/po/{selectedBroadcastBatch.id}
                  </code>
                </div>
                <div className="broadcast-card-actions">
                  <button
                    type="button"
                    className="button button-small"
                    onClick={() => copyBroadcastText("reminder")}
                  >
                    📋 Salin Teks
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `🚨 *LAST CALL PRE-ORDER KAMPUS!*\nSisa kuota *${selectedBroadcastBatch.product.name}* tinggal sedikit lagi!\n\n` +
                      `👉 Pesan sebelum tutup: ${typeof window !== "undefined" ? window.location.origin : "https://openpo.id"}/po/${selectedBroadcastBatch.id}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="button button-wa button-small"
                  >
                    💬 Buka WhatsApp Langsung
                  </a>
                </div>
              </div>

              {/* Template 3: Pickup Ready */}
              <div className="broadcast-card">
                <div className="broadcast-card-head">
                  <span className="template-badge badge-blue">📍 Notifikasi Siap Diambil</span>
                  <h3>Pemberitahuan Barang Tiba di Kampus</h3>
                  <p>Kirim saat kamu sudah tiba di selasar/gazebo membawa pesanan.</p>
                </div>
                <div className="template-preview-box">
                  <code>
                    🎉 *PESANAN PRE-ORDER SUDAH SIAP DIAMBIL!*<br /><br />
                    Halo teman-teman pemesan *{selectedBroadcastBatch.product.name}*!<br />
                    Barang sudah selesai disiapkan dan saat ini sudah berada di titik kumpul:<br /><br />
                    📍 *{selectedBroadcastBatch.pickup_point}*<br />
                    ⏰ Jadwal: {formatCampusDate(selectedBroadcastBatch.pickup_at)}<br /><br />
                    Silakan datang dan tunjukkan Kode Pesanan masing-masing. Terima kasih!
                  </code>
                </div>
                <div className="broadcast-card-actions">
                  <button
                    type="button"
                    className="button button-small"
                    onClick={() => copyBroadcastText("ready")}
                  >
                    📋 Salin Teks
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `🎉 *PESANAN PRE-ORDER SUDAH SIAP DIAMBIL!*\nBarang *${selectedBroadcastBatch.product.name}* sudah siap di:\n📍 *${selectedBroadcastBatch.pickup_point}*\n\nDitunggu ya teman-teman!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="button button-wa button-small"
                  >
                    💬 Buka WhatsApp Langsung
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="seller-empty-state">
              <p>Belum ada batch PO aktif untuk membuat teks broadcast.</p>
              <button
                type="button"
                className="button button-small"
                onClick={() => setMainTab("create")}
              >
                ➕ Buka Batch PO Pertama Sekarang
              </button>
            </div>
          )}
        </section>
      )}

      {/* ========================================================
          TAB 4: REKENING PEMBAYARAN & TOKO
         ======================================================== */}
      {mainTab === "payment" && (
        <section className="payment-settings-section">
          <div className="payment-settings-card">
            <h2>Pengaturan Toko & Rekening Pembayaran</h2>
            <p>
              Informasi rekening ini akan otomatis ditampilkan kepada pembeli saat mereka memesan barangmu melalui QRIS atau Transfer Bank.
            </p>

            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                showToast("Pengaturan rekening & toko berhasil disimpan!");
              }}
            >
              <div className="form-section-title">
                <span>🏦</span>
                <div>
                  <b>Rekening Bank Transfer</b>
                  <small>Muncul saat pembeli memilih metode transfer bank.</small>
                </div>
              </div>

              <label>
                Nama Bank
                <select value={bankName} onChange={(e) => setBankName(e.target.value)}>
                  <option value="BCA (Bank Central Asia)">BCA (Bank Central Asia)</option>
                  <option value="Bank Mandiri">Bank Mandiri</option>
                  <option value="BRI (Bank Rakyat Indonesia)">BRI (Bank Rakyat Indonesia)</option>
                  <option value="BNI (Bank Negara Indonesia)">BNI (Bank Negara Indonesia)</option>
                  <option value="BSI (Bank Syariah Indonesia)">BSI (Bank Syariah Indonesia)</option>
                  <option value="Bank Jago">Bank Jago</option>
                  <option value="GoPay / OVO / Dana">E-Wallet (GoPay / OVO / Dana)</option>
                </select>
              </label>

              <label>
                Nomor Rekening / No. E-Wallet
                <input
                  required
                  value={bankNumber}
                  onChange={(e) => setBankNumber(e.target.value)}
                  placeholder="Contoh: 8210932811"
                />
              </label>

              <label>
                Atas Nama Pemilik Rekening
                <input
                  required
                  value={bankHolder}
                  onChange={(e) => setBankHolder(e.target.value)}
                  placeholder="Contoh: Nadia Putri"
                />
              </label>

              <div className="form-section-title" style={{ marginTop: "24px" }}>
                <span>📱</span>
                <div>
                  <b>QRIS Pembayaran Kampus</b>
                  <small>Muncul saat pembeli memilih metode scan QRIS instan.</small>
                </div>
              </div>

              <label>
                NMID QRIS Toko
                <input
                  value={qrisNmid}
                  onChange={(e) => setQrisNmid(e.target.value)}
                  placeholder="Contoh: ID102026OPENPO01"
                />
              </label>

              <label>
                Catatan Penerima QRIS
                <input
                  value={qrisNote}
                  onChange={(e) => setQrisNote(e.target.value)}
                  placeholder="Contoh: Dukung BCA, GoPay, OVO, Dana, ShopeePay"
                />
              </label>

              <button type="submit" className="button button-primary button-small" style={{ marginTop: "14px" }}>
                💾 Simpan Pengaturan Rekening
              </button>
            </form>
          </div>
        </section>
      )}

      {/* ========================================================
          TAB 5: CREATE NEW BATCH
         ======================================================== */}
      {mainTab === "create" && (
        <section className="create-batch" id="buka-po">
          <div>
            <span className="section-label">BATCH PRE-ORDER BARU</span>
            <h2>Buka PO ke Etalase</h2>
            <p>
              Tentukan produk jualan, batas kuota porsi, jadwal tutup, dan titik kumpul selasar di kampus.
            </p>
            {prefillProduct && (
              <div className="prefill-summary-card">
                <small>BARANG TERHUBUNG</small>
                <strong>{prefillProduct.name}</strong>
                <span>{formatRupiah(prefillProduct.price)} · {prefillProduct.category}</span>
                <button
                  type="button"
                  className="text-link text-small"
                  onClick={() => setPrefillProduct(null)}
                >
                  Ganti atau gunakan input bebas ✕
                </button>
              </div>
            )}
          </div>
          <SellerForm
            seller={seller}
            prefillProduct={prefillProduct}
            onBatchCreated={(id) => {
              showToast("PO berhasil diterbitkan ke etalase kampus!");
              setMainTab("batches");
            }}
          />
        </section>
      )}

      {/* Recap Modal / Drawer */}
      {selectedBatchForRecap && (
        <div className="recap-modal-overlay" onClick={() => setSelectedBatchForRecap(null)}>
          <div className="recap-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="recap-modal-head">
              <h3>Rekap Pesanan: {selectedBatchForRecap.product.name}</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setSelectedBatchForRecap(null)}
              >
                ✕
              </button>
            </div>
            <div className="recap-modal-body">
              <div className="recap-stats-row">
                <div>
                  <small>TOTAL ITEM</small>
                  <strong>{selectedBatchForRecap.reserved_quantity} item</strong>
                </div>
                <div>
                  <small>TOTAL PENDAPATAN</small>
                  <strong>
                    {formatRupiah(
                      (selectedBatchForRecap.orders || [])
                        .filter((o) => o.status !== "cancelled")
                        .reduce((acc, curr) => acc + curr.total_price_idr, 0),
                    )}
                  </strong>
                </div>
                <div>
                  <small>TITIK AMBIL</small>
                  <strong>{selectedBatchForRecap.pickup_point}</strong>
                </div>
              </div>

              <div className="recap-table-wrap">
                <table className="recap-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Pembeli</th>
                      <th>Fakultas</th>
                      <th>Jumlah</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedBatchForRecap.orders || []).map((o, idx) => (
                      <tr key={o.id}>
                        <td>{idx + 1}</td>
                        <td>{o.buyer_name}</td>
                        <td>{o.buyer_faculty}</td>
                        <td>{o.quantity}</td>
                        <td>{formatRupiah(o.total_price_idr)}</td>
                        <td>{STATUS_LABELS[o.status] ?? o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="recap-modal-footer">
              <button
                type="button"
                className="button button-small"
                onClick={() => downloadBatchCsv(selectedBatchForRecap)}
              >
                📥 Unduh CSV
              </button>
              <button
                type="button"
                className="button button-outline button-small"
                onClick={() => setSelectedBatchForRecap(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
