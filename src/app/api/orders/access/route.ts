import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimitDistributed, getClientIdentifier } from "@/lib/rate-limit";
import {
  createOrderAccessToken,
  getOrderAccessCookieName,
  orderAccessCookieOptions,
} from "@/lib/order-access";

const requestSchema = z.object({
  orderCode: z.string().trim().toUpperCase().regex(/^PO-[23456789A-HJ-NP-Z]{10}$/),
  phoneLast4: z.string().regex(/^\d{4}$/),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Masukkan kode pesanan dan 4 digit terakhir nomor WhatsApp." }, { status: 400 });
  }

  const { orderCode, phoneLast4 } = parsed.data;
  const ip = getClientIdentifier(request);
  const rateLimit = await checkRateLimitDistributed(`order-access:${ip}:${orderCode}`, 5, 60 * 60 * 1000);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi dalam satu jam." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Sistem database belum siap." }, { status: 503 });

  const { data: order, error } = await admin
    .from("po_orders")
    .select("id,order_code,buyer_whatsapp")
    .eq("order_code", orderCode)
    .maybeSingle();

  const phoneDigits = (order?.buyer_whatsapp || "").replace(/\D/g, "");
  const supplied = Buffer.from(phoneLast4);
  const expected = Buffer.from(phoneDigits.slice(-4));
  const matches = expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);

  if (error || !order || !matches) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan. Periksa kode dan nomor WhatsApp kamu." }, { status: 404 });
  }

  try {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      getOrderAccessCookieName(order.order_code),
      createOrderAccessToken(order.id, order.order_code),
      orderAccessCookieOptions,
    );
    return response;
  } catch {
    return NextResponse.json({ error: "Sesi pesanan belum dapat dibuat. Hubungi admin OpenPO." }, { status: 503 });
  }
}
