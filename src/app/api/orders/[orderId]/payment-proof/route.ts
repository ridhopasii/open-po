import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimitDistributed, getClientIdentifier } from "@/lib/rate-limit";
import { hasOrderAccess } from "@/lib/order-access";

const MAX_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const orderCode = orderId.toUpperCase();
  if (!(await hasOrderAccess(orderCode))) {
    return NextResponse.json({ error: "Verifikasi pesanan sebelum mengunggah bukti pembayaran." }, { status: 401 });
  }

  const client = getClientIdentifier(request);
  const rateLimit = await checkRateLimitDistributed(`payment-proof:${client}:${orderCode}`, 5, 60 * 60 * 1000);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak unggahan. Coba lagi dalam satu jam." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Koneksi database belum siap." }, { status: 500 });
  }

  // Proof uploads use an order code, which is bound to the verified, signed access cookie.
  const { data: order, error: findError } = await admin
    .from("po_orders")
    .select("id,order_code,status,expires_at,payment_proof_path")
    .eq("order_code", orderCode)
    .maybeSingle();

  if (findError || !order) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Data form bukti transfer tidak valid." }, { status: 400 });
  }

  const file = formData.get("proof") as File | null;
  if (!file) {
    return NextResponse.json({ error: "File bukti transfer wajib diunggah." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Format file harus JPG, PNG, atau WebP." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Ukuran file bukti transfer maksimal 4MB." }, { status: 400 });
  }

  if (order.status !== "pending") {
    return NextResponse.json({ error: "Bukti pembayaran hanya bisa diunggah saat pesanan menunggu pembayaran." }, { status: 409 });
  }
  if (order.expires_at && new Date(order.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Batas pembayaran sudah berakhir. Hubungi penjual untuk memesan kembali." }, { status: 409 });
  }

  const ext = file.type.split("/")[1] ?? "jpg";
  const filePath = `${order.id}/${crypto.randomUUID()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const bucketName = "po-payment-proofs";
  const { data: bucket, error: bucketError } = await admin.storage.getBucket(bucketName);
  if (bucketError && !/not found|does not exist/i.test(bucketError.message)) {
    return NextResponse.json({ error: "Penyimpanan bukti pembayaran belum dapat diperiksa." }, { status: 503 });
  }
  if (!bucket) {
    const { error } = await admin.storage.createBucket(bucketName, {
      public: false,
      fileSizeLimit: MAX_SIZE,
      allowedMimeTypes: ALLOWED_TYPES,
    });
    if (error && !/already exists/i.test(error.message)) {
      return NextResponse.json({ error: "Penyimpanan bukti pembayaran belum siap." }, { status: 503 });
    }
  } else if (bucket.public) {
    const { error } = await admin.storage.updateBucket(bucketName, {
      public: false,
      fileSizeLimit: MAX_SIZE,
      allowedMimeTypes: ALLOWED_TYPES,
    });
    if (error) {
      return NextResponse.json({ error: "Bukti pembayaran belum bisa diamankan. Coba lagi nanti." }, { status: 503 });
    }
  }

  const { error: uploadError } = await admin.storage
    .from(bucketName)
    .upload(filePath, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: `Gagal mengunggah bukti: ${uploadError.message}` }, { status: 500 });
  }

  // Update order record
  const { error: updateError } = await admin
    .from("po_orders")
    .update({
      payment_proof_path: filePath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: signedFile, error: signedError } = await admin.storage.from(bucketName).createSignedUrl(filePath, 60 * 10);
  if (signedError || !signedFile?.signedUrl) {
    return NextResponse.json({ ok: true, path: filePath, message: "Bukti tersimpan. Muat ulang halaman untuk melihatnya." });
  }

  return NextResponse.json({
    ok: true,
    path: filePath,
    signedUrl: signedFile.signedUrl,
    message: "Bukti transfer berhasil disimpan!",
  });
}
