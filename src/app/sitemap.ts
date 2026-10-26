import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: "https://open-po.vercel.app",
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: "https://open-po.vercel.app/cara-kerja",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://open-po.vercel.app/lacak",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: "https://open-po.vercel.app/penjual",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  try {
    const admin = createAdminClient();
    if (!admin) return staticRoutes;
    const { data: batches } = await admin
      .from("po_batches")
      .select("id, updated_at")
      .in("status", ["open", "active"])
      .limit(50);

    const batchRoutes: MetadataRoute.Sitemap = (batches || []).map((b) => ({
      url: `https://open-po.vercel.app/po/${b.id}`,
      lastModified: b.updated_at ? new Date(b.updated_at) : new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    }));

    return [...staticRoutes, ...batchRoutes];
  } catch {
    return staticRoutes;
  }
}
