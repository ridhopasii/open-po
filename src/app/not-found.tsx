import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Halaman Tidak Ditemukan · OpenPO",
};

export default function NotFound() {
  return (
    <div className="notfound-shell">
      <div className="notfound-container">
        <div className="notfound-graphic">
          <div className="notfound-code">404</div>
          <div className="notfound-rings">
            <div className="notfound-ring notfound-ring--1" />
            <div className="notfound-ring notfound-ring--2" />
            <div className="notfound-ring notfound-ring--3" />
          </div>
        </div>
        <div className="notfound-emoji">📦</div>
        <h1 className="notfound-title">Barang Tidak Ditemukan</h1>
        <p className="notfound-desc">
          Halaman yang kamu cari sudah ditutup, dipindahkan, atau memang tidak pernah ada.<br />
          Mungkin batch PO-nya sudah habis kuota?
        </p>
        <div className="notfound-actions">
          <Link href="/" className="notfound-btn-primary">
            Kembali ke Marketplace
          </Link>
          <Link href="/lacak" className="notfound-btn-secondary">
            Lacak Pesananku
          </Link>
        </div>
        <p className="notfound-hint">
          Atau coba cari PO lain yang masih buka →{" "}
          <Link href="/?kategori=Makanan">Makanan</Link> ·{" "}
          <Link href="/?kategori=Minuman">Minuman</Link> ·{" "}
          <Link href="/?kategori=Fashion">Fashion</Link>
        </p>
      </div>
    </div>
  );
}
