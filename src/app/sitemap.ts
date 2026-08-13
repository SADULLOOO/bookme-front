import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://smartsbooking.online";
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/register`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
