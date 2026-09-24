import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
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

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-5xl px-5 py-6 md:px-8">
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
                  {lesson.sections.map((section) => (
                    <a
                      key={section.number}
                      href={`#section-${section.number}`}
                      className="block text-xs text-white/30 transition-colors hover:text-white"
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
                {lesson.sections.map((section) => (
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

                        {section.paragraphs && (
                          <div className="mt-6 space-y-5">
                            {section.paragraphs.map((paragraph, index) => (
                              <p
                                key={index}
                                className="text-[15px] leading-8 text-white/50 md:text-base"
                              >
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        )}

                        {section.visual && (
                          <figure className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#050505]">
                            <Image
                              src={section.visual.src}
                              alt={section.visual.alt}
                              width={1200}
                              height={620}
                              className="h-auto w-full"
                            />
                            <figcaption className="border-t border-white/10 px-5 py-4 text-sm leading-6 text-white/45">
                              {section.visual.caption}
                            </figcaption>
                          </figure>
                        )}

                        {section.examples && section.examples.length > 0 && (
                          <div className="mt-7 space-y-5">
                            {section.examples.map((example) => (
                              <div
                                key={example.title}
                                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                              >
                                <h3 className="text-base font-medium text-white">
                                  {example.title}
                                </h3>
                                <p className="mt-3 text-sm leading-7 text-white/50">
                                  {example.explanation}
                                </p>

                                {example.code && (
                                  <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#050505]">
                                    <div className="border-b border-white/10 px-5 py-3">
                                      <span className="text-[10px] uppercase tracking-[0.2em] text-white/25">
                                        {example.code.language}
                                      </span>
                                    </div>
                                    <pre className="overflow-x-auto p-5 text-sm leading-7 text-white/60">
                                      <code>{example.code.code}</code>
                                    </pre>
                                  </div>
                                )}

                                {example.output && (
                                  <div className="mt-5 border-l border-orange-300/50 pl-4">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300/70">
                                      Output
                                    </p>
                                    <pre className="mt-2 overflow-x-auto text-sm leading-7 text-white/50">
                                      <code>{example.output}</code>
                                    </pre>
                                  </div>
                                )}

                                {example.dryRun && example.dryRun.length > 0 && (
                                  <div className="mt-5">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300/70">
                                      Dry Run
                                    </p>
                                    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-white/50">
                                      {example.dryRun.map((step) => (
                                        <li key={step}>{step}</li>
                                      ))}
                                    </ol>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {section.keyPoints &&
                          section.keyPoints.length > 0 && (
                            <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300/70">
                                Key Points
                              </p>

                              <ul className="mt-4 space-y-3">
                                {section.keyPoints.map((point) => (
                                  <li
                                    key={point}
                                    className="flex gap-3 text-sm leading-6 text-white/50"
                                  >
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-300/70" />
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {section.importantPoints &&
                          section.importantPoints.length > 0 && (
                            <div className="mt-7 rounded-2xl border border-orange-300/20 bg-orange-300/[0.03] p-6">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300/70">
                                Important Points
                              </p>
                              <ul className="mt-4 space-y-3 text-sm leading-6 text-white/50">
                                {section.importantPoints.map((point) => (
                                  <li key={point} className="flex gap-3">
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-300/70" />
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {section.commonMistakes &&
                          section.commonMistakes.length > 0 && (
                            <div className="mt-7">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                                Common Mistakes
                              </p>
                              <ul className="mt-4 space-y-3 text-sm leading-6 text-white/50">
                                {section.commonMistakes.map((mistake) => (
                                  <li key={mistake} className="flex gap-3">
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
                                    <span>{mistake}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {section.interviewQuestions &&
                          section.interviewQuestions.length > 0 && (
                            <div className="mt-7 space-y-4">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300/70">
                                Interview Questions
                              </p>
                              {section.interviewQuestions.map((item) => (
                                <div
                                  key={item.question}
                                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
                                >
                                  <p className="text-sm font-medium leading-6 text-white/75">
                                    Q. {item.question}
                                  </p>
                                  <p className="mt-3 text-sm leading-7 text-white/50">
                                    {item.answer}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                        {section.code && (
                          <div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-[#050505]">
                            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                              <span className="text-[10px] uppercase tracking-[0.2em] text-white/25">
                                {section.code.language}
                              </span>

                              <span className="text-[10px] uppercase tracking-[0.15em] text-white/20">
                                Example
                              </span>
                            </div>

                            <pre className="overflow-x-auto p-5 text-sm leading-7 text-white/60">
                              <code>{section.code.code}</code>
                            </pre>
                          </div>
                        )}

                        {section.output && (
                          <div className="mt-7 border-l border-orange-300/50 pl-4">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300/70">
                              Output
                            </p>
                            <pre className="mt-2 overflow-x-auto text-sm leading-7 text-white/50">
                              <code>{section.output}</code>
                            </pre>
                          </div>
                        )}

                        {section.dryRun && section.dryRun.length > 0 && (
                          <div className="mt-7">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300/70">
                              Dry Run
                            </p>
                            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-white/50">
                              {section.dryRun.map((step) => (
                                <li key={step}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {section.complexity && (
                          <div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
                            {[
                              ["Time", section.complexity.time],
                              ["Space", section.complexity.space],
                            ].map(([label, value]) => (
                              <div key={label} className="bg-[#080808] p-5">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300/70">
                                  {label} Complexity
                                </p>
                                <p className="mt-2 font-mono text-sm text-white/70">
                                  {value}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {section.practiceQuestions &&
                          section.practiceQuestions.length > 0 && (
                            <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300/70">
                                Practice Questions
                              </p>
                              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-white/50">
                                {section.practiceQuestions.map((question) => (
                                  <li key={question}>{question}</li>
                                ))}
                              </ol>
                            </div>
                          )}
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
