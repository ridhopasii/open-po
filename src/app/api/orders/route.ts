import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimitDistributed, getClientIdentifier } from "@/lib/rate-limit";

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

  type BatchQueryResult = {
    id: string;
    status: string;
    closes_at: string;
    quota: number;
    reserved_quantity: number;
    product: { id: string; price_idr: number; active: boolean } | null;
  };

  const { data: rawBatch, error: bErr } = await admin
    .from("po_batches")
    .select("id,status,closes_at,quota,reserved_quantity,product:po_products!inner(id,price_idr,active)")
    .eq("id", batchId)
    .single();

  const batch = rawBatch as unknown as BatchQueryResult | null;

  // 1. Validasi status dan ketersediaan kuota awal
  if (bErr || !batch) {
    return NextResponse.json({ error: "Batch PO tidak ditemukan." }, { status: 404 });
  }
  if (batch.status !== "open" || new Date(batch.closes_at) <= new Date()) {
    return NextResponse.json({ error: "PO ini sudah ditutup." }, { status: 400 });
  }
  if (batch.reserved_quantity + quantity > batch.quota) {
    return NextResponse.json({ error: "Kuota tersisa tidak mencukupi untuk jumlah tersebut." }, { status: 400 });
  }

  // 2. Cek idempotency: jika requestId sama sudah pernah dipesan, kembalikan pesanan yang sama
  const { data: existingOrder } = await admin
    .from("po_orders")
    .select("id,order_code,quantity,unit_price_idr,total_price_idr,status,payment_method,notes")
    .eq("client_request_id", requestId)
    .maybeSingle();

  if (existingOrder) {
    return NextResponse.json({ order: existingOrder }, { status: 200 });
  }

  // 3. Kunci kuota secara atomik: hanya berhasil jika sisa kuota masih memenuhi syarat
  const newReserved = batch.reserved_quantity + quantity;
  const { data: updatedBatch, error: updateErr } = await admin
    .from("po_batches")
    .update({
      reserved_quantity: newReserved,
      status: newReserved >= batch.quota ? "closed" : batch.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", batch.id)
    .lte("reserved_quantity", batch.quota - quantity)
    .select("id,reserved_quantity,quota")
    .single();

  if (updateErr || !updatedBatch) {
    return NextResponse.json({ error: "Mohon maaf, kuota PO baru saja terisi penuh oleh pemesan lain." }, { status: 400 });
  }

  // 4. Buat record pesanan
  const price = batch.product?.price_idr || 0;
  const orderCode = `PO-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

  const { data: newOrder, error: oErr } = await admin
    .from("po_orders")
    .insert({
      order_code: orderCode,
      batch_id: batch.id,
      buyer_id: user ? user.id : null,
      buyer_name: buyerName.trim(),
      buyer_faculty: faculty.trim(),
      buyer_whatsapp: whatsapp.trim(),
      quantity,
      unit_price_idr: price,
      payment_method: paymentMethod,
      notes: notes.trim(),
      client_request_id: requestId,
      status: "pending",
    })
    .select("id,order_code,quantity,unit_price_idr,total_price_idr,status,payment_method,notes")
    .single();

  if (oErr || !newOrder) {
    // Rollback kuota jika pembuatan order gagal
    await admin
      .from("po_batches")
      .update({
        reserved_quantity: batch.reserved_quantity,
        status: batch.status,
      })
      .eq("id", batch.id);
    return NextResponse.json({ error: oErr?.message || "Gagal menyimpan pesanan." }, { status: 500 });
  }

  return NextResponse.json({ order: newOrder }, { status: 201 });
}
