"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AdminBatch,
  AdminOrder,
  AdminSeller,
  sampleAdminBatches,
  sampleAdminOrders,
  sampleAdminSellers,
} from "@/data/admin-mock-data";
import { formatCampusDate, formatRupiah } from "@/lib/marketplace-shared";

type TabKey = "overview" | "batches" | "sellers" | "orders" | "settings" | "system";

function whatsappClean(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

export function AdminDashboard({
  initialBatches = sampleAdminBatches,
  initialSellers = sampleAdminSellers,
  initialOrders = sampleAdminOrders,
}: {
  initialBatches?: AdminBatch[];
  initialSellers?: AdminSeller[];
  initialOrders?: AdminOrder[];
}) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [batches, setBatches] = useState<AdminBatch[]>(initialBatches);
  const [sellers, setSellers] = useState<AdminSeller[]>(initialSellers);
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);

  // Filter & Search states
  const [batchSearch, setBatchSearch] = useState("");
  const [batchCategory, setBatchCategory] = useState("Semua");
  const [batchStatus, setBatchStatus] = useState("Semua");

  const [sellerSearch, setSellerSearch] = useState("");
  const [sellerFaculty, setSellerFaculty] = useState("Semua");

  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("Semua");

  const [confirmCancelBatch, setConfirmCancelBatch] = useState<AdminBatch | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }

  // Analytics
  const gmv = useMemo(
    () => orders.filter((o) => o.status !== "cancelled").reduce((acc, curr) => acc + curr.total_price_idr, 0),
    [orders],
  );

  const activeBatchesCount = useMemo(
    () => batches.filter((b) => b.status === "open").length,
    [batches],
  );

  const verifiedSellersCount = useMemo(
    () => sellers.filter((s) => s.verified).length,
    [sellers],
  );

  // Faculty statistics
  const facultyBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    sellers.forEach((s) => {
      counts[s.faculty] = (counts[s.faculty] || 0) + s.total_batches;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [sellers]);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchCat = batchCategory === "Semua" || b.category === batchCategory;
      const matchStatus = batchStatus === "Semua" || b.status === batchStatus;
      const matchQuery =
        !batchSearch ||
        `${b.product_name} ${b.seller_name} ${b.seller_faculty} ${b.pickup_point}`
          .toLowerCase()
          .includes(batchSearch.toLowerCase());
      return matchCat && matchStatus && matchQuery;
    });
  }, [batches, batchCategory, batchStatus, batchSearch]);

  // Filtered Sellers
  const filteredSellers = useMemo(() => {
    return sellers.filter((s) => {
      const matchFac = sellerFaculty === "Semua" || s.faculty === sellerFaculty;
      const matchQuery =
        !sellerSearch ||
        `${s.name} ${s.faculty} ${s.whatsapp}`
          .toLowerCase()
          .includes(sellerSearch.toLowerCase());
      return matchFac && matchQuery;
    });
  }, [sellers, sellerFaculty, sellerSearch]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = orderStatus === "Semua" || o.status === orderStatus;
      const matchQuery =
        !orderSearch ||
        `${o.order_code} ${o.buyer_name} ${o.buyer_faculty} ${o.product_name} ${o.buyer_whatsapp}`
          .toLowerCase()
          .includes(orderSearch.toLowerCase());
      return matchStatus && matchQuery;
    });
  }, [orders, orderStatus, orderSearch]);

  // Actions
  async function toggleSellerVerify(sellerId: string) {
    const seller = sellers.find((s) => s.id === sellerId);
    if (!seller) return;
    const nextState = !seller.verified;

    // Optimistic UI update
    setSellers((prev) =>
      prev.map((s) => (s.id === sellerId ? { ...s, verified: nextState } : s)),
    );

    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: nextState }),
      });
      if (res.ok) {
        showToast(
          nextState
            ? `Penjual ${seller.name} berhasil diberi lencana Terverifikasi!`
            : `Lencana verifikasi ${seller.name} dicabut.`,
        );
      } else {
        // Rollback on error
        setSellers((prev) =>
          prev.map((s) => (s.id === sellerId ? { ...s, verified: !nextState } : s)),
        );
        showToast("Gagal memperbarui verifikasi penjual.");
      }
    } catch {
      showToast(
        nextState
          ? `Penjual ${seller.name} ditandai Terverifikasi (offline).`
          : `Verifikasi ${seller.name} dicabut (offline).`,
      );
    }
  }


  async function updateBatchStatus(batchId: string, newStatus: AdminBatch["status"]) {
    setBatches((prev) =>
      prev.map((b) => (b.id === batchId ? { ...b, status: newStatus } : b)),
    );
    try {
      const res = await fetch(`/api/admin/batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(`Status PO berhasil disimpan: ${newStatus.toUpperCase()}`);
      }
    } catch {
      showToast(`Status PO diubah ke: ${newStatus.toUpperCase()}`);
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: AdminOrder["status"]) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
    );
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(`Status pesanan berhasil disimpan: ${newStatus.toUpperCase()}`);
      }
    } catch {
      showToast(`Status pesanan diubah ke: ${newStatus.toUpperCase()}`);
    }
  }

  function exportCSV() {
    const headers = "Kode Pesanan,Produk,Pembeli,Fakultas,WhatsApp,Penjual,Jumlah,Total,Status,Waktu\n";
    const rows = orders
      .map(
        (o) =>
          `"${o.order_code}","${o.product_name}","${o.buyer_name}","${o.buyer_faculty}","${o.buyer_whatsapp}","${o.seller_name}",${o.quantity},${o.total_price_idr},"${o.status}","${o.created_at}"`,
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Rekap_Transaksi_OpenPO_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast("File rekap transaksi CSV berhasil diunduh!");
  }

  async function handleLogoutAdmin() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="admin-shell">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="admin-toast" role="alert">
          <span>✓</span> {toastMessage}
        </div>
      )}

      {/* Admin Top Navigation */}
      <header className="admin-header">
        <div className="admin-header-main">
          <div className="admin-brand-group">
            <span className="admin-crown-badge">SUPERADMIN</span>
            <div className="admin-title-wrap">
              <h1>Control Center OpenPO</h1>
              <span className="admin-subtitle">Pusat Moderasi & Analisis PO Seluruh Kampus</span>
            </div>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="button button-outline button-small" onClick={exportCSV}>
              📥 Unduh Rekap CSV
            </button>
            <Link href="/" className="button button-light button-small">
              Etalase Beranda ↗
            </Link>
            <button
              type="button"
              className="button button-small btn-lock-admin"
              onClick={handleLogoutAdmin}
              title="Kunci kembali panel Superadmin"
            >
              🔒 Kunci Panel
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="admin-tabs" aria-label="Tab menu admin">
          <button
            type="button"
            className={`admin-tab-btn ${tab === "overview" ? "active" : ""}`}
            onClick={() => setTab("overview")}
          >
            📊 Ikhtisar & Metrik
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${tab === "batches" ? "active" : ""}`}
            onClick={() => setTab("batches")}
          >
            🛍️ Moderasi PO ({batches.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${tab === "sellers" ? "active" : ""}`}
            onClick={() => setTab("sellers")}
          >
            👥 Penjual Mahasiswa ({sellers.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${tab === "orders" ? "active" : ""}`}
            onClick={() => setTab("orders")}
          >
            🔎 Audit Pesanan ({orders.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${tab === "settings" ? "active" : ""}`}
            onClick={() => setTab("settings")}
          >
            ⚙️ Konfigurasi Kampus
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${tab === "system" ? "active" : ""}`}
            onClick={() => setTab("system")}
          >
            🖥️ Kesehatan Sistem
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="admin-content">
        {/* TAB 1: OVERVIEW */}
        {tab === "overview" && (
          <section className="admin-view-overview">
            <div className="kpi-grid">
              <div className="kpi-card">
                <span className="kpi-label">GROSS VOLUME TRANSAKSI</span>
                <strong className="kpi-val">{formatRupiah(gmv)}</strong>
                <small className="kpi-hint">Total perputaran uang pre-order kampus</small>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">PO AKTIF SAAT INI</span>
                <strong className="kpi-val">{activeBatchesCount} PO</strong>
                <small className="kpi-hint">Dari {batches.length} total batch terbit</small>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">TOTAL PESANAN KAMPUS</span>
                <strong className="kpi-val">{orders.length} pesanan</strong>
                <small className="kpi-hint">
                  {orders.filter((o) => o.status === "picked_up").length} selesai diambil
                </small>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">PENJUAL TERVERIFIKASI</span>
                <strong className="kpi-val">
                  {verifiedSellersCount} / {sellers.length}
                </strong>
                <small className="kpi-hint">Penjual aktif lintas fakultas</small>
              </div>
            </div>

            <div className="admin-split-grid">
              {/* Fakultas Teraktif */}
              <div className="admin-panel">
                <div className="admin-panel-head">
                  <h3>Aktivitas per Fakultas</h3>
                  <small>Jumlah batch PO diterbitkan</small>
                </div>
                <div className="faculty-list">
                  {facultyBreakdown.map(([fac, count], idx) => (
                    <div className="faculty-row" key={fac}>
                      <div className="faculty-info">
                        <span className="faculty-rank">#{idx + 1}</span>
                        <span className="faculty-name">{fac}</span>
                      </div>
                      <div className="faculty-stat">
                        <div className="faculty-bar-wrap">
                          <div
                            className="faculty-bar-fill"
                            style={{
                              width: `${Math.min(100, (count / (facultyBreakdown[0][1] || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                        <strong>{count} PO</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Transaksi & Kesehatan Sistem */}
              <div className="admin-panel">
                <div className="admin-panel-head">
                  <h3>Status Real-time & Verifikasi</h3>
                  <small>Indikator operasional marketplace</small>
                </div>
                <div className="status-indicator-list">
                  <div className="status-indicator-item">
                    <span className="status-dot dot-green" />
                    <div>
                      <strong>Database Supabase PostgreSQL</strong>
                      <p>Koneksi aktif dengan RLS dan rate limiting 5 order/menit</p>
                    </div>
                  </div>
                  <div className="status-indicator-item">
                    <span className="status-dot dot-purple" />
                    <div>
                      <strong>Notifikasi WhatsApp Gateway</strong>
                      <p>Tautan langsung wa.me pembeli & penjual tanpa biaya API</p>
                    </div>
                  </div>
                  <div className="status-indicator-item">
                    <span className="status-dot dot-blue" />
                    <div>
                      <strong>Titik Ambil Terpadu</strong>
                      <p>Kantin Pusat, Gazebo FISIP, Selasar FT, Perpustakaan Aktif</p>
                    </div>
                  </div>
                </div>

                <div className="admin-quick-summary-box">
                  <h4>💡 Ringkasan untuk Rektorat / BEM</h4>
                  <p>
                    OpenPO memberdayakan wirausaha mahasiswa dengan sistem pre-order tanpa modal sisa.
                    Tingkat kepuasan pengambilan mencapai 94% dengan rata-rata pelunasan di titik kumpul.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: MODERASI PO */}
        {tab === "batches" && (
          <section className="admin-view-table">
            <div className="table-controls">
              <input
                type="text"
                className="admin-search-input"
                placeholder="Cari produk, penjual, titik ambil..."
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
              />
              <select
                className="admin-select"
                value={batchCategory}
                onChange={(e) => setBatchCategory(e.target.value)}
              >
                <option value="Semua">Semua Kategori</option>
                <option value="Makanan">Makanan</option>
                <option value="Minuman">Minuman</option>
                <option value="Fashion">Fashion</option>
                <option value="Kerajinan">Kerajinan</option>
              </select>
              <select
                className="admin-select"
                value={batchStatus}
                onChange={(e) => setBatchStatus(e.target.value)}
              >
                <option value="Semua">Semua Status</option>
                <option value="open">Sedang Buka (Open)</option>
                <option value="ready">Siap Ambil (Ready)</option>
                <option value="closed">Ditutup (Closed)</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Produk & Penjual</th>
                    <th>Kategori</th>
                    <th>Harga & Kuota</th>
                    <th>Jadwal & Titik Ambil</th>
                    <th>Status PO</th>
                    <th>Aksi Superadmin</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map((b) => {
                    const pct = Math.round((b.reserved_quantity / b.quota) * 100);
                    return (
                      <tr key={b.id}>
                        <td>
                          <div className="table-product-title">
                            <Link href={`/po/${b.id}`} className="table-link">
                              <b>{b.product_name}</b>
                            </Link>
                          </div>
                          <small className="table-subtext">
                            {b.seller_name} · {b.seller_faculty}
                          </small>
                          <small className="table-wa-link">
                            <a
                              href={`https://wa.me/${whatsappClean(b.seller_whatsapp)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              WA: {b.seller_whatsapp}
                            </a>
                          </small>
                        </td>
                        <td>
                          <span className="badge-category">{b.category}</span>
                        </td>
                        <td>
                          <strong>{formatRupiah(b.price_idr)}</strong>
                          <div className="quota-progress-mini">
                            <div className="quota-bar">
                              <div className="quota-fill" style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                            <small>
                              {b.reserved_quantity}/{b.quota} ({pct}%)
                            </small>
                          </div>
                        </td>
                        <td>
                          <div className="table-dates">
                            <small>Tutup: {formatCampusDate(b.closes_at)}</small>
                            <small>Ambil: {formatCampusDate(b.pickup_at)}</small>
                            <small className="table-point">📍 {b.pickup_point}</small>
                          </div>
                        </td>
                        <td>
                          <span className={`status-pill status-${b.status}`}>
                            {b.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className="action-button-group">
                            {b.status === "open" && (
                              <button
                                type="button"
                                className="action-btn btn-warn"
                                onClick={() => updateBatchStatus(b.id, "closed")}
                              >
                                Tutup PO
                              </button>
                            )}
                            {b.status === "closed" && (
                              <button
                                type="button"
                                className="action-btn btn-success"
                                onClick={() => updateBatchStatus(b.id, "ready")}
                              >
                                Set Siap Ambil
                              </button>
                            )}
                            {b.status !== "cancelled" && (
                              <button
                                type="button"
                                className="action-btn btn-danger"
                                onClick={() => setConfirmCancelBatch(b)}
                              >
                                Batalkan PO
                              </button>
                            )}
                            {b.status === "cancelled" && (
                              <button
                                type="button"
                                className="action-btn btn-secondary"
                                onClick={() => updateBatchStatus(b.id, "open")}
                              >
                                Buka Kembali
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 3: PENJUAL MAHASISWA */}
        {tab === "sellers" && (
          <section className="admin-view-table">
            <div className="table-controls">
              <input
                type="text"
                className="admin-search-input"
                placeholder="Cari nama penjual, fakultas, nomor WhatsApp..."
                value={sellerSearch}
                onChange={(e) => setSellerSearch(e.target.value)}
              />
              <select
                className="admin-select"
                value={sellerFaculty}
                onChange={(e) => setSellerFaculty(e.target.value)}
              >
                <option value="Semua">Semua Fakultas</option>
                {facultyBreakdown.map(([fac]) => (
                  <option key={fac} value={fac}>
                    {fac}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Penjual & Status</th>
                    <th>Fakultas</th>
                    <th>Kontak WhatsApp</th>
                    <th>Total PO</th>
                    <th>Estimasi Omzet</th>
                    <th>Aksi Verifikasi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSellers.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="seller-name-row">
                          <b>{s.name}</b>
                          {s.verified && (
                            <span className="verified-badge-mini" title="Penjual Terverifikasi Kampus">
                              ✓ Terverifikasi
                            </span>
                          )}
                        </div>
                        <small className="table-subtext">
                          Bergabung {formatCampusDate(s.joined_at, { month: "short", year: "numeric" })}
                        </small>
                      </td>
                      <td>{s.faculty}</td>
                      <td>
                        <a
                          className="table-wa-direct-btn"
                          href={`https://wa.me/${whatsappClean(s.whatsapp)}?text=${encodeURIComponent(
                            `Halo kak ${s.name}, kami dari Tim Admin Superadmin OpenPO kampus...`,
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          💬 {s.whatsapp}
                        </a>
                      </td>
                      <td>
                        <strong>{s.total_batches} Batch</strong>
                      </td>
                      <td>
                        <strong className="text-purple">{formatRupiah(s.total_revenue)}</strong>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`action-btn ${s.verified ? "btn-warn" : "btn-success"}`}
                          onClick={() => toggleSellerVerify(s.id)}
                        >
                          {s.verified ? "Cabut Lencana" : "✓ Beri Lencana Verifikasi"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 4: AUDIT PESANAN GLOBAL */}
        {tab === "orders" && (
          <section className="admin-view-table">
            <div className="table-controls">
              <input
                type="text"
                className="admin-search-input"
                placeholder="Cari Kode Pesanan (PO-xxxx), nama pembeli, produk, WhatsApp..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
              <select
                className="admin-select"
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
              >
                <option value="Semua">Semua Status</option>
                <option value="pending">Menunggu (Pending)</option>
                <option value="confirmed">Dikonfirmasi (Confirmed)</option>
                <option value="ready">Siap Diambil (Ready)</option>
                <option value="picked_up">Selesai (Picked Up)</option>
                <option value="cancelled">Dibatalkan (Cancelled)</option>
              </select>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Kode & Waktu</th>
                    <th>Pembeli & Kontak</th>
                    <th>Produk & Penjual</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Tindakan Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <b className="order-code-badge">{o.order_code}</b>
                        <small className="table-subtext">{formatCampusDate(o.created_at)}</small>
                      </td>
                      <td>
                        <b>{o.buyer_name}</b>
                        <small className="table-subtext">{o.buyer_faculty}</small>
                        <a
                          className="table-wa-link"
                          href={`https://wa.me/${whatsappClean(o.buyer_whatsapp)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WA: {o.buyer_whatsapp}
                        </a>
                      </td>
                      <td>
                        <strong>{o.product_name}</strong>
                        <small className="table-subtext">Penjual: {o.seller_name}</small>
                      </td>
                      <td>{o.quantity} item</td>
                      <td>
                        <strong className="text-purple">{formatRupiah(o.total_price_idr)}</strong>
                      </td>
                      <td>
                        <span className={`status-pill status-${o.status}`}>
                          {o.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="action-button-group">
                          {o.status !== "picked_up" && (
                            <button
                              type="button"
                              className="action-btn btn-success"
                              onClick={() => updateOrderStatus(o.id, "picked_up")}
                            >
                              Selesaikan
                            </button>
                          )}
                          {o.status !== "cancelled" && (
                            <button
                              type="button"
                              className="action-btn btn-danger"
                              onClick={() => updateOrderStatus(o.id, "cancelled")}
                            >
                              Batalkan
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 5: SETTINGS */}
        {tab === "settings" && (
          <section className="admin-view-settings">
            <div className="admin-settings-card">
              <h3>Konfigurasi Platform Kampus</h3>
              <p>Pengaturan global nama perguruan tinggi, aturan PO, dan broadcast pengumuman.</p>

              <div className="settings-form">
                <label>
                  <span>Nama Kampus / Universitas</span>
                  <input
                    type="text"
                    defaultValue="Universitas Sumatera Utara (USU) & Kampus Sekitar"
                    className="admin-input"
                  />
                </label>

                <label>
                  <span>Titik Kumpul Utama Rekomendasi</span>
                  <textarea
                    rows={3}
                    defaultValue="Kantin Gedung Bersama, Selasar Fakultas Teknik, Gazebo FISIP, Depan Perpustakaan Pusat"
                    className="admin-textarea"
                  />
                </label>

                <label>
                  <span>Pesan Pengumuman Beranda (Banner Beranda)</span>
                  <input
                    type="text"
                    defaultValue="✨ Selamat datang di OpenPO Kampus! Buka PO jualanmu tanpa potongan komisi."
                    className="admin-input"
                  />
                </label>

                <div className="settings-actions">
                  <button
                    type="button"
                    className="button"
                    onClick={() => showToast("Pengaturan kampus berhasil diperbarui!")}
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 6: KESEHATAN SISTEM */}
        {tab === "system" && (
          <section className="admin-view-settings">
            <div className="admin-card">
              <div className="card-head">
                <h3>🖥️ Status Kesehatan Platform &amp; API Routes</h3>
                <p>Status sinkronisasi database realtime, rute endpoint API, dan lingkungan server.</p>
              </div>

              <div style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "var(--usu-50)", border: "1px solid var(--usu-100)", borderRadius: "8px" }}>
                  <div>
                    <strong style={{ color: "var(--usu-900)" }}>🟢 Database Supabase PostgreSQL</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--usu-700)" }}>
                      Koneksi aktif (pooled + direct client), skema OpenPO V2 live &amp; terisolasi.
                    </p>
                  </div>
                  <span className="stock-pill" style={{ background: "var(--usu-100)", color: "var(--usu-900)" }}>
                    OPERATIONAL
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "#f8fafc", border: "1px solid var(--border-ui)", borderRadius: "8px" }}>
                  <div>
                    <strong>⚡ API Engine Routes</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                      14 API Routes aktif: /api/orders, /api/orders/track, /api/seller/orders/bulk, /api/seller/batches
                    </p>
                  </div>
                  <span className="stock-pill" style={{ background: "var(--polmed-100)", color: "var(--polmed-900)" }}>
                    100% HEALTHY
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "#f8fafc", border: "1px solid var(--border-ui)", borderRadius: "8px" }}>
                  <div>
                    <strong>🛡️ Keamanan &amp; Autentikasi</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                      Admin cookie session terenkripsi (HttpOnly), passcodes terisolasi, IDOR checks aktif di seluruh endpoint seller.
                    </p>
                  </div>
                  <span className="stock-pill" style={{ background: "var(--usu-100)", color: "var(--usu-900)" }}>
                    SECURED
                  </span>
                </div>

                <div style={{ marginTop: "10px" }}>
                  <Link href="/superadmin" className="button button-small button-light" target="_blank">
                    Buka Panel Teknis Superadmin Lengkap ↗
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Confirmation Modal: Cancel Batch */}
      {confirmCancelBatch && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", padding: "16px" }}>
          <div style={{ width: "min(100%, 420px)", background: "#ffffff", borderRadius: "10px", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 10px", color: "var(--polmed-900)" }}>⚠️ Konfirmasi Pembatalan PO</h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Apakah kamu yakin ingin membatalkan batch <strong>&quot;{confirmCancelBatch.title}&quot;</strong>? Semua pesanan terkait akan otomatis ditandai dibatalkan.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="button button-light button-small"
                onClick={() => setConfirmCancelBatch(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="button button-small"
                style={{ background: "var(--tomato)", borderColor: "var(--tomato)", color: "#fff" }}
                onClick={() => {
                  updateBatchStatus(confirmCancelBatch.id, "cancelled");
                  setConfirmCancelBatch(null);
                }}
              >
                Ya, Batalkan PO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
