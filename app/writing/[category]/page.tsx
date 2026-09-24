import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ArticleList } from "@/components/WritingPreview";
import type { Phase } from "@/content/writing/types";
import type { LessonEntry } from "@/content/writing";
import {
  getCategory,
  getEntries,
  publishedCategories,
} from "@/content/writing";

type CategoryPageProps = {
  params: Promise<{ category: string }>;
};

export function generateStaticParams() {
  return publishedCategories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const category = getCategory((await params).category);

  return category
    ? {
        title: `${category.title} — Prince Kumar Sharma`,
        description: category.description,
      }
    : {};
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const category = getCategory((await params).category);

  if (!category) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
          <Link
            href="/writing"
            className="group inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
          >
            <ArrowLeft
              size={15}
              className="transition-transform group-hover:-translate-x-1"
            />
            All writing
          </Link>
        </div>
      </header>

      <section className="px-5 pb-28 pt-20 md:px-8 md:pt-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-[0.25em] text-orange-300">
            {category.lessons.length} {category.unit.toLowerCase()}
            {category.lessons.length === 1 ? "" : "s"}
          </p>

          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[0.95] tracking-[-0.06em] md:text-7xl">
            {category.title}
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-7 text-white/45 md:text-lg">
            {category.description}
          </p>

          {category.phases ? (
            <PhaseList phases={category.phases} entries={getEntries(category)} />
          ) : (
            <ArticleList entries={getEntries(category)} />
          )}
        </div>
      </section>
    </main>
  );
}

function PhaseList({
  phases,
  entries,
}: {
  phases: Phase[];
  entries: LessonEntry[];
}) {
  const numbered = phases.map((phase, index) => ({
    ...phase,
    number: String(index + 1).padStart(2, "0"),
    entries: entries.filter((entry) => phase.lessons.includes(entry.lesson)),
  }));

  return (
    <>
      {/* Learning path overview */}
      <nav
        aria-label="Learning path"
        className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3"
      >
        {numbered.map((phase) => (
          <a
            key={phase.number}
            href={`#phase-${phase.number}`}
            className="group bg-[#080808] p-6 transition-colors hover:bg-white/[0.03]"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300/70">
              Phase {phase.number}
            </p>
            <p
              className={`mt-3 text-base font-medium leading-6 ${phase.entries.length ? "text-white" : "text-white/40"}`}
            >
              {phase.title}
            </p>
            <p className="mt-3 text-xs text-white/30">
              {phase.entries.length
                ? `${phase.entries.length} lessons`
                : "Coming soon"}
            </p>
          </a>
        ))}
      </nav>

      {/* Phases */}
      <div className="mt-24 space-y-24">
        {numbered.map((phase) => (
          <section
            key={phase.number}
            id={`phase-${phase.number}`}
            className="scroll-mt-10"
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-orange-300">
                  Phase {phase.number}
                </p>
                <h2
                  className={`mt-4 text-3xl font-semibold tracking-[-0.04em] md:text-5xl ${phase.entries.length ? "text-white" : "text-white/35"}`}
                >
                  {phase.title}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-white/45 md:text-base">
                  {phase.description}
                </p>
              </div>

              <span
                className={`w-fit shrink-0 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] ${
                  phase.entries.length
                    ? "border-orange-300/20 bg-orange-300/5 text-orange-300"
                    : "border-white/10 text-white/35"
                }`}
              >
                {phase.entries.length
                  ? `${phase.entries.length} lessons`
                  : "Coming soon"}
              </span>
            </div>

            {phase.entries.length > 0 && (
              <ArticleList entries={phase.entries} className="mt-10" />
            )}
          </section>
        ))}
      </div>
    </>
  );
}
