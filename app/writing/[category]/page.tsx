import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";
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
  return (
    <div className="mt-16 space-y-4">
      {phases.map((phase, index) => {
        const number = String(index + 1).padStart(2, "0");
        const phaseEntries = entries.filter((entry) =>
          phase.lessons.includes(entry.lesson),
        );
        const ready = phaseEntries.length > 0;

        const header = (
          <div className="flex min-w-0 flex-1 flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.25em] text-orange-300">
                Phase {number}
              </p>
              <h2
                className={`mt-3 text-2xl font-semibold tracking-[-0.03em] md:text-3xl ${ready ? "text-white" : "text-white/40"}`}
              >
                {phase.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
                {phase.description}
              </p>
            </div>

            <span
              className={`w-fit shrink-0 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] ${
                ready
                  ? "border-orange-300/20 bg-orange-300/5 text-orange-300"
                  : "border-white/10 text-white/35"
              }`}
            >
              {ready ? `${phaseEntries.length} lessons` : "Coming soon"}
            </span>
          </div>
        );

        if (!ready) {
          return (
            <div
              key={number}
              id={`phase-${number}`}
              className="rounded-3xl border border-dashed border-white/10 p-6 md:p-8"
            >
              {header}
            </div>
          );
        }

        return (
          <details
            key={number}
            id={`phase-${number}`}
            open={index === 0}
            className="group scroll-mt-10 rounded-3xl border border-white/10 bg-white/[0.015] transition-colors open:border-white/15"
          >
            <summary className="flex cursor-pointer list-none items-start gap-6 p-6 md:p-8 [&::-webkit-details-marker]:hidden">
              {header}
              <ChevronDown
                size={20}
                aria-hidden="true"
                className="mt-1 shrink-0 text-white/40 transition-transform duration-300 group-open:rotate-180 md:mt-10"
              />
            </summary>

            <div className="px-6 pb-2 md:px-8">
              <ArticleList entries={phaseEntries} className="" />
            </div>
          </details>
        );
      })}
    </div>
  );
}
