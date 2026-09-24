import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import LessonBlocks from "@/components/LessonBlocks";
import ReadingProgress from "@/components/ReadingProgress";
import {
  getCategory,
  getEntries,
  publishedCategories,
} from "@/content/writing";

type LessonPageProps = {
  params: Promise<{
    category: string;
    slug: string;
  }>;
};

async function findEntry(params: LessonPageProps["params"]) {
  const { category: categorySlug, slug } = await params;
  const category = getCategory(categorySlug);
  const entries = category ? getEntries(category) : [];
  const index = entries.findIndex((entry) => entry.lesson.slug === slug);

  return {
    entry: entries[index],
    previousEntry: entries[index - 1],
    nextEntry: index === -1 ? undefined : entries[index + 1],
  };
}

export function generateStaticParams() {
  return publishedCategories.flatMap((category) =>
    category.lessons.map((lesson) => ({
      category: category.slug,
      slug: lesson.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: LessonPageProps): Promise<Metadata> {
  const { entry } = await findEntry(params);

  return entry
    ? {
        title: `${entry.lesson.title} — Prince Kumar Sharma`,
        description: entry.lesson.description,
      }
    : {};
}

export default async function WritingLessonPage({
  params,
}: LessonPageProps) {
  const { entry, previousEntry, nextEntry } = await findEntry(params);

  if (!entry) {
    notFound();
  }

  const { category, lesson, number } = entry;
  const sections = lesson.sections.map((section, index) => ({
    ...section,
    number: String(index + 1).padStart(2, "0"),
  }));

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <ReadingProgress />

      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
          <Link
            href={`/writing/${category.slug}`}
            className="group inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
          >
            <ArrowLeft
              size={15}
              className="transition-transform group-hover:-translate-x-1"
            />
            All {category.title}
          </Link>
        </div>
      </header>

      {/* Article Header */}
      <section className="px-5 pb-16 pt-20 md:px-8 md:pb-20 md:pt-28">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-orange-300">
              {category.title}
            </span>

            <span className="text-white/20">/</span>

            <span className="text-xs uppercase tracking-[0.2em] text-white/30">
              {category.unit} {number}
            </span>

            {lesson.difficulty && (
              <>
                <span className="text-white/20">/</span>
                <span className="text-xs uppercase tracking-[0.2em] text-white/50">
                  {lesson.difficulty}
                </span>
              </>
            )}
          </div>

          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.06em] md:text-7xl">
            {lesson.title}
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-7 text-white/45 md:text-lg">
            {lesson.description}
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {lesson.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/40"
              >
                {tag}
              </span>
            ))}
          </div>

          {lesson.problemUrl && (
            <a
              href={lesson.problemUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-8 inline-flex items-center gap-2 text-sm text-orange-300 transition-colors hover:text-orange-200"
            >
              Solve the problem
              <ArrowUpRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
          )}
        </div>
      </section>

      {/* Lesson Content */}
      <section className="border-t border-white/10 px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-14 lg:grid-cols-[180px_1fr]">
            {/* Table of Contents */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">
                  Contents
                </p>

                <nav className="mt-5 space-y-3">
                  {sections.map((section) => (
                    <a
                      key={section.number}
                      href={`#section-${section.number}`}
                      className="block text-xs leading-5 text-white/30 transition-colors hover:text-white"
                    >
                      {section.number}. {section.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <article className="min-w-0">
              <div className="space-y-16">
                {sections.map((section) => (
                  <section
                    key={section.number}
                    id={`section-${section.number}`}
                    className="scroll-mt-24"
                  >
                    <div className="flex items-start gap-5">
                      <span className="pt-1 text-xs tracking-[0.2em] text-orange-300/60">
                        {section.number}
                      </span>

                      <div className="min-w-0 flex-1">
                        <h2 className="text-2xl font-medium tracking-tight text-white md:text-3xl">
                          {section.title}
                        </h2>

                        <LessonBlocks blocks={section.blocks} />
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Bottom Navigation */}
      <section className="border-t border-white/10 px-5 py-16 md:px-8">
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
          {previousEntry ? (
            <Link
              href={previousEntry.href}
              className="group flex flex-col gap-2 text-sm text-white/40 transition-colors hover:text-white"
            >
              <span className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-white/25">
                <ArrowLeft
                  size={15}
                  className="transition-transform group-hover:-translate-x-1"
                />
                Previous
              </span>
              <span className="text-base text-white/70">
                {previousEntry.lesson.title}
              </span>
              <span className="text-xs text-white/25">
                {category.unit} {previousEntry.number}
              </span>
            </Link>
          ) : (
            <div />
          )}

          {nextEntry ? (
            <Link
              href={nextEntry.href}
              className="group flex flex-col items-start gap-2 text-sm text-white/40 transition-colors hover:text-white sm:items-end sm:text-right"
            >
              <span className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-white/25">
                Next
                <ArrowUpRight
                  size={15}
                  className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
                />
              </span>
              <span className="text-base text-white/70">
                {nextEntry.lesson.title}
              </span>
              <span className="text-xs text-white/25">
                {category.unit} {nextEntry.number}
              </span>
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
