import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

// Regex format nomor WA Indonesia
const waRegex = /^(\+62|62|0)8\d{7,13}$/;

const batchInput = z.object({
  sellerName: z.string().trim().min(2).max(80),
  faculty: z.string().trim().min(2).max(120),
  whatsapp: z
    .string()
    .trim()
    .regex(waRegex, "Format nomor WhatsApp tidak valid. Gunakan format 08xx atau +628xx."),
  productName: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1200).default(""),
  category: z.string().trim().min(2).max(40),
  price: z.number().int().min(1000),
  title: z.string().trim().min(2).max(100),
  quota: z.number().int().min(1).max(10000),
  closesAt: z.string().datetime(),
  pickupAt: z.string().datetime(),
  pickupPoint: z.string().trim().min(2).max(160),
  pickupNote: z.string().trim().max(300).default(""),
});

export async function POST(request: Request) {
  // Rate limit: 3 batch baru per jam per IP (buka PO tidak perlu sering)
  const identifier = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(`batch:${identifier}`, 3, 60 * 60_000);
  if (!rateLimitResult.ok) {
    return NextResponse.json(
      {
        error: `Terlalu banyak PO dibuka dalam satu jam. Tunggu ${Math.ceil(rateLimitResult.retryAfterSeconds / 60)} menit lagi.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds) },
      },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Masuk dulu untuk membuka PO." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = batchInput.safeParse(body);
  if (!parsed.success) {
    const firstError =
      parsed.error.issues[0]?.message ??
      "Periksa kembali detail produk, kuota, dan jadwal.";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const v = parsed.data;
  const { data, error } = await supabase.rpc("po_create_batch", {
    p_seller_name: v.sellerName,
    p_faculty: v.faculty,
    p_whatsapp: v.whatsapp,
    p_product_name: v.productName,
    p_description: v.description,
    p_category: v.category,
    p_price_idr: v.price,
    p_batch_title: v.title,
    p_quota: v.quota,
    p_closes_at: v.closesAt,
    p_pickup_at: v.pickupAt,
    p_pickup_point: v.pickupPoint,
    p_pickup_note: v.pickupNote,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  return NextResponse.json({ id: data }, { status: 201 });
}
