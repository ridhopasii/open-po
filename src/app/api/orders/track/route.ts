import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function maskName(name: string): string {
  if (!name) return "Pembeli";
  const parts = name.trim().split(/\s+/);
  return parts
    .map((p) => (p.length > 2 ? `${p[0]}${"*".repeat(p.length - 2)}${p[p.length - 1]}` : `${p[0]}*`))
    .join(" ");
}

function maskPhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return "****";
  const start = digits.slice(0, 4);
  const end = digits.slice(-3);
  return `${start}${"*".repeat(Math.max(2, digits.length - 7))}${end}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (!q || q.length < 4) {
    return NextResponse.json(
      { error: "Masukkan minimal 4 karakter kode pesanan atau nomor WhatsApp lengkap." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Sistem database tidak siap." }, { status: 500 });
  }

  const cleanQuery = q.toUpperCase();
  const phoneDigits = q.replace(/\D/g, "");

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

  // If search query is predominantly digits, treat as WhatsApp search (requires >= 10 digits to prevent broad scraping)
  if (phoneDigits.length >= 10) {
    query = query.ilike("buyer_whatsapp", `%${phoneDigits.slice(-9)}%`);
  } else if (cleanQuery.startsWith("PO-") && cleanQuery.length >= 7) {
    query = query.eq("order_code", cleanQuery);
  } else {
    return NextResponse.json(
      { error: "Gunakan kode pesanan lengkap (contoh: PO-XXXXXX) atau minimal 10 digit nomor WhatsApp." },
      { status: 400 }
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Gagal mencari pesanan: " + error.message }, { status: 500 });
  }

  // Mask sensitive personal data to protect buyer privacy
  const orderList = (data as any[]) || [];
  const sanitizedOrders = orderList.map((order: any) => ({
    ...order,
    buyer_name: maskName(order.buyer_name),
    buyer_whatsapp: maskPhone(order.buyer_whatsapp),
  }));

  return NextResponse.json({ orders: sanitizedOrders });
}
