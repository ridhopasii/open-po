import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimitDistributed, getClientIdentifier } from "@/lib/rate-limit";

function maskName(name: string): string {
  if (!name) return "Pe***";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const p = parts[0];
    return p.length > 2 ? `${p.slice(0, 2)}***` : `${p[0]}*`;
  }
  const first = parts[0];
  const firstMasked = first.length > 2 ? `${first.slice(0, 2)}***` : `${first}*`;
  const lastInitial = parts[parts.length - 1][0].toUpperCase() + ".";
  return `${firstMasked} ${lastInitial}`;
}

function maskPhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return "****";
  const start = digits.slice(0, 4);
  const end = digits.slice(-4);
  return `${start}****${end}`;
}

export async function GET(request: Request) {
  // Rate limit: 20 percobaan per jam per IP
  const ip = getClientIdentifier(request);
  const maxTrackPerHour = Number(process.env.RATE_LIMIT_TRACK_MAX || 20);
  const rl = await checkRateLimitDistributed(`track:${ip}`, maxTrackPerHour, 3600_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan pencarian pesanan. Tunggu ${rl.retryAfterSeconds} detik lagi.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const codeParam = (searchParams.get("code") || searchParams.get("q") || "").trim().toUpperCase();
  const phoneParam = (searchParams.get("phone") || searchParams.get("phone_last4") || searchParams.get("wa") || "").trim();

  // Memerlukan kode pesanan dan 4 digit terakhir nomor WhatsApp
  const phoneDigits = phoneParam.replace(/\D/g, "");
  if (!codeParam || phoneDigits.length < 4) {
    return NextResponse.json(
      { error: "Masukkan Kode Pesanan dan 4 digit terakhir nomor WhatsApp kamu demi menjaga privasi pemesan." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Sistem database tidak siap." }, { status: 500 });
  }

  const last4 = phoneDigits.slice(-4);

  const { data: order, error } = await admin
    .from("po_orders")
    .select(
      "id,order_code,buyer_name,buyer_faculty,buyer_whatsapp,quantity,unit_price_idr,total_price_idr,status,payment_method,payment_proof_path,notes,created_at,expires_at," +
      "batch:po_batches!inner(" +
      "  id,title,closes_at,pickup_at,pickup_point,pickup_note,status," +
      "  product:po_products!inner(" +
      "    id,name,description,category,price_idr," +
      "    seller:po_sellers!inner(display_name,faculty,whatsapp,avatar_path)" +
      "  )" +
      ")"
    )
    .eq("order_code", codeParam)
    .maybeSingle();

  // Pesan galat seragam jika kode tidak ditemukan ATAU 4 digit nomor WA tidak cocok (mencegah enumerasi / timing attack)
  const orderData = order as any;
  const buyerWaDigits = (orderData?.buyer_whatsapp || "").replace(/\D/g, "");
  if (error || !orderData || !buyerWaDigits.endsWith(last4)) {
    return NextResponse.json(
      { error: "Pesanan dengan kode dan 4 digit nomor WhatsApp tersebut tidak ditemukan. Mohon periksa kembali data pesananmu." },
      { status: 404 }
    );
  }

  // Sanitasi data pribadi (nama: Ra*** M., nomor WA: 0812****4321)
  const sanitizedOrder = {
    ...orderData,
    buyer_name: maskName(orderData.buyer_name),
    buyer_whatsapp: maskPhone(orderData.buyer_whatsapp),
  };

  return NextResponse.json({ orders: [sanitizedOrder] });
}
