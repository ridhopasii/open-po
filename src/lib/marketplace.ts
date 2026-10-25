import { createClient } from "@/lib/supabase/server";
import type { OpenBatch } from "@/lib/marketplace-shared";
import { getSampleBatch } from "@/data/sample-listings";
export type { OpenBatch } from "@/lib/marketplace-shared";
// Re-export helpers dari shared — tidak perlu duplikasi
export { formatRupiah, formatCampusDate, getSellerAvatarUrl } from "@/lib/marketplace-shared";

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

const BATCH_SELECT =
  "id,title,quota,reserved_quantity,closes_at,pickup_at,pickup_point,pickup_note," +
  "product:po_products!inner(id,name,description,category,price_idr," +
  "seller:po_sellers!inner(display_name,faculty,avatar_path))";

export async function getOpenBatches(): Promise<{
  batches: OpenBatch[];
  connected: boolean;
}> {
  if (!isSupabaseConfigured()) return { batches: [], connected: false };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("po_batches")
      .select(BATCH_SELECT)
      .eq("status", "open")
      .gt("closes_at", new Date().toISOString())
      .order("closes_at", { ascending: true });

    if (error) return { batches: [], connected: false };
    return { batches: (data ?? []) as unknown as OpenBatch[], connected: true };
  } catch {
    return { batches: [], connected: false };
  }
}

export async function getOpenBatch(id: string): Promise<OpenBatch | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("po_batches")
        .select(BATCH_SELECT)
        .eq("id", id)
        .eq("status", "open")
        .gt("closes_at", new Date().toISOString())
        .maybeSingle();
      if (!error && data) return data as unknown as OpenBatch;
    } catch {
      // Fallback
    }
  }

  return getSampleBatch(id);
}
