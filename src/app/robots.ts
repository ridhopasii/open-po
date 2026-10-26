import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/akun/", "/auth/", "/admin", "/superadmin"],
    },
    sitemap: "https://open-po.vercel.app/sitemap.xml",
  };
}
