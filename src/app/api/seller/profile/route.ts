import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const waRegex = /^(\+62|62|0)8\d{7,13}$/;

const profileInput = z.object({
  display_name: z.string().trim().min(2).max(80).optional(),
  faculty: z.string().trim().min(2).max(120).optional(),
  whatsapp: z.string().trim().regex(waRegex, "Format nomor WhatsApp tidak valid.").optional(),
  bank_name: z.string().trim().max(100).optional(),
  bank_number: z.string().trim().max(50).optional(),
  bank_holder: z.string().trim().max(100).optional(),
  qris_nmid: z.string().trim().max(100).optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi masuk sudah berakhir." }, { status: 401 });

  let { data, error } = await supabase
    .from("po_sellers")
    .select("display_name,faculty,whatsapp,avatar_path,created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi masuk sudah berakhir." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = profileInput.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Data profil tidak valid.";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
    ...parsed.data,
  };

  const { error } = await supabase
    .from("po_sellers")
    .update(updateData)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true, ...parsed.data });
}
