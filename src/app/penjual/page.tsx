import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SellerDashboardView, SellerProfile, SellerBatch, SellerProduct } from "@/components/seller-dashboard-view";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "Ruang Penjual · OpenPO",
  description: "Dashboard penjualan mahasiswa: atur batch PO, kelola pesanan, dan konfirmasi pengambilan.",
};

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SellerPage({ searchParams }: PageProps) {
  await connection();
  const params = await searchParams;

  let user = null;
  let seller: SellerProfile | null = null;
  let batches: SellerBatch[] = [];
  let products: SellerProduct[] = [];

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (user) {
      const { data: sellerRows } = await supabase.rpc("po_get_my_seller_profile");
      seller = sellerRows?.[0] ?? null;

      const { data: batchRows } = await supabase
        .from("po_batches")
        .select(
          "id,title,quota,reserved_quantity,closes_at,pickup_at,pickup_point,status," +
            "product:po_products!inner(id,name,description,category,price_idr)," +
            "orders:po_orders(id,order_code,buyer_name,buyer_faculty,buyer_whatsapp,quantity,total_price_idr,status,created_at)",
        )
        .eq("product.seller_id", user.id)
        .order("created_at", { ascending: false });

      batches = (batchRows ?? []) as unknown as SellerBatch[];

      let fetchedProducts: SellerProduct[] = [];
      try {
        const { data: prodRows, error: prodErr } = await supabase
          .from("po_products")
          .select(
            "id,name,description,category,price_idr," +
              "batches:po_batches(id,status,reserved_quantity)",
          )
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false });

        if (!prodErr && prodRows && prodRows.length > 0) {
          fetchedProducts = prodRows.map((p: any) => {
            const totalSold = (p.batches ?? [])
              .filter((b: any) => b.status !== "cancelled")
              .reduce((sum: number, b: any) => sum + (b.reserved_quantity ?? 0), 0);
            return {
              id: p.id,
              name: p.name,
              description: p.description ?? "",
              category: p.category ?? "Makanan",
              price_idr: p.price_idr,
              total_batches: (p.batches ?? []).length,
              total_sold: totalSold,
              status: "active",
              photo: p.category === "Minuman" ? "/images/kopi-susu.png" : "/images/risol-mayo.png",
            };
          });
        }
      } catch (err) {
        console.error("Gagal query po_products:", err);
      }

      // Jika data katalog belum terdaftar terpisah tapi batch sudah ada,
      // ekstrak otomatis master produk dari batch agar katalog tidak kosong!
      if (fetchedProducts.length === 0 && batches.length > 0) {
        const productMap = new Map<string, SellerProduct>();
        batches.forEach((b: any) => {
          const prodName = b.product?.name;
          if (prodName && !productMap.has(prodName)) {
            const relatedBatches = batches.filter((x: any) => x.product?.name === prodName);
            const totalSold = relatedBatches
              .filter((x: any) => x.status !== "cancelled")
              .reduce((sum: number, x: any) => sum + (x.reserved_quantity ?? 0), 0);

            productMap.set(prodName, {
              id: b.product?.id || `prod-${b.id}`,
              name: prodName,
              description: b.product?.description || b.title || "Produk pre-order mahasiswa",
              category: b.product?.category || (prodName.toLowerCase().includes("kopi") || prodName.toLowerCase().includes("teh") || prodName.toLowerCase().includes("latte") ? "Minuman" : "Makanan"),
              price_idr: b.product?.price_idr || 10000,
              total_batches: relatedBatches.length,
              total_sold: totalSold,
              status: "active",
              photo: prodName.toLowerCase().includes("kopi") ? "/images/kopi-susu.png" : "/images/risol-mayo.png",
            });
          }
        });
        fetchedProducts = Array.from(productMap.values());
      }

      products = fetchedProducts;
    }
  } catch {
    // Supabase auth check error or connection issue
  }

  // Wajib masuk akun resmi penjual
  if (!user) {
    redirect(`/masuk?next=${encodeURIComponent("/penjual")}`);
  }

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="seller-page">
        <SellerDashboardView
          seller={seller}
          batches={batches}
          products={products}
          newBatchId={typeof params.baru === "string" ? params.baru : undefined}
        />
      </main>
    </div>
  );
}
