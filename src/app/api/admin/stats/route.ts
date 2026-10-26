import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const auth = await verifyAdminSession();
  if (!auth.authorized) {
    return NextResponse.json({ error: "Akses ditolak. Sesi admin diperlukan." }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Koneksi admin database belum disiapkan." }, { status: 500 });
  }

  try {
    const [batchRes, orderRes, sellerRes] = await Promise.all([
      supabase.from("po_batches").select("status", { count: "exact" }),
      supabase.from("po_orders").select("status,total_price_idr", { count: "exact" }),
      supabase.from("po_sellers").select("user_id", { count: "exact" }),
    ]);

    const batches = batchRes.data ?? [];
    const orders = orderRes.data ?? [];
    const totalSellers = sellerRes.count ?? 0;

    const openBatches = batches.filter((b) => b.status === "open").length;
    const totalBatches = batches.length;

    const totalOrders = orders.length;
    const activeOrders = orders.filter((o) => !["cancelled", "picked_up"].includes(o.status)).length;
    const gmv = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum: number, o: { total_price_idr: number }) => sum + (o.total_price_idr ?? 0), 0);

    return NextResponse.json({
      ok: true,
      stats: {
        totalBatches,
        openBatches,
        totalOrders,
        activeOrders,
        gmv,
        totalSellers,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
