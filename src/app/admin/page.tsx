import type { Metadata } from "next";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { AdminAuthGate } from "@/components/admin-auth-gate";
import { AdminDashboard } from "@/components/admin-dashboard";
import { SiteHeader } from "@/components/site-header";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  AdminBatch,
  AdminOrder,
  AdminSeller,
  sampleAdminBatches,
  sampleAdminOrders,
  sampleAdminSellers,
} from "@/data/admin-mock-data";

export const metadata: Metadata = {
  title: "Superadmin Control Center · OpenPO",
  description: "Pusat kendali, moderasi batch PO, kelola penjual, dan audit pesanan se-kampus.",
};

export const instant = false;

export default async function AdminPage() {
  await connection();

  // 🔒 Keamanan: Cek cookie sesi admin atau login user admin
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("openpo_admin_token");
  let isAuthenticated = adminCookie?.value === "admin_authenticated_session";

  if (!isAuthenticated) {
    try {
      const supabaseUser = await createClient();
      const { data } = await supabaseUser.auth.getUser();
      const adminEmail = process.env.ADMIN_EMAIL || "admin@openpo.id";
      if (data?.user?.email?.toLowerCase() === adminEmail.toLowerCase()) {
        isAuthenticated = true;
      }
    } catch {
      // Belum masuk
    }
  }

  // Jika belum diautentikasi dengan kata sandi admin -> Tampilkan Layar Kunci
  if (!isAuthenticated) {
    return (
      <div className="page-shell">
        <SiteHeader />
        <AdminAuthGate />
      </div>
    );
  }

  // Jika sudah terverifikasi -> muat data nyata (tanpa data tiruan)
  let batches: AdminBatch[] = [];
  let sellers: AdminSeller[] = [];
  let orders: AdminOrder[] = [];

  try {
    const supabase = createAdminClient() || (await createClient());

    // Query real batches
    const { data: dbBatches } = await supabase
      .from("po_batches")
      .select(
        "id,title,quota,reserved_quantity,closes_at,pickup_at,pickup_point,status," +
          "product:po_products!inner(name,category,price_idr,seller:po_sellers!inner(display_name,faculty,whatsapp))",
      )
      .order("created_at", { ascending: false });

    if (dbBatches && dbBatches.length > 0) {
      batches = dbBatches.map((b: any) => ({
        id: b.id,
        title: b.title,
        product_name: b.product?.name ?? "Produk",
        category: b.product?.category ?? "Lainnya",
        seller_name: b.product?.seller?.display_name ?? "Penjual Kampus",
        seller_faculty: b.product?.seller?.faculty ?? "Universitas",
        seller_whatsapp: b.product?.seller?.whatsapp ?? "081200000000",
        price_idr: b.product?.price_idr ?? 10000,
        quota: b.quota,
        reserved_quantity: b.reserved_quantity,
        closes_at: b.closes_at,
        pickup_at: b.pickup_at,
        pickup_point: b.pickup_point,
        status: b.status,
      }));
    }

    // Query real sellers
    const { data: dbSellers } = await supabase
      .from("po_sellers")
      .select("user_id,display_name,faculty,whatsapp,created_at");

    if (dbSellers && dbSellers.length > 0) {
      sellers = dbSellers.map((s: any) => ({
        id: s.user_id,
        name: s.display_name,
        faculty: s.faculty,
        whatsapp: s.whatsapp,
        total_batches: batches.filter((b) => b.seller_name === s.display_name).length || 1,
        total_revenue: orders
          .filter((o) => o.seller_name === s.display_name && o.status !== "cancelled")
          .reduce((sum, o) => sum + o.total_price_idr, 0),
        verified: true,
        joined_at: s.created_at,
      }));
    }

    // Query real orders
    const { data: dbOrders } = await supabase
      .from("po_orders")
      .select(
        "id,order_code,batch_id,buyer_name,buyer_faculty,buyer_whatsapp,quantity,total_price_idr,status,created_at," +
          "batch:po_batches!inner(product:po_products!inner(name,seller:po_sellers!inner(display_name)))",
      )
      .order("created_at", { ascending: false });

    if (dbOrders && dbOrders.length > 0) {
      orders = dbOrders.map((o: any) => ({
        id: o.id,
        order_code: o.order_code,
        batch_id: o.batch_id,
        product_name: o.batch?.product?.name ?? "Produk",
        buyer_name: o.buyer_name,
        buyer_faculty: o.buyer_faculty,
        buyer_whatsapp: o.buyer_whatsapp,
        seller_name: o.batch?.product?.seller?.display_name ?? "Penjual",
        quantity: o.quantity,
        total_price_idr: o.total_price_idr,
        status: o.status,
        created_at: o.created_at,
      }));
    }
  } catch {
    // Fallback data
  }

  return (
    <div className="page-shell">
      <SiteHeader />
      <AdminDashboard
        initialBatches={batches}
        initialSellers={sellers}
        initialOrders={orders}
      />
    </div>
  );
}
