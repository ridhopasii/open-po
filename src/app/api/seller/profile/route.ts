import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const waRegex = /^(\+62|62|0)8\d{7,13}$/;

const profileInput = z.object({
  display_name: z.string().trim().min(2).max(80),
  faculty: z.string().trim().min(2).max(120),
  whatsapp: z.string().trim().regex(waRegex, "Format nomor WhatsApp tidak valid."),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi masuk sudah berakhir." }, { status: 401 });

  const { data, error } = await supabase
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

  const { display_name, faculty, whatsapp } = parsed.data;
  const { error } = await supabase
    .from("po_sellers")
    .update({ display_name, faculty, whatsapp, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true, display_name, faculty, whatsapp });
}
