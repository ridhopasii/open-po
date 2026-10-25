"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { OpenBatch } from "@/lib/marketplace-shared";
import { formatCampusDate, formatRupiah, getSellerAvatarUrl } from "@/lib/marketplace-shared";
import { SellerIdentity } from "@/components/seller-identity";
import { sampleListings } from "@/data/sample-listings";

const categories = ["Semua", "Makanan", "Minuman", "Fashion", "Kerajinan", "Lainnya"];

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="icon">
      <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function getProductPhoto(name: string, photo?: string | null) {
  if (photo) return photo;
  const lower = name.toLowerCase();
  if (lower.includes("risol")) return "/images/risol-mayo.jpg";
  if (lower.includes("matcha")) return "/images/matcha-latte.jpg";
  if (lower.includes("kopi")) return "/images/kopi-susu.jpg";
  if (lower.includes("brownies")) return "/images/brownies.jpg";
  if (lower.includes("kaos") || lower.includes("baju")) return "/images/kaos-angkatan.jpg";
  if (lower.includes("dimsum")) return "/images/dimsum.png";
  if (lower.includes("buket") || lower.includes("bunga")) return "/images/bouquet.png";
  if (lower.includes("charm") || lower.includes("manik")) return "/images/phone-charm.png";
  if (lower.includes("tote") || lower.includes("bag")) return "/images/tote-bag.png";
  return "/images/kopi-susu.jpg";
}

function LiveCard({ batch }: { batch: OpenBatch }) {
  const remaining = Math.max(0, batch.quota - batch.reserved_quantity);
  const percentBooked = Math.min(100, Math.round((batch.reserved_quantity / batch.quota) * 100));
  const photo = getProductPhoto(batch.product.name, batch.photo);
  const isAlmostFull = remaining <= 10 && remaining > 0;
  const isFull = remaining === 0;

  return (
    <Link href={`/po/${batch.id}`} className="shop-card shop-card-live-wrap">
      <div className="shop-card-photo">
        <Image
          src={photo}
          alt={batch.product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
        <div className="card-top-badges">
          <span className="live-badge-chip">PO Aktif</span>
          {isAlmostFull && <span className="urgent-badge-chip">🔥 Sisa {remaining}!</span>}
          {isFull && <span className="full-badge-chip">Kuota Penuh</span>}
        </div>
      </div>

      <div className="shop-card-info">
        <div className="card-category-row">
          <span className="shop-card-category">{batch.product.category}</span>
          <span className="card-closes-badge">
            Tutup {formatCampusDate(batch.closes_at, { hour: undefined, minute: undefined })}
          </span>
        </div>

        <h2 className="card-title">{batch.product.name}</h2>

        {/* Quota Progress Bar */}
        <div className="card-quota-box">
          <div className="quota-bar-track">
            <div
              className={`quota-bar-fill ${isFull ? "bar-full" : isAlmostFull ? "bar-warning" : "bar-ok"}`}
              style={{ width: `${percentBooked}%` }}
            />
          </div>
          <div className="quota-text-row">
            <span>
              Terpesan: <strong>{batch.reserved_quantity}</strong> / {batch.quota}
            </span>
            <span className="quota-percent">{percentBooked}%</span>
          </div>
        </div>

        {/* Pickup spot badge */}
        <div className="card-pickup-spot">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="spot-text">{batch.pickup_point}</span>
        </div>

        <div className="card-bottom-row">
          <div className="card-price-wrap">
            <small>Harga PO</small>
            <strong className="card-price">{formatRupiah(batch.product.price_idr)}</strong>
          </div>
          <span className="card-action-btn">Pesan →</span>
        </div>

        <div className="card-seller-footer">
          <SellerIdentity
            name={batch.product.seller.display_name}
            faculty={batch.product.seller.faculty}
            avatarUrl={getSellerAvatarUrl(batch.product.seller.avatar_path)}
            compact
          />
        </div>
      </div>
    </Link>
  );
}

function SampleCard({ item, index }: { item: (typeof sampleListings)[number]; index: number }) {
  return (
    <Link
      href={`/po/${item.id}`}
      className="shop-card shop-card-sample shop-card-sample-link"
      aria-label={`Buka detail PO ${item.name}`}
    >
      <div className="shop-card-photo">
        <Image
          src={item.photo}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={index < 2}
        />
        <span className="demo-tag">Contoh PO</span>
      </div>
      <div className="shop-card-info">
        <span className="shop-card-category">{item.category}</span>
        <h2>{item.name}</h2>
        <p>{item.note}</p>
        <strong>{formatRupiah(item.price)}</strong>
        <SellerIdentity name={item.seller} faculty={item.faculty} compact />
      </div>
    </Link>
  );
}

export function MarketHome({ batches }: { batches: OpenBatch[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [sortBy, setSortBy] = useState<"closing" | "popular" | "price_asc" | "price_desc">("closing");

  const samplesVisible = batches.length === 0;
  const needle = query.trim().toLocaleLowerCase("id-ID");

  const filteredSamples = useMemo(
    () =>
      sampleListings.filter(
        (item) =>
          (category === "Semua" || item.category === category) &&
          (!needle ||
            `${item.name} ${item.category} ${item.note}`
              .toLocaleLowerCase("id-ID")
              .includes(needle)),
      ),
    [category, needle],
  );

  const filteredBatches = useMemo(() => {
    const list = batches.filter(
      (batch) =>
        (category === "Semua" || batch.product.category === category) &&
        (!needle ||
          `${batch.product.name} ${batch.product.description} ${batch.product.seller.display_name} ${batch.pickup_point}`
            .toLocaleLowerCase("id-ID")
            .includes(needle)),
    );

    return list.sort((a, b) => {
      if (sortBy === "popular") {
        const pctA = a.reserved_quantity / a.quota;
        const pctB = b.reserved_quantity / b.quota;
        return pctB - pctA;
      }
      if (sortBy === "price_asc") {
        return a.product.price_idr - b.product.price_idr;
      }
      if (sortBy === "price_desc") {
        return b.product.price_idr - a.product.price_idr;
      }
      // default: closing soon
      return new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime();
    });
  }, [batches, category, needle, sortBy]);

  const itemCount = samplesVisible ? filteredSamples.length : filteredBatches.length;

  return (
    <>
      {/* Hero Banner Section */}
      <section className="market-hero">
        <div className="hero-content">
          <div className="hero-ticker">
            <span className="ticker-pulse" />
            <span className="ticker-label">
              PRE-ORDER KAMPUS · {batches.length > 0 ? `${batches.length} BATCH AKTIF` : "BATCH SEGERA DIBUKA"} · TITIK AMBIL KAMPUS
            </span>
          </div>

          <h1 className="hero-headline">
            Jajanan, Kopi, & Merchandise Kampus.
            <span className="hero-gradient-text"> Pre-Order Mudah, Ambil di Selasar.</span>
          </h1>

          <p className="hero-subhead">
            Platform pre-order komunitas mahasiswa. Kuota transparan real-time, jadwal ambil pasti di selasar fakultas,
            dan rekap WhatsApp otomatis tanpa antre.
          </p>

          <div className="hero-cta-group">
            <a href="#katalog-po" className="button button-primary">
              🔥 Jelajahi PO Aktif ({batches.length})
            </a>
            <Link href="/lacak" className="button button-outline">
              🔍 Lacak Pesanan Saya
            </Link>
            <Link href="/penjual" className="button button-ghost">
              ✨ Buka PO Sendiri →
            </Link>
          </div>

          {/* Trust Highlights */}
          <div className="hero-trust-bar">
            <div className="trust-item">
              <span className="trust-icon">🛡️</span>
              <div>
                <strong>Mahasiswa Terverifikasi</strong>
                <small>Penjual jelas per fakultas</small>
              </div>
            </div>
            <div className="trust-item">
              <span className="trust-icon">📍</span>
              <div>
                <strong>Titik Ambil Terjamin</strong>
                <small>FMIPA, Gazebo FK, Perpustakaan</small>
              </div>
            </div>
            <div className="trust-item">
              <span className="trust-icon">⚡</span>
              <div>
                <strong>Tanpa Wajib Akun</strong>
                <small>Pesan & lacak instan via WA</small>
              </div>
            </div>
            <div className="trust-item">
              <span className="trust-icon">💬</span>
              <div>
                <strong>Rekap WA Otomatis</strong>
                <small>Format nota langsung siap kirim</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <main className="shop-home" id="katalog-po">
        <section className="shop-toolbar" aria-label="Cari produk">
          <div className="shop-title-row">
            <div>
              <h2>Etalase Batch PO Terbuka</h2>
              <p>
                {samplesVisible
                  ? "Contoh barang · belum ada PO aktif"
                  : `${filteredBatches.length} PO siap dipesan langsung sekarang`}
              </p>
            </div>
            <div className="toolbar-right-actions">
              <Link href="/lacak" className="pill-link">
                🔍 Cek Status Pesanan
              </Link>
              <Link href="/cara-kerja" className="how-link">
                Cara Kerja
              </Link>
            </div>
          </div>

          <div className="toolbar-controls-row">
            <label className="shop-search">
              <SearchIcon />
              <span className="sr-only">Cari barang</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari risol, kopi, brownies, kaos angkatan, atau titik kumpul..."
              />
              {query && (
                <button
                  type="button"
                  className="search-clear"
                  aria-label="Hapus pencarian"
                  onClick={() => setQuery("")}
                >
                  ×
                </button>
              )}
            </label>

            <div className="shop-sort-box">
              <label htmlFor="sort-select">Urutkan:</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="sort-dropdown"
              >
                <option value="closing">⏳ Segera Ditutup</option>
                <option value="popular">🔥 Paling Diminati (% Kuota)</option>
                <option value="price_asc">💰 Harga Terendah</option>
                <option value="price_desc">💎 Harga Tertinggi</option>
              </select>
            </div>
          </div>

          <div className="shop-categories" aria-label="Kategori barang">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={category === item ? "shop-chip selected" : "shop-chip"}
                onClick={() => setCategory(item)}
              >
                {item === "Makanan" && "🥐 "}
                {item === "Minuman" && "☕ "}
                {item === "Fashion" && "👕 "}
                {item === "Kerajinan" && "💐 "}
                {item === "Semua" && "🍽️ "}
                {item}
              </button>
            ))}
          </div>

          {samplesVisible && (
            <p className="demo-notice">
              Contoh tampilan saja. Barang-barang ini belum bisa dipesan.
            </p>
          )}
        </section>

        {itemCount > 0 ? (
          <section className="shop-grid" aria-label="Daftar barang">
            {samplesVisible
              ? filteredSamples.map((item, index) => (
                  <SampleCard item={item} index={index} key={item.name} />
                ))
              : filteredBatches.map((batch) => (
                  <LiveCard batch={batch} key={batch.id} />
                ))}
          </section>
        ) : (
          <div className="shop-no-results">
            <div className="no-results-icon" aria-hidden="true">
              🔍
            </div>
            <h2>Barangnya belum ketemu</h2>
            <p>Coba kata kunci lain atau pilih kategori &ldquo;Semua&rdquo;.</p>
            {(query || category !== "Semua") && (
              <button
                type="button"
                className="button button-light button-small"
                onClick={() => {
                  setQuery("");
                  setCategory("Semua");
                }}
              >
                Reset Filter
              </button>
            )}
          </div>
        )}
      </main>

      <footer className="shop-footer">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span className="brand-copy">
            <span className="brand-name">OpenPO</span>
            <small>by kampusfess.id</small>
          </span>
        </Link>
        <Link href="/lacak">Lacak Pesanan</Link>
        <Link href="/cara-kerja">Cara Kerja</Link>
        <Link href="/penjual">Ruang Penjual</Link>
        <span>Medan, Sumatera Utara</span>
      </footer>
    </>
  );
}
