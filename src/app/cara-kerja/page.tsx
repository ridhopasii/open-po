import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Cara Kerja OpenPO · Platform Pre-Order Kampus",
  description:
    "Pelajari cara pesan, cara buka PO, dan kenapa OpenPO adalah cara paling efisien bagi mahasiswa untuk jual-beli pre-order di kampus.",
};

export const instant = false;

const BUYER_STEPS = [
  {
    no: "01",
    title: "Jelajah & Pilih",
    desc: "Telusuri etalase, lihat produk aktif dari penjual mahasiswa sekampus. Cek harga, kuota tersisa, dan jadwal pengambilan.",
    icon: "🔍",
  },
  {
    no: "02",
    title: "Pesan Tanpa Login",
    desc: "Isi nama, fakultas, dan nomor WhatsApp. Tidak perlu buat akun — pesananmu langsung tercatat dengan kode unik.",
    icon: "📋",
  },
  {
    no: "03",
    title: "Bayar via WA / QRIS",
    desc: "Ikuti instruksi pembayaran yang dikirim penjual. Transfer, scan QRIS kampus, atau bayar saat ambil (COD).",
    icon: "💸",
  },
  {
    no: "04",
    title: "Lacak & Ambil",
    desc: "Pantau status pesanan realtime di /lacak. Dapat notif WhatsApp saat barang siap. Ambil di titik temu yang dijadwalkan.",
    icon: "📦",
  },
];

const SELLER_STEPS = [
  {
    no: "01",
    title: "Daftar Jadi Penjual",
    desc: "Buat akun gratis, lengkapi nama toko dan fakultas. Verifikasi lewat email kampus. Tidak perlu modal awal.",
    icon: "🎓",
  },
  {
    no: "02",
    title: "Buka Batch PO",
    desc: "Isi nama produk, kategori, harga satuan, kuota maksimum, batas waktu pesan, dan titik ambil bersama di kampus.",
    icon: "🗓️",
  },
  {
    no: "03",
    title: "Broadcast & Tunggu",
    desc: "Salin teks broadcast siap kirim ke grup WA kampus dengan 1 klik. Kuota otomatis terkunci saat pesanan masuk.",
    icon: "📢",
  },
  {
    no: "04",
    title: "Kelola & Selesaikan",
    desc: "Konfirmasi pesanan satu per satu, unduh rekap CSV, tandai siap ambil, dan chat pembeli langsung via WhatsApp.",
    icon: "✅",
  },
];

const FAQS = [
  {
    q: "Apakah OpenPO gratis?",
    a: "OpenPO sepenuhnya gratis selama masa peluncuran. Penjual dapat membuka batch PO tanpa potongan komisi awal, dan dana penjualan langsung masuk ke rekening/QRIS penjual.",
  },
  {
    q: "Bagaimana jika penjual tidak memenuhi pesanan?",
    a: "Setiap penjual diverifikasi melalui nomor WhatsApp aktif dan fakultas asal. Pembeli dapat menghubungi penjual langsung, dan tim komunitas dapat menindaklanjuti batch yang bermasalah.",
  },
  {
    q: "Apakah saya harus membuat akun untuk memesan?",
    a: "Tidak! Kamu bisa pesan tanpa akun dengan mengisi nama dan nomor WhatsApp. Buat akun hanya jika ingin lacak semua pesanan dalam satu dashboard.",
  },
  {
    q: "Produk apa saja yang bisa dijual?",
    a: "Semua produk yang legal dan lazim dijual di lingkungan kampus: makanan/minuman buatan sendiri, merchandise angkatan, baju wisuda, kerajinan, dan lainnya.",
  },
  {
    q: "Apakah ada batas kuota maksimum?",
    a: "Tidak ada batas yang ditetapkan platform. Penjual bebas menentukan kuota sesuai kapasitas produksinya.",
  },
  {
    q: "Bagaimana sistem lacak pesanan bekerja?",
    a: "Setiap pesanan mendapat kode unik (contoh: PO-A3XKBQ). Masukkan kode tersebut di halaman /lacak untuk melihat status realtime dan timeline pengiriman.",
  },
];

const STATS = [
  { val: "100%", label: "Komunitas Kampus" },
  { val: "0 Rp", label: "Biaya Peluncuran" },
  { val: "1-Klik", label: "Broadcast WhatsApp" },
  { val: "Realtime", label: "Kunci Kuota PO" },
];

export default async function CaraKerjaPage() {
  await connection();

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="howto-main">

        {/* ── Hero ── */}
        <section className="howto-hero">
          <div className="howto-hero-inner">
            <span className="howto-eyebrow">Cara Kerja OpenPO</span>
            <h1>
              Pre-order kampus,<br />
              <em>sesederhana chat WA.</em>
            </h1>
            <p className="howto-hero-desc">
              OpenPO menghubungkan pembeli dan penjual mahasiswa lewat sistem pre-order yang terstruktur —
              tanpa ribet, tanpa biaya, tanpa aplikasi tambahan.
            </p>
            <div className="howto-hero-cta">
              <Link href="/" className="button">Jelajah PO Sekarang</Link>
              <Link href="/penjual" className="button button-outline">Mulai Jualan →</Link>
            </div>
          </div>
          <div className="howto-hero-visual" aria-hidden="true">
            <div className="howto-mockup">
              <div className="mockup-row">
                <span className="mockup-dot mockup-dot-red" />
                <span className="mockup-dot mockup-dot-yellow" />
                <span className="mockup-dot mockup-dot-green" />
              </div>
              <div className="mockup-content">
                <div className="mockup-card">
                  <span className="mockup-tag">🍵 Minuman</span>
                  <strong>Matcha Latte Kampus</strong>
                  <small>Rp 18.000 · 34/50 terpesan</small>
                  <div className="mockup-bar"><div style={{ width: "68%" }} /></div>
                </div>
                <div className="mockup-card">
                  <span className="mockup-tag">👕 Merchandise</span>
                  <strong>Kaos Angkatan 2024</strong>
                  <small>Rp 95.000 · 61/80 terpesan</small>
                  <div className="mockup-bar"><div style={{ width: "76%" }} /></div>
                </div>
                <div className="mockup-card">
                  <span className="mockup-tag">🥐 Makanan</span>
                  <strong>Risol Mayo Crispy</strong>
                  <small>Rp 8.000 · 22/40 terpesan</small>
                  <div className="mockup-bar"><div style={{ width: "55%" }} /></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="howto-stats-band">
          <div className="howto-stats-inner">
            {STATS.map((s) => (
              <div className="howto-stat" key={s.label}>
                <strong>{s.val}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Buyer Steps ── */}
        <section className="howto-steps-section">
          <div className="howto-steps-inner">
            <div className="howto-steps-head">
              <span className="howto-section-label">UNTUK PEMBELI</span>
              <h2>Pesan produk kampus<br /><em>dalam 4 langkah</em></h2>
              <p>Dari pilih hingga ambil barang — semua bisa dilacak realtime tanpa perlu install aplikasi.</p>
            </div>
            <div className="howto-steps-grid">
              {BUYER_STEPS.map((step) => (
                <div className="howto-step-card" key={step.no}>
                  <div className="step-icon-wrap">{step.icon}</div>
                  <div className="step-no">{step.no}</div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              ))}
            </div>
            <div className="howto-steps-cta">
              <Link href="/" className="button">Mulai Pesan →</Link>
              <Link href="/lacak" className="button button-light">Lacak Pesanan Saya</Link>
            </div>
          </div>
        </section>

        {/* ── Divider Visual ── */}
        <div className="howto-divider-band" aria-hidden="true">
          <div className="howto-divider-inner">
            {["Open PO 🎓", "Pre-Order Kampus 🍵", "Tanpa Aplikasi 📱", "Bebas Komisi Peluncuran 💚", "Komunitas Kampus ✓"].map((t, i) => (
              <span key={i}>{t}</span>
            ))}
            {/* repeat for infinite scroll effect */}
            {["Open PO 🎓", "Pre-Order Kampus 🍵", "Tanpa Aplikasi 📱", "Bebas Komisi Peluncuran 💚", "Komunitas Kampus ✓"].map((t, i) => (
              <span key={`r-${i}`} aria-hidden="true">{t}</span>
            ))}
          </div>
        </div>

        {/* ── Seller Steps ── */}
        <section className="howto-steps-section howto-seller-section">
          <div className="howto-steps-inner">
            <div className="howto-steps-head">
              <span className="howto-section-label">UNTUK PENJUAL</span>
              <h2>Buka PO, terima pesanan,<br /><em>tanpa ribet admin.</em></h2>
              <p>Dashboard penjual lengkap dengan rekap CSV, broadcast WA otomatis, dan konfirmasi pesanan satu klik.</p>
            </div>
            <div className="howto-steps-grid">
              {SELLER_STEPS.map((step) => (
                <div className="howto-step-card howto-step-seller" key={step.no}>
                  <div className="step-icon-wrap">{step.icon}</div>
                  <div className="step-no">{step.no}</div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              ))}
            </div>
            <div className="howto-steps-cta">
              <Link href="/penjual" className="button">Buka Toko Gratis →</Link>
              <Link href="/penjual" className="button button-light">Panduan Penjual</Link>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="howto-faq-section">
          <div className="howto-faq-inner">
            <div className="howto-steps-head">
              <span className="howto-section-label">FAQ</span>
              <h2>Pertanyaan yang sering<br /><em>ditanyakan</em></h2>
            </div>
            <div className="howto-faq-grid">
              {FAQS.map((faq, idx) => (
                <div className="howto-faq-item" key={idx}>
                  <h3>{faq.q}</h3>
                  <p>{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Band ── */}
        <section className="howto-cta-band">
          <div className="howto-cta-inner">
            <h2>Siap jual atau mau pesan?</h2>
            <p>Platform pre-order komunitas kampus. Gratis selama masa peluncuran. Mulai dalam 2 menit.</p>
            <div className="howto-cta-buttons">
              <Link href="/penjual" className="button">Mulai Buka PO Gratis</Link>
              <Link href="/" className="button button-outline-white">Jelajah Produk →</Link>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
