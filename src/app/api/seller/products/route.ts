import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const waRegex = /^(\+62|62|0)8\d{7,13}$/;

const productInput = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1200).default(""),
  category: z.string().trim().min(2).max(40),
  price_idr: z.number().int().min(1000),
  photo_path: z.string().trim().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi masuk sudah berakhir." }, { status: 401 });

  let { data, error } = await supabase
    .from("po_products")
    .select(
      "id,name,description,category,price_idr,active," +
      "batches:po_batches(id,status,reserved_quantity)"
    )
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const products = (data ?? []).map((p: any) => {
    const totalSold = (p.batches ?? [])
      .filter((b: any) => b.status !== "cancelled")
      .reduce((sum: number, b: any) => sum + (b.reserved_quantity ?? 0), 0);
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      price_idr: p.price_idr,
      photo_path: p.photo_path,
      status: p.status ?? "active",
      total_batches: (p.batches ?? []).length,
      total_sold: totalSold,
    };
  });

  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi masuk sudah berakhir." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = productInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data produk tidak valid." }, { status: 400 });
  }

  const { name, description, category, price_idr, photo_path } = parsed.data;

  // Cek seller record ada
  const { data: sellerRow } = await supabase
    .from("po_sellers")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sellerRow) {
    return NextResponse.json({ error: "Profil penjual belum dibuat. Lengkapi data penjual terlebih dahulu." }, { status: 400 });
  }

  // Insert product dengan kolom yang kompatibel (active: boolean)
  const insertPayload: Record<string, any> = {
    seller_id: user.id,
    name,
    description: description || "",
    category: category || "Lainnya",
    price_idr,
    active: true,
  };

  if (photo_path) {
    insertPayload.photo_path = photo_path;
  }

  const { data, error } = await supabase
    .from("po_products")
    .insert(insertPayload)
    .select("id,name,category,price_idr")
    .single();

  if (error) {
    // Jika kolom photo_path belum ditambahkan via migrasi, coba insert tanpa photo_path
    if (error.message?.includes("photo_path")) {
      delete insertPayload.photo_path;
      const { data: retryData, error: retryErr } = await supabase
        .from("po_products")
        .insert(insertPayload)
        .select("id,name,category,price_idr")
        .single();
      if (retryErr) return NextResponse.json({ error: retryErr.message }, { status: 409 });
      return NextResponse.json({ ok: true, product: retryData }, { status: 201 });
    }
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  return NextResponse.json({ ok: true, product: data }, { status: 201 });
}
