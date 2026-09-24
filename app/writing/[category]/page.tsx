import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ArticleList } from "@/components/WritingPreview";
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

          <ArticleList entries={getEntries(category)} />
        </div>
      </section>
    </main>
  );
}
