import type { Category, Lesson } from "./types";
import { javaLessons } from "./java";

// Add a lesson: create the file in its category folder and list it in that
// folder's index.ts. Empty categories stay hidden until they get a lesson.
export const categories: Category[] = [
  {
    slug: "java",
    title: "Java",
    description: "Core Java from the ground up — the language, the JVM and how programs run.",
    unit: "Lesson",
    lessons: javaLessons,
  },
  {
    slug: "dsa",
    title: "DSA",
    description: "Problems solved from brute force to optimal, with intuition, dry runs and complexity.",
    unit: "Problem",
    lessons: [],
  },
  {
    slug: "spring-boot",
    title: "Spring & Spring Boot",
    description: "Dependency injection, the bean lifecycle, Spring Boot, data access and security.",
    unit: "Lesson",
    lessons: [],
  },
  {
    slug: "system-design",
    title: "System Design",
    description: "Designing systems that scale — trade-offs, building blocks and case studies.",
    unit: "Lesson",
    lessons: [],
  },
  {
    slug: "mysql",
    title: "MySQL",
    description: "Queries, indexes, transactions, isolation levels and how the database works underneath.",
    unit: "Lesson",
    lessons: [],
  },
  {
    slug: "operating-systems",
    title: "Operating Systems",
    description: "Processes, threads, scheduling, memory management and concurrency.",
    unit: "Lesson",
    lessons: [],
  },
  {
    slug: "networking",
    title: "Computer Networks",
    description: "From the OSI model to TCP, HTTP, DNS and what happens when you open a URL.",
    unit: "Lesson",
    lessons: [],
  },
];

export interface LessonEntry {
  category: Category;
  lesson: Lesson;
  number: string;
  href: string;
}

export const publishedCategories = categories.filter(
  (category) => category.lessons.length > 0,
);

export function getEntries(category: Category): LessonEntry[] {
  return category.lessons.map((lesson, index) => ({
    category,
    lesson,
    number: String(index + 1).padStart(2, "0"),
    href: `/writing/${category.slug}/${lesson.slug}`,
  }));
}

export const allEntries = publishedCategories.flatMap(getEntries);

export function getCategory(slug: string) {
  return publishedCategories.find((category) => category.slug === slug);
}
