import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const input = z.object({
  verified: z.boolean().optional(),
  suspended: z.boolean().optional(),
  display_name: z.string().trim().min(2).max(80).optional(),
  faculty: z.string().trim().min(2).max(120).optional(),
  note: z.string().trim().max(300).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sellerId: string }> },
) {
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Koneksi admin database belum disiapkan." }, { status: 500 });
  }

  const { sellerId } = await params;
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  const updates: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
  // Remove undefined values
  Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

  const { error } = await supabase
    .from("po_sellers")
    .update(updates)
    .eq("user_id", sellerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sellerId: string }> },
) {
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Koneksi admin database belum disiapkan." }, { status: 500 });
  }

  const { sellerId } = await params;

  // Soft delete: set status suspended agar tidak kehilangan data historis
  const { error } = await supabase
    .from("po_sellers")
    .update({ suspended: true, updated_at: new Date().toISOString() })
    .eq("user_id", sellerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  return NextResponse.json({ ok: true, message: "Akun penjual telah disuspend." });
}
