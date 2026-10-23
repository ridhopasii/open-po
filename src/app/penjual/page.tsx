import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SellerDashboardView, SellerProfile, SellerBatch, SellerProduct } from "@/components/seller-dashboard-view";
import { SiteHeader } from "@/components/site-header";
import { sampleSellerDemoBatches } from "@/data/admin-mock-data";
import { createClient } from "@/lib/supabase/server";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "Ruang Penjual · OpenPO",
  description: "Dashboard penjualan mahasiswa: atur batch PO, kelola pesanan, dan konfirmasi pengambilan.",
};

const demoSellerProfile: SellerProfile = {
  display_name: "Nadia Putri",
  faculty: "Fakultas Pertanian",
  whatsapp: "081234567801",
  avatar_path: null,
};

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SellerPage({ searchParams }: PageProps) {
  await connection();
  const params = await searchParams;
  const isDemo = params.demo === "1";

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
            "product:po_products!inner(name,price_idr)," +
            "orders:po_orders(id,order_code,buyer_name,buyer_faculty,buyer_whatsapp,quantity,total_price_idr,status,created_at)",
        )
        .eq("product.seller_id", user.id)
        .order("created_at", { ascending: false });

      batches = (batchRows ?? []) as unknown as SellerBatch[];

      const { data: prodRows } = await supabase
        .from("po_products")
        .select(
          "id,name,description,category,price_idr,photo_path,status," +
            "batches:po_batches(id,status,reserved_quantity)",
        )
        .eq("seller_id", user.id)
        .neq("status", "archived")
        .order("created_at", { ascending: false });

      products = (prodRows ?? []).map((p: any) => {
        const totalSold = (p.batches ?? [])
          .filter((b: any) => b.status !== "cancelled")
          .reduce((sum: number, b: any) => sum + (b.reserved_quantity ?? 0), 0);
        return {
          id: p.id,
          name: p.name,
          description: p.description ?? "",
          category: p.category,
          price_idr: p.price_idr,
          total_batches: (p.batches ?? []).length,
          total_sold: totalSold,
          status: p.status ?? "active",
          photo: p.photo_path || (p.category === "Minuman" ? "/images/matcha-latte.jpg" : "/images/risol-mayo.jpg"),
        };
      });
    }
  } catch {
    // Supabase auth check error or connection issue
  }

  // Jika belum login dan tidak request demo -> arahkan ke login
  if (!user && !isDemo) {
    redirect(`/masuk?next=${encodeURIComponent("/penjual")}`);
  }

  // Jika demo mode
  if (!user && isDemo) {
    seller = demoSellerProfile;
    batches = sampleSellerDemoBatches as unknown as SellerBatch[];
  }

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="seller-page">
        <SellerDashboardView
          seller={seller}
          batches={batches}
          products={products}
          isDemo={isDemo}
          newBatchId={typeof params.baru === "string" ? params.baru : undefined}
        />
      </main>
    </div>
  );
}
