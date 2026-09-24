import type { MetadataRoute } from "next";
import { getEntries, publishedCategories } from "@/content/writing";
import { social } from "@/data/social";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => new URL(path, social.website).toString();
  const lessons = publishedCategories.flatMap(getEntries);
  const latest = lessons.map((entry) => entry.lesson.date).sort().at(-1);

  return [
    { url: url("/"), changeFrequency: "monthly", priority: 1 },
    { url: url("/writing"), lastModified: latest, changeFrequency: "weekly", priority: 0.8 },
    ...publishedCategories.map((category) => ({
      url: url(`/writing/${category.slug}`),
      lastModified: getEntries(category).map((entry) => entry.lesson.date).sort().at(-1),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...lessons.map((entry) => ({
      url: url(entry.href),
      lastModified: entry.lesson.date,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
