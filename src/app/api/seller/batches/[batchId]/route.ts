import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const patchInput = z.object({
  status: z.enum(["open", "ready", "closed", "cancelled"]).optional(),
  title: z.string().trim().min(2).max(100).optional(),
  quota: z.number().int().min(1).optional(),
  closes_at: z.string().datetime().optional(),
  pickup_at: z.string().datetime().optional(),
  pickup_point: z.string().trim().min(2).max(160).optional(),
  pickup_note: z.string().trim().max(300).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi masuk sudah berakhir." }, { status: 401 });

  const { batchId } = await params;
  if (!z.string().uuid().safeParse(batchId).success) {
    return NextResponse.json({ error: "ID batch tidak valid." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data batch tidak valid." }, { status: 400 });
  }

  const { data: batchCheck } = await supabase
    .from("po_batches")
    .select("id, product:po_products!inner(seller_id)")
    .eq("id", batchId)
    .maybeSingle();

  if (!batchCheck) return NextResponse.json({ error: "Batch tidak ditemukan." }, { status: 404 });
  const sellerRef = batchCheck.product as unknown as { seller_id: string };
  if (sellerRef?.seller_id !== user.id) {
    return NextResponse.json({ error: "Anda tidak punya akses ke batch ini." }, { status: 403 });
  }

  const updates: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("po_batches").update(updates).eq("id", batchId);

  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi masuk sudah berakhir." }, { status: 401 });

  const { batchId } = await params;
  if (!z.string().uuid().safeParse(batchId).success) {
    return NextResponse.json({ error: "ID batch tidak valid." }, { status: 400 });
  }

  const { data: batchCheck } = await supabase
    .from("po_batches")
    .select("id, product:po_products!inner(seller_id)")
    .eq("id", batchId)
    .maybeSingle();

  if (!batchCheck) return NextResponse.json({ error: "Batch tidak ditemukan." }, { status: 404 });
  const sellerRef = batchCheck.product as unknown as { seller_id: string };
  if (sellerRef?.seller_id !== user.id) {
    return NextResponse.json({ error: "Anda tidak punya akses ke batch ini." }, { status: 403 });
  }

  const { error } = await supabase
    .from("po_batches")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", batchId);

  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true });
}
