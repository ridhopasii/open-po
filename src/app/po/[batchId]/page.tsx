import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { OrderForm } from "@/components/order-form";
import { SiteHeader } from "@/components/site-header";
import { SellerIdentity } from "@/components/seller-identity";
import { SharePoButton } from "@/components/share-po-button";
import { formatCampusDate, formatRupiah, getOpenBatch } from "@/lib/marketplace";
import { getSellerAvatarUrl } from "@/lib/marketplace-shared";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { connection } from "next/server";

export const instant = false;

type PageProps = {
  params: Promise<{ batchId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connection();
  const { batchId } = await params;
  const batch = await getOpenBatch(batchId);
  if (!batch) {
    return {
      title: "Detail PO Kampus",
      alternates: { canonical: `https://open-po.vercel.app/po/${batchId}` },
    };
  }

  const title = `${batch.product.name} (PO)`;
  const description =
    batch.product.description ||
    `Pre-order ${batch.product.name} di OpenPO Kampus. Pesan sekarang dan ambil di selasar kampus.`;
  const photo = getProductPhoto(batch.product.name, batch.photo);
  const imageUrl = photo.startsWith("http") ? photo : `https://open-po.vercel.app${photo}`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://open-po.vercel.app/po/${batchId}`,
    },
    openGraph: {
      title: `${title} · OpenPO`,
      description,
      url: `https://open-po.vercel.app/po/${batchId}`,
      siteName: "OpenPO by kampusfess.id",
      locale: "id_ID",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 600,
          alt: batch.product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · OpenPO`,
      description,
      images: [imageUrl],
    },
  };
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

export default async function OrderPage({ params }: PageProps) {
  await connection();
  const { batchId } = await params;
  const batch = await getOpenBatch(batchId);
  if (!batch) notFound();

  let user = null;
  let previousOrder = null;
  let sellerWhatsapp = "";
  let sellerBankName: string | null = null;
  let sellerBankNumber: string | null = null;
  let sellerBankHolder: string | null = null;
  let sellerQrisNmid: string | null = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
    if (user) {
      const { data: prev } = await supabase
        .from("po_orders")
        .select("buyer_name,buyer_faculty,buyer_whatsapp")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      previousOrder = prev;
    }

    // Ambil WhatsApp & Rekening penjual via Admin Client
    const admin = createAdminClient();
    if (admin) {
      const { data: bData } = await admin
        .from("po_batches")
        .select("product:po_products!inner(seller:po_sellers!inner(whatsapp,bank_name,bank_number,bank_holder,qris_nmid))")
        .eq("id", batch.id)
        .maybeSingle();
      const sInfo = (bData as any)?.product?.seller;
      if (sInfo?.whatsapp) sellerWhatsapp = sInfo.whatsapp;
      if (sInfo?.bank_name) sellerBankName = sInfo.bank_name;
      if (sInfo?.bank_number) sellerBankNumber = sInfo.bank_number;
      if (sInfo?.bank_holder) sellerBankHolder = sInfo.bank_holder;
      if (sInfo?.qris_nmid) sellerQrisNmid = sInfo.qris_nmid;
    }
  } catch {
    // Supabase belum terkonfigurasi atau guest mode
  }

  const remaining = Math.max(0, batch.quota - batch.reserved_quantity);
  const heroPhoto = getProductPhoto(batch.product.name, batch.photo);
  const percentBooked = Math.min(100, Math.round((batch.reserved_quantity / batch.quota) * 100));

  const now = new Date();
  const closesAtDate = new Date(batch.closes_at);
  const pickupAtDate = new Date(batch.pickup_at);
  const msToClose = closesAtDate.getTime() - now.getTime();
  const hoursToClose = msToClose / (1000 * 60 * 60);

  let statusBadgeLabel = "Batch Aktif";
  let statusBadgeBg = "var(--color-primary, #059669)";

  if (batch.status === "picked_up" || (pickupAtDate < now && batch.status === "closed")) {
    statusBadgeLabel = "Selesai (Sudah Diambil)";
    statusBadgeBg = "#64748b";
  } else if (batch.status === "closed" || msToClose <= 0 || remaining <= 0) {
    statusBadgeLabel = "PO Ditutup";
    statusBadgeBg = "#dc2626";
  } else if (hoursToClose <= 24 && hoursToClose > 0) {
    const hoursLeft = Math.max(1, Math.ceil(hoursToClose));
    statusBadgeLabel = `⚡ Segera Tutup (<${hoursLeft} Jam)`;
    statusBadgeBg = "#d97706";
  } else if (batch.status === "upcoming") {
    statusBadgeLabel = "Segera Dibuka";
    statusBadgeBg = "#2563eb";
  }

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="detail-page">
        <div className="detail-breadcrumb">
          <Link className="text-link" href="/">
            ← Kembali ke etalase PO
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{batch.product.name}</span>
        </div>

        <div className="detail-grid">
          <article className="detail-copy">
            {heroPhoto && (
              <div className="detail-hero-photo">
                <Image
                  src={heroPhoto}
                  alt={batch.product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 650px"
                  priority
                  className="object-cover"
                />
                <div className="detail-photo-badge" style={{ backgroundColor: statusBadgeBg }}>
                  <span>{statusBadgeLabel}</span>
                  <strong>{batch.reserved_quantity} / {batch.quota} Terpesan</strong>
                </div>
              </div>
            )}

            <div className="detail-category-header">
              <span className="section-label">{batch.product.category.toUpperCase()} · OPEN PO MAHASISWA</span>
              <span className="quota-tag-chip" style={{ backgroundColor: remaining <= 5 ? "#fef3c7" : undefined, color: remaining <= 5 ? "#b45309" : undefined }}>
                {percentBooked}% Kuota Terisi ({remaining} sisa)
              </span>
            </div>

            <h1 className="detail-product-title">{batch.product.name}</h1>

            <div className="detail-seller-card">
              <SellerIdentity
                name={batch.product.seller.display_name}
                faculty={batch.product.seller.faculty}
                avatarUrl={getSellerAvatarUrl(batch.product.seller.avatar_path)}
              />
              <div className="detail-seller-actions" style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "4px" }}>
                <span className="verified-campus-badge">✓ Mitra Mahasiswa Terverifikasi</span>
                {sellerWhatsapp && (
                  <a
                    href={`https://wa.me/${sellerWhatsapp.replace(/\D/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(`Halo kak ${batch.product.seller.display_name}, saya mau tanya info PO ${batch.product.name} di OpenPO`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button-small button-outline"
                    style={{ minHeight: "32px", padding: "0 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <span>💬 Tanya Penjual di WA</span>
                  </a>
                )}
              </div>
            </div>

            <p className="detail-description">
              {batch.product.description || "Pesan sekarang, ambil bersama di titik yang sudah ditentukan di kampus."}
            </p>

            <div className="detail-price-box">
              <span className="detail-price-label">Harga Satuan Pre-Order</span>
              <div className="detail-price">
                {formatRupiah(batch.product.price_idr)}
                <span> / porsi / item</span>
              </div>
            </div>

            <SharePoButton
              title={batch.product.name}
              price={batch.product.price_idr}
              batchId={batch.id}
              remaining={remaining}
            />

            {/* Facts Grid */}
            <div className="detail-facts">
              <div>
                <span>BATAS PEMESANAN</span>
                <strong>{formatCampusDate(batch.closes_at, { year: "numeric" })} WIB</strong>
              </div>
              <div>
                <span>JADWAL PENGAMBILAN</span>
                <strong>{formatCampusDate(batch.pickup_at, { year: "numeric" })} WIB</strong>
              </div>
              <div>
                <span>TITIK AMBIL DI KAMPUS</span>
                <strong>📍 {batch.pickup_point}</strong>
              </div>
              <div>
                <span>KUOTA TERSISA</span>
                <strong className={remaining <= 5 ? "color-warning" : ""}>{remaining} dari {batch.quota} item</strong>
              </div>
            </div>

            {batch.pickup_note && (
              <div className="detail-note-card">
                <strong>Catatan Khusus Penjual:</strong>
                <p>{batch.pickup_note}</p>
              </div>
            )}

            {/* Kebijakan Pembatalan & Refund */}
            <div className="detail-policy-card" style={{ marginTop: "16px", padding: "16px", background: "var(--usu-50, #ECFDF5)", border: "1px solid var(--usu-200, #A7F3D0)", borderRadius: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--usu-900, #064E3B)", fontWeight: 700, fontSize: "14px" }}>
                <span>🛡️ Kebijakan Pembatalan &amp; Pengembalian Dana (Refund)</span>
              </div>
              <ul style={{ margin: "8px 0 0 16px", padding: 0, fontSize: "12.5px", color: "var(--usu-800, #065F46)", lineHeight: "1.6" }}>
                <li><strong>Jaminan 100% Refund:</strong> Jika batch PO tidak memenuhi kuota minimum, dibatalkan penjual, atau barang gagal diproduksi, dana yang telah ditransfer dikembalikan utuh 100%.</li>
                <li><strong>Pembatalan oleh Pembeli:</strong> Pembeli dapat membatalkan pesanan sebelum batas waktu batch PO ditutup dengan menghubungi penjual via WhatsApp.</li>
                <li><strong>Penyelesaian Kendala:</strong> Tim moderasi komunitas siap membantu mediasi jika ada ketidaksesuaian barang saat serah terima di kampus.</li>
              </ul>
            </div>

            <div className="order-expectation">
              <strong>Jaminan Transaksi Mahasiswa:</strong>
              <span>
                Pesananmu langsung tercatat secara transparan di kuota batch penjual. Kamu akan mendapatkan kode pesanan
                unik yang bisa dilacak kapan saja di menu Lacak PO.
              </span>
            </div>
          </article>

          <aside className="order-card-aside">
            <div className="order-card-header">
              <span className="section-label">FORMULIR PEMESANAN</span>
              <h2>Formulir Pre-Order</h2>
              <small>Lengkapi data untuk mengunci kuota pesananmu</small>
            </div>

            <OrderForm
              batchId={batch.id}
              batchTitle={batch.product.name}
              price={batch.product.price_idr}
              remaining={remaining}
              pickupPoint={batch.pickup_point}
              sellerName={batch.product.seller.display_name}
              sellerFaculty={batch.product.seller.faculty}
              sellerWhatsapp={sellerWhatsapp}
              sellerBankName={sellerBankName}
              sellerBankNumber={sellerBankNumber}
              sellerBankHolder={sellerBankHolder}
              sellerQrisNmid={sellerQrisNmid}
              isLoggedIn={Boolean(user)}
              buyer={
                previousOrder
                  ? {
                      name: previousOrder.buyer_name,
                      faculty: previousOrder.buyer_faculty,
                      whatsapp: previousOrder.buyer_whatsapp,
                    }
                  : undefined
              }
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
