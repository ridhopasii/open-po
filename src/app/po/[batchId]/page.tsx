import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { OrderForm } from "@/components/order-form";
import { SiteHeader } from "@/components/site-header";
import { SellerIdentity } from "@/components/seller-identity";
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
  return {
    title: batch ? `${batch.product.name} (PO) · OpenPO Kampus` : "Detail PO Kampus",
    description: batch?.product.description,
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
                <div className="detail-photo-badge">
                  <span>Batch Aktif</span>
                  <strong>{batch.reserved_quantity} / {batch.quota} Terpesan</strong>
                </div>
              </div>
            )}

            <div className="detail-category-header">
              <span className="section-label">{batch.product.category.toUpperCase()} · OPEN PO RESMI</span>
              <span className="quota-tag-chip">{percentBooked}% Kuota Terisi</span>
            </div>

            <h1 className="detail-product-title">{batch.product.name}</h1>

            <div className="detail-seller-card">
              <SellerIdentity
                name={batch.product.seller.display_name}
                faculty={batch.product.seller.faculty}
                avatarUrl={getSellerAvatarUrl(batch.product.seller.avatar_path)}
              />
              <span className="verified-campus-badge">✓ Mitra Mahasiswa Terverifikasi</span>
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

            {/* Facts Grid */}
            <div className="detail-facts">
              <div>
                <span>BATAS PEMESANAN</span>
                <strong>{formatCampusDate(batch.closes_at, { year: "numeric" })}</strong>
              </div>
              <div>
                <span>JADWAL PENGAMBILAN</span>
                <strong>{formatCampusDate(batch.pickup_at, { year: "numeric" })}</strong>
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
