import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CancelOrder } from "@/components/cancel-order";
import { OrderProgress } from "@/components/order-progress";
import { SellerIdentity } from "@/components/seller-identity";
import { getSellerAvatarUrl } from "@/lib/marketplace-shared";
import { createClient } from "@/lib/supabase/server";
import { formatCampusDate, formatRupiah } from "@/lib/marketplace";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Pesananku" };

type SellerContact = { seller_name: string; whatsapp: string } | null;

type OrderRow = {
  id: string;
  order_code: string;
  quantity: number;
  total_price_idr: number;
  status: string;
  created_at: string;
  sellerContact: SellerContact;
  batch: {
    title: string;
    pickup_at: string;
    pickup_point: string;
    product: {
      name: string;
      seller: { display_name: string; faculty: string; avatar_path: string | null };
    };
  };
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu konfirmasi",
  confirmed: "Dikonfirmasi",
  ready: "Siap diambil",
  picked_up: "Selesai",
  cancelled: "Dibatalkan",
};

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? "Status diperbarui";
}

function whatsappDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

export const instant = false;

const demoBuyerOrders: OrderRow[] = [
  {
    id: "ord-demo-1",
    order_code: "PO-7291A",
    quantity: 2,
    total_price_idr: 24000,
    status: "ready",
    created_at: "2026-10-23T08:30:00Z",
    sellerContact: {
      seller_name: "Nadia Putri",
      whatsapp: "081234567801",
    },
    batch: {
      title: "Batch PO Risol mayo",
      pickup_at: "2026-10-24T12:00:00Z",
      pickup_point: "Kantin Gedung Bersama / Gazebo Utama Kampus",
      product: {
        name: "Risol mayo",
        seller: {
          display_name: "Nadia Putri",
          faculty: "Fakultas Pertanian",
          avatar_path: null,
        },
      },
    },
  },
  {
    id: "ord-demo-2",
    order_code: "PO-9104C",
    quantity: 2,
    total_price_idr: 20000,
    status: "confirmed",
    created_at: "2026-10-23T09:15:00Z",
    sellerContact: {
      seller_name: "Rafi Maulana",
      whatsapp: "081234567802",
    },
    batch: {
      title: "Batch PO Kopi susu gula aren",
      pickup_at: "2026-10-24T14:00:00Z",
      pickup_point: "Lobi Gedung Kuliah Bersama Fakultas Teknik",
      product: {
        name: "Kopi susu gula aren",
        seller: {
          display_name: "Rafi Maulana",
          faculty: "Fakultas Teknik",
          avatar_path: null,
        },
      },
    },
  },
  {
    id: "ord-demo-3",
    order_code: "PO-3329D",
    quantity: 1,
    total_price_idr: 18000,
    status: "pending",
    created_at: "2026-10-23T10:00:00Z",
    sellerContact: {
      seller_name: "Salsabila N.",
      whatsapp: "081234567803",
    },
    batch: {
      title: "Batch PO Brownies sekat",
      pickup_at: "2026-10-25T13:00:00Z",
      pickup_point: "Depan Perpustakaan Pusat",
      product: {
        name: "Brownies sekat",
        seller: {
          display_name: "Salsabila N.",
          faculty: "Fakultas Kesehatan Masyarakat",
          avatar_path: null,
        },
      },
    },
  },
];

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function OrdersPage({
  searchParams,
}: PageProps) {
  await connection();
  const params = await searchParams;
  const isDemo = params.demo === "1";

  let user = null;
  let orders: OrderRow[] = [];

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (user) {
      const { data: rawData } = await supabase
        .from("po_orders")
        .select(
          "id,order_code,quantity,total_price_idr,status,created_at," +
            "batch:po_batches!inner(" +
            "  title,pickup_at,pickup_point," +
            "  product:po_products!inner(" +
            "    name," +
            "    seller:po_sellers!inner(display_name,faculty,avatar_path)" +
            "  )" +
            ")",
        )
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      const rawOrders = (rawData ?? []) as unknown as Omit<OrderRow, "sellerContact">[];
      const activeOrderIds = rawOrders
        .filter((o) => o.status !== "cancelled")
        .map((o) => o.id);

      const contactMap = new Map<string, SellerContact>();
      if (activeOrderIds.length > 0) {
        const contactResults = await Promise.all(
          activeOrderIds.map(async (orderId) => {
            const { data: rows } = await supabase.rpc(
              "po_get_order_seller_contact",
              { p_order_id: orderId },
            );
            const contacts = rows as { seller_name: string; whatsapp: string }[] | null;
            return { orderId, contact: contacts?.[0] ?? null };
          }),
        );
        for (const { orderId, contact } of contactResults) {
          contactMap.set(orderId, contact);
        }
      }

      orders = rawOrders.map((order) => ({
        ...order,
        sellerContact: contactMap.get(order.id) ?? null,
      }));
    }
  } catch {
    // Auth or connection issue
  }

  if (!user && !isDemo) {
    redirect(`/masuk?next=${encodeURIComponent("/akun/pesanan")}`);
  }

  if (!user && isDemo) {
    orders = demoBuyerOrders;
  }

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="account-page">
        <span className="section-label">AKUN PEMBELI</span>
        <h1>Pesananmu</h1>
        <p className="account-intro">
          Pantau konfirmasi penjual dan jadwal pengambilan di sini.
        </p>

        {isDemo && (
          <div className="seller-demo-banner" style={{ marginBottom: "24px" }}>
            <div className="demo-banner-content">
              <span className="demo-tag" style={{ background: "#dbeafe", color: "#1e40af" }}>
                Mode Demo Akun Pembeli (Bima Prakoso)
              </span>
              <p>
                Ini adalah pratinjau interaktif akun pembeli mahasiswa. Kamu bisa melihat status pesanan realtime, timeline progres, kontak WhatsApp penjual, dan simulasi pengambilan.
              </p>
            </div>
            <Link href="/masuk?next=%2Fakun%2Fpesanan" className="button button-small">
              Masuk Akun Asli →
            </Link>
          </div>
        )}

        {params.baru && (
          <div className="success-banner">
            Pesanan <strong>{params.baru}</strong> berhasil dicatat. Penjual
            akan mengonfirmasi pesananmu.
          </div>
        )}

        {orders.length ? (
          <div className="buyer-orders">
            {orders.map((order) => (
              <article className="buyer-order" key={order.id}>
                <div className="buyer-order-top">
                  <span>{order.order_code}</span>
                  <span className={`order-status status-${order.status}`}>
                    {statusLabel(order.status)}
                  </span>
                </div>

                <h2 className="buyer-batch-title">{order.batch.product.name}</h2>

                <SellerIdentity
                  name={order.batch.product.seller.display_name}
                  faculty={order.batch.product.seller.faculty}
                  avatarUrl={getSellerAvatarUrl(
                    order.batch.product.seller.avatar_path,
                  )}
                  compact
                />

                <OrderProgress status={order.status} />

                <div className="buyer-order-bottom">
                  <span>
                    {order.quantity} item · {formatRupiah(order.total_price_idr)}
                  </span>
                  <span>
                    Ambil {formatCampusDate(order.batch.pickup_at)} ·{" "}
                    {order.batch.pickup_point}
                  </span>
                </div>

                {order.sellerContact && (
                  <a
                    className="button button-light button-small buyer-contact"
                    href={`https://wa.me/${whatsappDigits(order.sellerContact.whatsapp)}?text=${encodeURIComponent(
                      `Halo ${order.sellerContact.seller_name}, saya ingin menanyakan pesanan ${order.order_code} untuk ${order.batch.product.name}.`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Hubungi penjual via WhatsApp
                  </a>
                )}

                {order.status === "pending" && <CancelOrder id={order.id} />}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-market">
            <div className="empty-market-copy">
              <h3>Belum ada pesanan</h3>
              <p>PO yang kamu ikuti akan tampil di sini.</p>
              <Link href="/" className="text-link">
                Cari PO yang buka ↗
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
