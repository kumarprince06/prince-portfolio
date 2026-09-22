import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Reveal from "./Reveal";
import { articles } from "@/data/writing";

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
        <div className="mt-20">
          {articles.map((article, index) => {
            const categorySlug = article.category
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "");
            const articleHref = `/writing/${categorySlug}/${article.slug}`;

            return (
              <Reveal
                key={article.number}
                delay={index * 0.08}
                y={20}
              >
                <article
                  className="group border-t border-white/10 py-9 last:border-b"
                >
                  <div className="grid gap-7 md:grid-cols-[70px_1fr_1.2fr_50px] md:items-center">
                    {/* Number */}
                    <span className="text-xs tracking-[0.2em] text-white/20">
                      {article.number}
                    </span>

                    {/* Category */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/35 transition-colors group-hover:border-orange-300/30 group-hover:text-orange-300">
                        {article.number}
                      </div>

                      <span className="text-xs uppercase tracking-[0.15em] text-white/30">
                        {article.category}
                      </span>
                    </div>

                    {/* Article */}
                    <div>
                      <Link
                        href={articleHref}
                        className="text-xl font-medium tracking-tight text-white transition-transform duration-300 group-hover:translate-x-1 md:text-2xl"
                      >
                        {article.title}
                      </Link>

                      <p className="mt-3 max-w-xl text-sm leading-6 text-white/35">
                        {article.description}
                      </p>
                    </div>

                    {/* Arrow */}
                    <div className="hidden md:block">
                      <Link
                        href={articleHref}
                        aria-label={`Read ${article.title}`}
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

        {/* Blog CTA */}
        <div className="mt-12 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-[0.15em] text-white/20">
            More notes coming soon
          </p>

          <button
            type="button"
            className="group flex w-fit items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm text-white/50 transition-all hover:border-white/25 hover:text-white"
          >
            Explore all writing
            <ArrowUpRight
              size={15}
              className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </button>
        </div>
      </div>
    </section>
  );
}