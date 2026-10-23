import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi masuk sudah berakhir." }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Data form tidak valid." }, { status: 400 });

  const file = formData.get("avatar") as File | null;
  if (!file) return NextResponse.json({ error: "File avatar wajib diunggah." }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Format file harus JPG, PNG, WebP, atau GIF." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Ukuran file maksimal 2MB." }, { status: 400 });
  }

  const ext = file.type.split("/")[1] ?? "jpg";
  const filePath = `${user.id}/avatar.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("po-seller-avatars")
    .upload(filePath, arrayBuffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: "Gagal mengunggah foto: " + uploadError.message }, { status: 500 });
  }

  await supabase
    .from("po_sellers")
    .update({ avatar_path: filePath, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true, path: filePath });
}
