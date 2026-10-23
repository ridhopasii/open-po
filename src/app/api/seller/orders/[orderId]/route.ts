import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const input = z.object({ status: z.enum(["confirmed", "ready", "picked_up", "cancelled"]) });
export async function PATCH(request: Request, context: RouteContext<"/api/seller/orders/[orderId]">) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi masuk sudah berakhir." }, { status: 401 });
  const { orderId } = await context.params;
  if (!z.string().uuid().safeParse(orderId).success) return NextResponse.json({ error: "Pesanan tidak valid." }, { status: 400 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Status pesanan tidak valid." }, { status: 400 });
  const { error } = await supabase.rpc("po_seller_update_order_status", { p_order_id: orderId, p_status: parsed.data.status });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true });
}
