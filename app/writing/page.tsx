import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Category } from "@/content/writing/types";
import { alongsideCategories, getStep, pathCategories } from "@/content/writing";

const DESCRIPTION =
  "A Java backend learning path in order — Java, Collections, Java 8, concurrency, databases, Spring, APIs, messaging, microservices and system design — plus DSA, interview questions and projects.";

export const metadata: Metadata = {
  title: "Writing",
  description: DESCRIPTION,
  alternates: { canonical: "/writing" },
  openGraph: {
    type: "website",
    images: ["/opengraph-image.jpg"],
    url: "/writing",
    title: "Writing — Prince Kumar Sharma",
    description: DESCRIPTION,
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
            A Java backend learning path. Follow the steps in order, finish one and move to the
            next, and keep the tracks below going alongside.
          </p>

          <h2 className="mt-20 text-xs uppercase tracking-[0.25em] text-white/40">
            The path, in order
          </h2>
          <CategoryGrid categories={pathCategories} />

          <h2 className="mt-20 text-xs uppercase tracking-[0.25em] text-white/40">
            Alongside the path
          </h2>
          <CategoryGrid categories={alongsideCategories} />
        </div>
      </section>
    </main>
  );
}

function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="mt-6 grid border-l border-t border-white/10 md:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => {
        const step = getStep(category);
        const count = category.lessons.length;

        return (
          <Link
            key={category.slug}
            href={`/writing/${category.slug}`}
            className="group border-b border-r border-white/10 p-6 transition-colors hover:bg-white/[0.025] md:p-9"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-orange-300/70">
                {step ? `Step ${step} · ` : ""}
                {count > 0
                  ? `${count} ${category.unit.toLowerCase()}${count === 1 ? "" : "s"}`
                  : "Coming soon"}
              </span>

              <ArrowUpRight
                size={17}
                className="shrink-0 text-white/20 transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-white"
              />
            </div>

            <h3
              className={`mt-6 text-2xl font-medium tracking-tight md:mt-10 ${count > 0 ? "text-white" : "text-white/50"}`}
            >
              {category.title}
            </h3>

            <p className="mt-3 text-sm leading-6 text-white/40 md:mt-4">
              {category.description}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
