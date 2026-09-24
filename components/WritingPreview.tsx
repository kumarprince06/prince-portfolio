import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Reveal from "./Reveal";
import { Inline } from "./LessonBlocks";
import { allEntries, formatDate, type LessonEntry } from "@/content/writing";

const PREVIEW_COUNT = 4;

export default function WritingPreview() {
  return (
    <section
      id="writing"
      className="relative border-t border-white/10 px-5 py-28 md:px-8 md:py-36"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-orange-300">
              Writing & Notes
            </p>

            <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.05em] text-white md:text-6xl">
              Things I&apos;m
              <br />
              <span className="text-white/35">figuring out.</span>
            </h2>
          </div>

          <p className="max-w-sm text-sm leading-6 text-white/35 md:text-right">
            Technical notes, engineering ideas, experiments and lessons
            collected while building and learning.
          </p>
        </div>

        {/* Articles */}
        <ArticleList entries={allEntries.slice(0, PREVIEW_COUNT)} />

        {/* Blog CTA */}
        <div className="mt-12 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-[0.15em] text-white/20">
            {allEntries.length} notes so far
          </p>

          <Link
            href="/writing"
            className="group flex w-fit items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm text-white/50 transition-all hover:border-white/25 hover:text-white"
          >
            View all writing
            <ArrowUpRight
              size={15}
              className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ArticleList({
  entries,
  className = "mt-20",
}: {
  entries: LessonEntry[];
  className?: string;
}) {
  return (
    <div className={className}>
      {entries.map(({ category, lesson, number, href }, index) => {
        return (
          <Reveal key={href} delay={index * 0.08} y={20}>
            <article className="group border-t border-white/10 py-9 last:border-b">
              <div className="grid gap-7 md:grid-cols-[1fr_1.2fr_50px] md:items-center">
                {/* Category */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/35 transition-colors group-hover:border-orange-300/30 group-hover:text-orange-300">
                    {number}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-[0.15em] text-white/30">
                      {category.title}
                    </span>
                    <time dateTime={lesson.date} className="text-xs text-white/25">
                      {formatDate(lesson.date)}
                    </time>
                  </div>
                </div>

                {/* Article */}
                <div>
                  <Link
                    href={href}
                    className="text-xl font-medium tracking-tight text-white transition-transform duration-300 group-hover:translate-x-1 md:text-2xl"
                  >
                    {lesson.title}
                  </Link>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/35">
                    <Inline text={lesson.description} />
                  </p>
                </div>

                {/* Arrow */}
                <div className="hidden md:block">
                  <Link
                    href={href}
                    aria-label={`Read ${lesson.title}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/30 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/30 group-hover:bg-white group-hover:text-black"
                  >
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </div>
            </article>
          </Reveal>
        );
      })}
    </div>
  );
}
