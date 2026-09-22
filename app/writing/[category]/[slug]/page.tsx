import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { articles, type Article } from "@/data/writing";
import { javaLessons, type JavaLessonContent } from "@/content/writing/java";

type LessonPageProps = {
  params: Promise<{
    category: string;
    slug: string;
  }>;
};

function normalizeSegment(segment: string) {
  return segment
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getArticleHref(article: Article) {
  return `/writing/${normalizeSegment(article.category)}/${article.slug}`;
}

function loadLesson(article: Article): JavaLessonContent {
  const lesson = javaLessons[article.slug];

  if (!lesson) {
    notFound();
  }

  return lesson;
}

export function generateStaticParams() {
  return articles.map((article) => ({
    category: normalizeSegment(article.category),
    slug: article.slug,
  }));
}

export default async function WritingLessonPage({
  params,
}: LessonPageProps) {
  const { category, slug } = await params;
  const normalizedCategory = normalizeSegment(category);
  const normalizedSlug = normalizeSegment(slug);
  const article = articles.find(
    (candidate) =>
      normalizeSegment(candidate.category) === normalizedCategory &&
      normalizeSegment(candidate.slug) === normalizedSlug,
  );

  if (!article) {
    notFound();
  }

  const articleIndex = articles.indexOf(article);
  const previousArticle = articles[articleIndex - 1];
  const nextArticle = articles[articleIndex + 1];
  const lesson = loadLesson(article);

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-5xl px-5 py-6 md:px-8">
          <Link
            href="/#writing"
            className="group inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
          >
            <ArrowLeft
              size={15}
              className="transition-transform group-hover:-translate-x-1"
            />
            Back to writing
          </Link>
        </div>
      </header>

      {/* Article Header */}
      <section className="px-5 pb-16 pt-20 md:px-8 md:pb-20 md:pt-28">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-orange-300">
              {article.category}
            </span>

            <span className="text-white/20">/</span>

            <span className="text-xs uppercase tracking-[0.2em] text-white/30">
              Lesson {article.number}
            </span>
          </div>

          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.06em] md:text-7xl">
            {article.title}
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-7 text-white/45 md:text-lg">
            {article.description}
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/40"
              >
                {tag}
              </span>
            ))}
          </div>
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
          {previousArticle ? (
            <Link
              href={getArticleHref(previousArticle)}
              className="group flex flex-col gap-2 text-sm text-white/40 transition-colors hover:text-white"
            >
              <span className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-white/25">
                <ArrowLeft
                  size={15}
                  className="transition-transform group-hover:-translate-x-1"
                />
                Previous Lesson
              </span>
              <span className="text-base text-white/70">
                {previousArticle.title}
              </span>
              <span className="text-xs text-white/25">
                Lesson {previousArticle.number}
              </span>
            </Link>
          ) : (
            <div />
          )}

          {nextArticle ? (
            <Link
              href={getArticleHref(nextArticle)}
              className="group flex flex-col items-start gap-2 text-sm text-white/40 transition-colors hover:text-white sm:items-end sm:text-right"
            >
              <span className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-white/25">
                Next Lesson
                <ArrowUpRight
                  size={15}
                  className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
                />
              </span>
              <span className="text-base text-white/70">
                {nextArticle.title}
              </span>
              <span className="text-xs text-white/25">
                Lesson {nextArticle.number}
              </span>
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
