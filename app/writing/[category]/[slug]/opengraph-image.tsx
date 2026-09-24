import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getCategory, getEntries } from "@/content/writing";

// Share card for a single lesson: its title, where it sits in the path, and who wrote it.
export const alt = "A lesson by Prince Kumar Sharma";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function LessonImage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categorySlug, slug } = await params;
  const category = getCategory(categorySlug);
  const entry = category && getEntries(category).find((item) => item.lesson.slug === slug);

  // prince.webp is JPEG data despite the extension.
  const photo = await readFile(join(process.cwd(), "public/images/profile/prince.webp"));
  const photoSrc = `data:image/jpeg;base64,${photo.toString("base64")}`;

  const title = entry?.lesson.title ?? "Engineering notes";
  const plain = (entry?.lesson.description ?? "").replace(/[`*]/g, "");
  const description =
    plain.length > 150 ? `${plain.slice(0, plain.lastIndexOf(" ", 147)).replace(/[,:;]$/, "")}…` : plain;
  const path = entry
    ? [entry.category.title, entry.phase && `Phase ${entry.phase.number}`, `${entry.category.unit} ${entry.number}`]
        .filter(Boolean)
        .join("  ·  ")
    : "Writing";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "radial-gradient(circle at 85% 10%, #2a1708 0%, #080808 55%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, letterSpacing: 4, color: "#fdba74" }}>
            <div style={{ width: 12, height: 12, borderRadius: 999, background: "#fb923c" }} />
            {path.toUpperCase()}
          </div>
          <div style={{ marginTop: 36, fontSize: 76, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>
            {title}
          </div>
          <div style={{ marginTop: 28, fontSize: 28, lineHeight: 1.45, color: "rgba(255,255,255,0.55)", maxWidth: 980 }}>
            {description}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img
            src={photoSrc}
            alt=""
            width={72}
            height={72}
            style={{ objectFit: "cover", borderRadius: 999, border: "2px solid rgba(255,255,255,0.15)" }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28 }}>Prince Kumar Sharma</div>
            <div style={{ marginTop: 4, fontSize: 22, color: "rgba(255,255,255,0.5)" }}>Java Backend Engineer</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
