import type { MetadataRoute } from "next";
import { social } from "@/data/social";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("/sitemap.xml", social.website).toString(),
  };
}
