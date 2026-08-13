import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/onboarding", "/application-status", "/forgot-password"],
    },
    sitemap: "https://smartsbooking.online/sitemap.xml",
  };
}
