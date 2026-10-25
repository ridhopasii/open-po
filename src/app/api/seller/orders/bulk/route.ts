import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bulkSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1),
  status: z.enum(["confirmed", "ready", "picked_up", "cancelled"]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sesi masuk sudah berakhir." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Data permintaan massal tidak valid." }, { status: 400 });
  }

  const { orderIds, status } = parsed.data;

  // Eksekusi pembaruan status untuk setiap pesanan milik penjual
  const results = await Promise.all(
    orderIds.map((id) =>
      supabase.rpc("po_seller_update_order_status", {
        p_order_id: id,
        p_status: status,
      })
    )
  );

  const errors = results.filter((r) => r.error);
  if (errors.length > 0 && errors.length === orderIds.length) {
    return NextResponse.json(
      { error: "Gagal memperbarui status pesanan." },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    totalUpdated: orderIds.length - errors.length,
  });
}
