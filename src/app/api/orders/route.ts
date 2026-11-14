import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimitDistributed, getClientIdentifier } from "@/lib/rate-limit";
import { createOrderAccessToken, getOrderAccessCookieName, orderAccessCookieOptions } from "@/lib/order-access";

// Regex format nomor WA Indonesia: 08xx atau +628xx atau 628xx
const waRegex = /^(\+62|62|0)8\d{7,13}$/;

const orderInput = z.object({
  batchId: z.string().uuid(),
  quantity: z.number().int().min(1),
  buyerName: z.string().trim().min(2).max(80),
  faculty: z.string().trim().min(2).max(120),
  whatsapp: z
    .string()
    .trim()
    .regex(waRegex, "Format nomor WhatsApp tidak valid. Gunakan format 08xx atau +628xx."),
  paymentMethod: z.enum(["cod", "transfer_qris", "transfer_bank"]).optional().default("cod"),
  notes: z.string().trim().max(300).optional().default(""),
  requestId: z.string().uuid(),
  website: z.string().optional(), // Honeypot field for bot trapping
});

export async function POST(request: Request) {
  // Rate limit terdistribusi per IP (configurable, default 10 order/jam)
  const identifier = getClientIdentifier(request);
  const maxOrderPerHour = Number(process.env.RATE_LIMIT_ORDER_PER_HOUR || 10);
  const ipLimit = await checkRateLimitDistributed(`order:ip:${identifier}`, maxOrderPerHour, 3600_000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan order. Tunggu ${ipLimit.retryAfterSeconds} detik lalu coba lagi.` },
      {
        status: 429,
        headers: { "Retry-After": String(ipLimit.retryAfterSeconds) },
      },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = orderInput.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Periksa kembali data pesananmu.";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  // Honeypot check: bot otomatis mengisi input tersembunyi ini
  if (parsed.data.website) {
    return NextResponse.json({ error: "Permintaan tidak dapat diproses." }, { status: 400 });
  }

  const { batchId, quantity, buyerName, faculty, whatsapp, paymentMethod, notes, requestId } = parsed.data;

  // Rate limit per nomor WhatsApp (maks 5 order per 15 menit)
  const waDigits = whatsapp.replace(/\D/g, "");
  const waLimit = await checkRateLimitDistributed(`order:wa:${waDigits}`, 5, 900_000);
  if (!waLimit.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak pesanan dibuat untuk nomor WhatsApp ini dalam waktu singkat. Tunggu 15 menit." },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pesanan Tamu / Instan Kampus atau User Terotentikasi
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Sistem database belum siap." }, { status: 500 });
  }

  // Reject reused idempotency keys when their order details do not match this request.
  const { data: existingOrder } = await admin
    .from("po_orders")
    .select("id,order_code,batch_id,buyer_name,buyer_faculty,buyer_whatsapp,quantity,unit_price_idr,total_price_idr,status,payment_method,notes,expires_at")
    .eq("client_request_id", requestId)
    .maybeSingle();

  if (existingOrder) {
    const sameRequest =
      existingOrder.batch_id === batchId &&
      existingOrder.quantity === quantity &&
      existingOrder.buyer_name === buyerName.trim() &&
      existingOrder.buyer_faculty === faculty.trim() &&
      existingOrder.buyer_whatsapp.replace(/\D/g, "") === whatsapp.replace(/\D/g, "");
    if (!sameRequest) {
      return NextResponse.json({ error: "Permintaan ini sudah digunakan. Muat ulang halaman lalu coba kembali." }, { status: 409 });
    }
    const response = NextResponse.json({ order: existingOrder }, { status: 200 });
    response.cookies.set(
      getOrderAccessCookieName(existingOrder.order_code),
      createOrderAccessToken(existingOrder.id, existingOrder.order_code),
      orderAccessCookieOptions,
    );
    return response;
  }

  // Reserve quota and insert the order inside one database transaction.
  const { data: placed, error: placeError } = await admin.rpc("po_place_order_v2", {
    p_batch_id: batchId,
    p_quantity: quantity,
    p_buyer_name: buyerName.trim(),
    p_buyer_faculty: faculty.trim(),
    p_buyer_whatsapp: whatsapp.trim(),
    p_payment_method: paymentMethod,
    p_notes: notes.trim(),
    p_client_request_id: requestId,
    p_buyer_id: user?.id ?? null,
  });

  const placedOrder = Array.isArray(placed) ? placed[0] : placed;
  if (placeError || !placedOrder) {
    const message = placeError?.message || "Gagal menyimpan pesanan.";
    const conflict = /kuota|ditutup|tidak aktif|tidak ditemukan|sudah digunakan|tidak mencukupi/i.test(message);
    return NextResponse.json({ error: message }, { status: conflict ? 409 : 500 });
  }

  const { data: newOrder, error: orderFetchError } = await admin
    .from("po_orders")
    .select("id,order_code,batch_id,buyer_name,buyer_faculty,buyer_whatsapp,quantity,unit_price_idr,total_price_idr,status,payment_method,notes,expires_at")
    .eq("id", placedOrder.id)
    .single();

  if (orderFetchError || !newOrder) {
    return NextResponse.json({ error: "Pesanan tercatat, tetapi detailnya belum dapat dimuat. Lacak dengan kode pesanan." }, { status: 503 });
  }

  const sameRequest =
    newOrder.batch_id === batchId &&
    newOrder.quantity === quantity &&
    newOrder.buyer_name === buyerName.trim() &&
    newOrder.buyer_faculty === faculty.trim() &&
    newOrder.buyer_whatsapp.replace(/\D/g, "") === whatsapp.replace(/\D/g, "");
  if (!sameRequest) {
    return NextResponse.json({ error: "Permintaan ini sudah digunakan. Muat ulang halaman lalu coba kembali." }, { status: 409 });
  }

  const response = NextResponse.json({ order: newOrder }, { status: 201 });
  response.cookies.set(
    getOrderAccessCookieName(newOrder.order_code),
    createOrderAccessToken(newOrder.id, newOrder.order_code),
    orderAccessCookieOptions,
  );
  return response;
}
