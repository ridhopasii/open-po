import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (!q || q.length < 3) {
    return NextResponse.json({ error: "Masukkan minimal 3 karakter kode pesanan atau nomor WhatsApp." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Sistem database tidak siap." }, { status: 500 });
  }

  const cleanQuery = q.toUpperCase();
  const phoneQuery = q.replace(/\D/g, "");

  let query = admin
    .from("po_orders")
    .select(
      "id,order_code,buyer_name,buyer_faculty,buyer_whatsapp,quantity,unit_price_idr,total_price_idr,status,created_at," +
      "batch:po_batches!inner(" +
      "  id,title,closes_at,pickup_at,pickup_point,pickup_note,status," +
      "  product:po_products!inner(" +
      "    id,name,description,category,price_idr," +
      "    seller:po_sellers!inner(display_name,faculty,whatsapp,avatar_path)" +
      "  )" +
      ")"
    )
    .order("created_at", { ascending: false })
    .limit(10);

  if (cleanQuery.startsWith("PO-") || cleanQuery.length >= 6) {
    query = query.or(`order_code.ilike.%${cleanQuery}%,buyer_whatsapp.ilike.%${phoneQuery || q}%`);
  } else if (phoneQuery.length >= 4) {
    query = query.ilike("buyer_whatsapp", `%${phoneQuery}%`);
  } else {
    query = query.ilike("order_code", `%${cleanQuery}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Gagal mencari pesanan: " + error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data || [] });
}
