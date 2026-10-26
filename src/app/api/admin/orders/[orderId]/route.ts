import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminSession, logAdminAudit } from "@/lib/admin-auth";
import { getClientIdentifier } from "@/lib/rate-limit";

const input = z.object({
  status: z.enum(["pending", "confirmed", "ready", "picked_up", "cancelled"]),
});

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/orders/[orderId]">,
) {
  const auth = await verifyAdminSession();
  if (!auth.authorized) {
    return NextResponse.json({ error: "Akses ditolak. Sesi admin diperlukan." }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Koneksi admin database belum disiapkan." }, { status: 500 });
  }

  const { orderId } = await context.params;
  if (!z.string().uuid().safeParse(orderId).success) {
    return NextResponse.json({ error: "ID pesanan tidak valid." }, { status: 400 });
  }

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Status pesanan tidak valid." }, { status: 400 });
  }

  const { error } = await supabase
    .from("po_orders")
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  await logAdminAudit({
    actor: auth.actor,
    action: "admin_update_order_status",
    targetType: "po_orders",
    targetId: orderId,
    details: { status: parsed.data.status },
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({ ok: true, status: parsed.data.status });
}
