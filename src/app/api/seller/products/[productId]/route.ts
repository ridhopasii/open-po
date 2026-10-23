import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const patchInput = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(1200).optional(),
  category: z.string().trim().min(2).max(40).optional(),
  price_idr: z.number().int().min(1000).optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi masuk sudah berakhir." }, { status: 401 });

  const { productId } = await params;
  if (!z.string().uuid().safeParse(productId).success) {
    return NextResponse.json({ error: "ID produk tidak valid." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  // Verify ownership
  const { data: prod } = await supabase
    .from("po_products")
    .select("seller_id")
    .eq("id", productId)
    .maybeSingle();

  if (!prod) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  if (prod.seller_id !== user.id) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

  const updates = { ...parsed.data, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("po_products").update(updates).eq("id", productId);

  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi masuk sudah berakhir." }, { status: 401 });

  const { productId } = await params;
  if (!z.string().uuid().safeParse(productId).success) {
    return NextResponse.json({ error: "ID produk tidak valid." }, { status: 400 });
  }

  const { data: prod } = await supabase
    .from("po_products")
    .select("seller_id")
    .eq("id", productId)
    .maybeSingle();

  if (!prod) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  if (prod.seller_id !== user.id) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

  // Soft delete
  const { error } = await supabase
    .from("po_products")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true });
}
