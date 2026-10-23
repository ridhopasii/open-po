import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi masuk sudah berakhir." }, { status: 401 });
  const { orderId } = await params;
  if (!z.string().uuid().safeParse(orderId).success) return NextResponse.json({ error: "Pesanan tidak valid." }, { status: 400 });
  const { error } = await supabase.rpc("po_cancel_order", { p_order_id: orderId });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true });
}
