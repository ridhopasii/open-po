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
      <div className="nav-wrap">
        <Link href="/" className="brand" aria-label="OpenPO by kampusfess.id, beranda">
          <BrandMark />
          <span className="brand-copy">
            <span className="brand-name">OpenPO</span>
            <small>by kampusfess.id</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Navigasi utama">
          <Link href="/">Jelajah PO</Link>
          <Link href="/lacak" className="nav-highlight">Lacak Pesanan</Link>
          <Link href="/cara-kerja">Cara Kerja</Link>
          <Link href="/admin">Panel Admin</Link>
        </nav>
        <div className="nav-actions">
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Link className="nav-login" href="/akun/pesanan">
                Pesananku
              </Link>
              <Link className="button button-small" href="/penjual">
                Ruang Penjual
              </Link>
              <LogoutButton className="button button-light button-small" />
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Link className="nav-login" href="/masuk?next=%2Fakun%2Fpesanan">
                Masuk
              </Link>
              <Link className="button button-small" href="/penjual">
                Jual di OpenPO
              </Link>
            </div>
          )}
        </div>
      </div>
      <nav className="mobile-nav" aria-label="Navigasi cepat">
        <Link href="/" className="mobile-nav-link">
          <MobileNavIcon kind="browse" />Jelajah
        </Link>
        <Link href="/lacak" className="mobile-nav-link">
          <MobileNavIcon kind="track" />Lacak PO
        </Link>
        <Link href={user ? "/akun/pesanan" : "/masuk?next=%2Fakun%2Fpesanan"} className="mobile-nav-link">
          <MobileNavIcon kind="orders" />Pesanan
        </Link>
        <Link href="/penjual" className="mobile-nav-link mobile-nav-sell">
          <MobileNavIcon kind="sell" />Jual
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
