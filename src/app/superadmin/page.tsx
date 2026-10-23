import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatRupiah } from "@/lib/marketplace-shared";

export const metadata: Metadata = {
  title: "Superadmin · OpenPO",
  description: "Panel kontrol operasional platform OpenPO.",
};

type PlatformStats = {
  totalBatches: number;
  openBatches: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  gmv: number;
  totalSellers: number;
  routes: { name: string; status: "ok" | "error" }[];
};

async function getStats(): Promise<PlatformStats | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  try {
    const [batchRes, orderRes, sellerRes] = await Promise.all([
      supabase.from("po_batches").select("status"),
      supabase.from("po_orders").select("status,total_price_idr"),
      supabase.from("po_sellers").select("user_id", { count: "exact" }),
    ]);

    const batches = batchRes.data ?? [];
    const orders = orderRes.data ?? [];
    const totalSellers = sellerRes.count ?? 0;

    return {
      totalBatches: batches.length,
      openBatches: batches.filter((b) => b.status === "open").length,
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === "pending").length,
      completedOrders: orders.filter((o) => o.status === "picked_up").length,
      cancelledOrders: orders.filter((o) => o.status === "cancelled").length,
      gmv: orders
        .filter((o) => o.status !== "cancelled")
        .reduce((sum: number, o: { total_price_idr: number }) => sum + (o.total_price_idr ?? 0), 0),
      totalSellers,
      routes: [
        { name: "GET /api/orders/track", status: "ok" },
        { name: "POST /api/orders", status: "ok" },
        { name: "POST /api/seller/batches", status: "ok" },
        { name: "GET /api/seller/profile", status: "ok" },
        { name: "PATCH /api/admin/batches/[id]", status: "ok" },
        { name: "PATCH /api/admin/orders/[id]", status: "ok" },
        { name: "PATCH /api/admin/sellers/[id]", status: "ok" },
        { name: "GET /api/admin/stats", status: "ok" },
      ],
    };
  } catch {
    return null;
  }
}

export default async function SuperadminPage() {
  await connection();

  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("openpo_admin_token");
  if (!adminCookie?.value) {
    redirect("/admin");
  }

  const stats = await getStats();
  const supabaseConnected = stats !== null;

  const apiRoutes = [
    { method: "GET", path: "/api/orders/track", desc: "Lacak pesanan by kode/WA" },
    { method: "POST", path: "/api/orders", desc: "Buat pesanan baru (buyer)" },
    { method: "DELETE", path: "/api/orders/[id]", desc: "Cancel pesanan (buyer)" },
    { method: "POST", path: "/api/seller/batches", desc: "Buka PO baru (seller)" },
    { method: "PATCH", path: "/api/seller/batches/[id]", desc: "Edit/tutup batch (seller)" },
    { method: "PATCH", path: "/api/seller/orders/[id]", desc: "Update status order (seller)" },
    { method: "GET", path: "/api/seller/profile", desc: "Ambil profil seller" },
    { method: "PATCH", path: "/api/seller/profile", desc: "Update profil seller" },
    { method: "PATCH", path: "/api/admin/batches/[id]", desc: "Admin ubah status batch" },
    { method: "PATCH", path: "/api/admin/orders/[id]", desc: "Admin ubah status order" },
    { method: "PATCH", path: "/api/admin/sellers/[id]", desc: "Admin verify/suspend seller" },
    { method: "GET", path: "/api/admin/stats", desc: "Ringkasan statistik platform" },
    { method: "POST", path: "/api/admin/auth", desc: "Login superadmin" },
  ];

  const pages = [
    { path: "/", desc: "Marketplace (halaman utama)" },
    { path: "/po/[batchId]", desc: "Detail batch & form order buyer" },
    { path: "/lacak", desc: "Lacak pesanan tanpa akun" },
    { path: "/pesanan/[code]", desc: "Konfirmasi & detail pesanan buyer" },
    { path: "/penjual", desc: "Dashboard penjual (auth required)" },
    { path: "/admin", desc: "Superadmin dashboard" },
    { path: "/cara-kerja", desc: "Landing edukasi platform" },
    { path: "/masuk", desc: "Login buyer/seller" },
    { path: "/daftar", desc: "Registrasi akun" },
    { path: "/akun", desc: "Profil & akun pengguna" },
  ];

  const methodColor: Record<string, string> = {
    GET: "#3b82f6",
    POST: "#10b981",
    PATCH: "#f59e0b",
    DELETE: "#ef4444",
  };

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="superadmin-page">
        <div className="superadmin-container">
          {/* Header */}
          <div className="superadmin-header">
            <div className="superadmin-title-row">
              <div>
                <div className="superadmin-eyebrow">🔐 Akses Terverifikasi</div>
                <h1 className="superadmin-title">Superadmin Control Center</h1>
                <p className="superadmin-subtitle">Sistem informasi operasional platform OpenPO</p>
              </div>
              <div className="superadmin-connection-badge" data-ok={supabaseConnected}>
                <span className="superadmin-dot" />
                {supabaseConnected ? "Supabase Connected" : "Demo Mode"}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          {stats && (
            <div className="superadmin-stats-grid">
              <div className="superadmin-stat">
                <div className="superadmin-stat-val">{stats.totalBatches}</div>
                <div className="superadmin-stat-label">Total Batch PO</div>
                <div className="superadmin-stat-sub">{stats.openBatches} aktif</div>
              </div>
              <div className="superadmin-stat">
                <div className="superadmin-stat-val">{stats.totalOrders}</div>
                <div className="superadmin-stat-label">Total Pesanan</div>
                <div className="superadmin-stat-sub">{stats.pendingOrders} menunggu · {stats.completedOrders} selesai</div>
              </div>
              <div className="superadmin-stat superadmin-stat--green">
                <div className="superadmin-stat-val">{formatRupiah(stats.gmv)}</div>
                <div className="superadmin-stat-label">Total GMV</div>
                <div className="superadmin-stat-sub">Semua transaksi non-cancel</div>
              </div>
              <div className="superadmin-stat">
                <div className="superadmin-stat-val">{stats.totalSellers}</div>
                <div className="superadmin-stat-label">Penjual Terdaftar</div>
                <div className="superadmin-stat-sub">{stats.cancelledOrders} pesanan dibatalkan</div>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="superadmin-section">
            <div className="superadmin-section-title">Panel Moderasi</div>
            <div className="superadmin-quick-links">
              <Link href="/admin" className="superadmin-quick-btn">
                <span>⚡</span> Dashboard Admin
              </Link>
              <Link href="/penjual?demo=1" className="superadmin-quick-btn">
                <span>🏪</span> Seller Demo View
              </Link>
              <Link href="/lacak" className="superadmin-quick-btn">
                <span>🔍</span> Lacak Pesanan
              </Link>
              <Link href="/" className="superadmin-quick-btn">
                <span>🛍️</span> Marketplace
              </Link>
            </div>
          </div>

          {/* API Inventory */}
          <div className="superadmin-section">
            <div className="superadmin-section-title">Inventori API Endpoint ({apiRoutes.length} routes)</div>
            <div className="superadmin-api-table-wrap">
              <table className="superadmin-api-table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Path</th>
                    <th>Fungsi</th>
                  </tr>
                </thead>
                <tbody>
                  {apiRoutes.map((r) => (
                    <tr key={r.path + r.method}>
                      <td>
                        <span
                          className="superadmin-method-badge"
                          style={{ background: methodColor[r.method] ?? "#6b7280" }}
                        >
                          {r.method}
                        </span>
                      </td>
                      <td><code className="superadmin-path">{r.path}</code></td>
                      <td className="superadmin-desc">{r.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Page Inventory */}
          <div className="superadmin-section">
            <div className="superadmin-section-title">Peta Halaman ({pages.length} pages)</div>
            <div className="superadmin-pages-grid">
              {pages.map((p) => (
                <Link
                  key={p.path}
                  href={p.path.includes("[") ? "#" : p.path}
                  className="superadmin-page-card"
                >
                  <code>{p.path}</code>
                  <span>{p.desc}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Platform Info */}
          <div className="superadmin-section">
            <div className="superadmin-section-title">Informasi Platform</div>
            <div className="superadmin-info-grid">
              <div className="superadmin-info-item">
                <span>Framework</span>
                <strong>Next.js 15 (App Router)</strong>
              </div>
              <div className="superadmin-info-item">
                <span>Database</span>
                <strong>Supabase (PostgreSQL)</strong>
              </div>
              <div className="superadmin-info-item">
                <span>Auth</span>
                <strong>Supabase Auth</strong>
              </div>
              <div className="superadmin-info-item">
                <span>Rate Limiting</span>
                <strong>In-memory, per IP</strong>
              </div>
              <div className="superadmin-info-item">
                <span>Bahasa</span>
                <strong>TypeScript + Zod</strong>
              </div>
              <div className="superadmin-info-item">
                <span>Storage</span>
                <strong>Supabase Storage (avatar)</strong>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
