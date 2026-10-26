import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

function BrandMark() {
  return <span aria-hidden="true" className="brand-mark"><span /><span /><span /></span>;
}

function MobileNavIcon({ kind }: { kind: "browse" | "track" | "orders" | "help" | "sell" }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (kind === "browse") return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></svg>;
  if (kind === "track") return <svg {...common}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /><circle cx="12" cy="12" r="9" /></svg>;
  if (kind === "orders") return <svg {...common}><path d="M6 3.8h9l3 3V20H6z" /><path d="M14.5 4v4h4M9 12h6M9 15.5h6" /></svg>;
  if (kind === "help") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.4 2.4 0 1 1 4.2 1.6c-1.1 1.1-1.9 1.3-1.9 2.8M12 17h.01" /></svg>;
  return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
}

export async function SiteHeader() {
  let user = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Supabase belum terkonfigurasi atau tidak dapat dihubungi — tampilkan header tanpa auth state
  }

  return (
    <header className="site-header">
      {/* Universal Ecosystem Segment Switcher: USU x POLMED */}
      <div className="ecosystem-switcher-bar">
        <div className="ecosystem-segmented-wrap">
          <a
            href="https://www.jualbeliusupolmed.web.id"
            className="ecosystem-pill-item"
            title="Ke Marketplace Jual Beli"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <span>Jual Beli</span>
          </a>
          <div
            className="ecosystem-pill-item active"
            title="Sedang di OpenPO Kampus"
          >
            <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
            <span>OpenPO</span>
            <span className="ecosystem-live-badge">AKTIF</span>
          </div>
          <a
            href="https://www.jualbeliusupolmed.web.id/mading"
            className="ecosystem-pill-item"
            title="Ke Menfess Kampus"
          >
            <svg className="w-3.5 h-3.5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>Menfess</span>
          </a>
        </div>
      </div>

      <div className="nav-wrap">
        <Link href="/" className="brand" aria-label="Kampusfess Open PO USU POLMED">
          <div className="brand-icon-box">
            <svg
              className="w-5 h-5 text-emerald-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="brand-copy">
            <div className="brand-title-row">
              <span className="brand-name">Kampusfess</span>
              <span className="brand-campus-pill">OpenPO</span>
            </div>
            <small>Marketplace USU • POLMED</small>
          </div>
        </Link>

        <nav className="desktop-nav" aria-label="Navigasi utama">
          <Link href="/">Jelajah PO</Link>
          <Link href="/lacak" className="nav-highlight">Lacak Pesanan</Link>
          <Link href="/cara-kerja">Cara Kerja</Link>
        </nav>

        <div className="nav-actions">
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Link className="nav-login" href="/akun/pesanan">
                Pesananku
              </Link>
              <Link className="button button-po-sell" href="/penjual">
                <span>+ Buka Open PO</span>
              </Link>
              <LogoutButton className="button button-light button-small" />
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Link className="nav-login" href="/masuk?next=%2Fakun%2Fpesanan">
                Masuk
              </Link>
              <Link className="button button-po-sell" href="/penjual">
                <span>+ Buka Open PO</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      <nav className="mobile-nav" aria-label="Navigasi cepat">
        <Link href="/" className="mobile-nav-link">
          <MobileNavIcon kind="browse" />
          <span>Jelajah</span>
        </Link>
        <Link href="/lacak" className="mobile-nav-link">
          <MobileNavIcon kind="track" />
          <span>Lacak</span>
        </Link>
        <Link href={user ? "/akun/pesanan" : "/masuk?next=%2Fakun%2Fpesanan"} className="mobile-nav-link">
          <MobileNavIcon kind="orders" />
          <span>Pesanan</span>
        </Link>
        <Link href="/penjual" className="mobile-nav-link mobile-nav-sell">
          <MobileNavIcon kind="sell" />
          <span>Buka PO</span>
        </Link>
        {user && (
          <LogoutButton
            className="mobile-nav-link"
            iconOnly
          />
        )}
      </nav>
    </header>
  );
}
