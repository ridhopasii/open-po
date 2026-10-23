import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CancelOrder } from "@/components/cancel-order";
import { OrderProgress } from "@/components/order-progress";
import { SellerIdentity } from "@/components/seller-identity";
import { LogoutButton } from "@/components/logout-button";
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

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function OrdersPage({ searchParams }: PageProps) {
  await connection();
  const params = await searchParams;

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

  // Wajib masuk akun pembeli resmi
  if (!user) {
    redirect(`/masuk?next=${encodeURIComponent("/akun/pesanan")}`);
  }

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="account-page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <div>
            <span className="section-label">AKUN PEMBELI</span>
            <h1>Pesananmu</h1>
            <p className="account-intro">
              {user?.email ? `Masuk sebagai ${user.email} · ` : ""}Pantau konfirmasi penjual dan jadwal pengambilan di sini.
            </p>
          </div>
          {user && (
            <LogoutButton className="button button-light button-small">
              Keluar Akun
            </LogoutButton>
          )}
        </div>

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
              <h3>Belum ada pesanan aktif</h3>
              <p>Pesanan yang kamu ikuti akan tampil secara realtime di sini.</p>
              <Link href="/" className="text-link">
                Cari PO yang buka di kampus ↗
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
