import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi masuk sudah berakhir." }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Data form foto tidak valid." }, { status: 400 });

  const file = formData.get("photo") as File | null;
  if (!file) return NextResponse.json({ error: "File foto wajib diunggah." }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Format foto harus JPG, PNG, atau WebP." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Ukuran foto maksimal 4MB." }, { status: 400 });
  }

  const ext = file.type.split("/")[1] ?? "jpg";
  const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("po-products")
    .upload(filePath, arrayBuffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: `Gagal mengunggah foto produk: ${uploadError.message}` }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from("po-products").getPublicUrl(filePath);

  return NextResponse.json({
    ok: true,
    filePath,
    publicUrl,
  });
}
