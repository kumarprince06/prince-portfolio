import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { publishedCategories } from "@/content/writing";

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Lessons and notes on Java, DSA, Spring Boot, system design, databases, operating systems and networking.",
  alternates: { canonical: "/writing" },
  openGraph: {
    type: "website",
    images: ["/opengraph-image.jpg"],
    url: "/writing",
    title: "Writing — Prince Kumar Sharma",
    description:
      "Lessons and notes on Java, DSA, Spring Boot, system design, databases, operating systems and networking.",
  },
};

export default function WritingPage() {
  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
          <Link
            href="/#writing"
            className="group inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
          >
            <ArrowLeft
              size={15}
              className="transition-transform group-hover:-translate-x-1"
            />
            Back home
          </Link>
        </div>
      </header>

      <section className="px-5 pb-28 pt-20 md:px-8 md:pt-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-[0.25em] text-orange-300">
            Writing & Notes
          </p>

          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[0.95] tracking-[-0.06em] md:text-7xl">
            All writing
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-7 text-white/45 md:text-lg">
            Notes organised by topic. Pick a track and read it in order.
          </p>

          <div className="mt-20 grid border-l border-t border-white/10 md:grid-cols-2 lg:grid-cols-3">
            {publishedCategories.map((category) => (
              <Link
                key={category.slug}
                href={`/writing/${category.slug}`}
                className="group border-b border-r border-white/10 p-7 transition-colors hover:bg-white/[0.025] md:p-9"
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-orange-300/70">
                    {category.lessons.length} {category.unit.toLowerCase()}
                    {category.lessons.length === 1 ? "" : "s"}
                  </span>

                  <ArrowUpRight
                    size={17}
                    className="text-white/20 transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-white"
                  />
                </div>

                <h2 className="mt-10 text-2xl font-medium tracking-tight text-white">
                  {category.title}
                </h2>

                <p className="mt-4 text-sm leading-6 text-white/40">
                  {category.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
