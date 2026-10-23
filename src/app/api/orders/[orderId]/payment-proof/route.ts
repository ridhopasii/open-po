import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Koneksi database belum siap." }, { status: 500 });
  }

  // Find order by ID or order_code
  const { data: order, error: findError } = await admin
    .from("po_orders")
    .select("id,order_code,status")
    .or(`id.eq.${orderId},order_code.eq.${orderId.toUpperCase()}`)
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

  const ext = file.type.split("/")[1] ?? "jpg";
  const filePath = `${order.order_code}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from("po-payment-proofs")
    .upload(filePath, arrayBuffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: `Gagal mengunggah bukti: ${uploadError.message}` }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage.from("po-payment-proofs").getPublicUrl(filePath);

  // Update order record
  const { error: updateError } = await admin
    .from("po_orders")
    .update({
      payment_proof_path: publicUrl || filePath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    path: filePath,
    publicUrl,
    message: "Bukti transfer berhasil disimpan!",
  });
}
