import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { PaymentProofUpload } from "@/components/payment-proof-upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCampusDate, formatRupiah } from "@/lib/marketplace-shared";

export const metadata: Metadata = {
  title: "Konfirmasi Pesanan · OpenPO",
  description: "Detail dan status pesanan pre-order kampusmu.",
};

const STATUS_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  pending:   { label: "Menunggu Konfirmasi", color: "status-pending",   desc: "Penjual sedang memverifikasi pesananmu." },
  confirmed: { label: "Diproses",            color: "status-confirmed", desc: "Penjual sedang menyiapkan barangmu." },
  ready:     { label: "Siap Diambil",        color: "status-ready",     desc: "Barangmu sudah di titik kumpul kampus!" },
  picked_up: { label: "Selesai",             color: "status-done",      desc: "Pesanan telah diterima. Terima kasih!" },
  cancelled: { label: "Dibatalkan",          color: "status-cancelled", desc: "Pesanan ini telah dibatalkan." },
};

async function getOrderByCode(code: string) {
  const supabase = createAdminClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("po_orders")
      .select(
        "id,order_code,buyer_name,buyer_faculty,buyer_whatsapp,quantity,unit_price_idr,total_price_idr,status,payment_method,payment_proof_path,notes,created_at," +
        "batch:po_batches!inner(id,title,closes_at,pickup_at,pickup_point,pickup_note,status," +
        "  product:po_products!inner(name,category,price_idr," +
        "    seller:po_sellers!inner(display_name,faculty,whatsapp)" +
        "  )" +
        ")"
      )
      .eq("order_code", code.toUpperCase())
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { code } = await params;
  const rawOrder = await getOrderByCode(code);
  const order = rawOrder as any;

  if (!order) {
    // Fallback demo untuk kode yang tidak ada
    return (
      <div className="page-shell">
        <SiteHeader />
        <main className="order-confirm-page">
          <div className="order-confirm-not-found">
            <div className="order-confirm-icon">🔍</div>
            <h1>Pesanan Tidak Ditemukan</h1>
            <p>Kode <strong>{code.toUpperCase()}</strong> tidak ditemukan di sistem kami.</p>
            <p className="order-confirm-hint">
              Pastikan kode pesananmu benar, atau lacak menggunakan nomor WhatsApp.
            </p>
            <Link href="/lacak" className="btn-primary">
              Lacak Pesanan
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const batch = order.batch as unknown as {
    id: string;
    title: string;
    closes_at: string;
    pickup_at: string;
    pickup_point: string;
    pickup_note: string | null;
    status: string;
    product: {
      name: string;
      category: string;
      price_idr: number;
      seller: { display_name: string; faculty: string; whatsapp: string };
    };
  };

  const statusInfo = STATUS_LABELS[order.status] ?? STATUS_LABELS["pending"];
  const sellerWa = batch.product.seller.whatsapp.replace(/\D/g, "");
  const sellerWaLink = `https://wa.me/${sellerWa.startsWith("0") ? "62" + sellerWa.slice(1) : sellerWa}?text=${encodeURIComponent(`Halo, saya ${order.buyer_name} ingin konfirmasi pesanan ${order.order_code} untuk ${batch.product.name}`)}`;
  const trackLink = `/lacak?q=${encodeURIComponent(order.order_code)}`;

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="order-confirm-page">
        <div className="order-confirm-container">
          {/* Header card */}
          <div className="order-confirm-header">
            <div className={`order-confirm-badge ${statusInfo.color}`}>{statusInfo.label}</div>
            <h1 className="order-confirm-code">{order.order_code}</h1>
            <p className="order-confirm-status-desc">{statusInfo.desc}</p>
          </div>

          {/* Product info */}
          <div className="order-confirm-card">
            <div className="order-confirm-section-title">Detail Produk</div>
            <div className="order-confirm-product">
              <div className="order-confirm-product-name">{batch.product.name}</div>
              <div className="order-confirm-product-batch">{batch.title}</div>
              <div className="order-confirm-product-cat">{batch.product.category}</div>
            </div>
            <div className="order-confirm-rows">
              <div className="order-confirm-row">
                <span>Jumlah</span>
                <span>{order.quantity} item</span>
              </div>
              <div className="order-confirm-row">
                <span>Harga satuan</span>
                <span>{formatRupiah(order.unit_price_idr ?? batch.product.price_idr)}</span>
              </div>
              <div className="order-confirm-row order-confirm-row--total">
                <span>Total Pembayaran</span>
                <span>{formatRupiah(order.total_price_idr)}</span>
              </div>
            </div>
          </div>

          {/* Pickup info */}
          <div className="order-confirm-card">
            <div className="order-confirm-section-title">Jadwal Pengambilan</div>
            <div className="order-confirm-rows">
              <div className="order-confirm-row">
                <span>Titik Kumpul</span>
                <span>{batch.pickup_point}</span>
              </div>
              <div className="order-confirm-row">
                <span>Waktu Pengambilan</span>
                <span>{formatCampusDate(batch.pickup_at)}</span>
              </div>
              {batch.pickup_note && (
                <div className="order-confirm-row">
                  <span>Catatan</span>
                  <span>{batch.pickup_note}</span>
                </div>
              )}
            </div>
          </div>

          {/* Buyer info */}
          <div className="order-confirm-card">
            <div className="order-confirm-section-title">Info Pembeli</div>
            <div className="order-confirm-rows">
              <div className="order-confirm-row">
                <span>Nama</span>
                <span>{order.buyer_name}</span>
              </div>
              <div className="order-confirm-row">
                <span>Fakultas</span>
                <span>{order.buyer_faculty}</span>
              </div>
              <div className="order-confirm-row">
                <span>WhatsApp</span>
                <span>{order.buyer_whatsapp}</span>
              </div>
            </div>
          </div>

          {/* Seller contact */}
          <div className="order-confirm-card order-confirm-card--seller">
            <div className="order-confirm-section-title">Penjual</div>
            <div className="order-confirm-seller-info">
              <div>
                <div className="order-confirm-seller-name">{batch.product.seller.display_name}</div>
                <div className="order-confirm-seller-fac">{batch.product.seller.faculty}</div>
              </div>
              <a
                href={sellerWaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="order-confirm-wa-btn"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.134.558 4.134 1.534 5.876L0 24l6.285-1.648A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.815 9.815 0 01-5.006-1.365l-.359-.214-3.73.978.996-3.645-.234-.374A9.818 9.818 0 012.182 12c0-5.418 4.4-9.818 9.818-9.818S21.818 6.582 21.818 12 17.418 21.818 12 21.818z"/>
                </svg>
                Hubungi Penjual
              </a>
            </div>
          </div>

          {/* Actions */}
          <div className="order-confirm-actions">
            <Link href={trackLink} className="order-confirm-track-btn">
              Lacak Status Real-time
            </Link>
            <Link href="/" className="order-confirm-home-btn">
              Kembali ke Marketplace
            </Link>
          </div>

          <p className="order-confirm-footer-note">
            Simpan kode <strong>{order.order_code}</strong> untuk melacak pesananmu kapan saja di halaman{" "}
            <Link href="/lacak">Lacak Pesanan</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
