import type { Category, Lesson, Phase } from "./types";
import { backendProjectPhases } from "./backend-projects";
import { collectionsPhases } from "./collections";
import { interviewPhases } from "./interview-questions";
import { javaPhases } from "./java";
import { java8Phases } from "./java-8";
import * as roadmap from "./roadmap";
import { systemDesignPhases } from "./system-design";

// A track is a category split into phases. Its lessons are numbered straight through the phases,
// and a phase with no lessons yet shows as "Coming soon".
const track = (
  category: Omit<Category, "lessons" | "phases">,
  phases: Phase[],
): Category => ({
  ...category,
  phases,
  lessons: phases.flatMap((phase) => phase.lessons),
});

// The learning path, in study order: finish one step, then move to the next.
// Tracks marked `alongside` are studied in parallel and are not numbered steps.
// Add a lesson: create the file in its track's folder and list it in that phase.
export const categories: Category[] = [
  track(
    { slug: "java", title: "Java", unit: "Lesson", description: "Core Java from the ground up — the language, the JVM and how programs run." },
    javaPhases,
  ),
  track(
    { slug: "collections", title: "Collections Framework", unit: "Lesson", description: "Lists, sets, maps and queues, how they work inside, and how to pick the right one." },
    collectionsPhases,
  ),
  track(
    { slug: "java-8", title: "Java 8 Features", unit: "Lesson", description: "Lambdas, functional interfaces, streams, collectors, Optional, java.time and CompletableFuture, with internals, production examples and practice." },
    java8Phases,
  ),
  track(
    { slug: "multithreading", title: "Multithreading and Concurrency", unit: "Lesson", description: "Threads, locks, the memory model, thread pools, ConcurrentHashMap, BlockingQueue, virtual threads and concurrency across servers." },
    roadmap.concurrencyPhases,
  ),
  track(
    { slug: "mysql", title: "MySQL", unit: "Lesson", description: "Queries, indexes, transactions, isolation levels and how the database works underneath." },
    roadmap.mysqlPhases,
  ),
  track(
    { slug: "postgresql", title: "PostgreSQL", unit: "Lesson", description: "Postgres data types, indexes, MVCC and VACUUM, locking with SKIP LOCKED, query plans, partitioning and using it from Spring Boot." },
    roadmap.postgresqlPhases,
  ),
  track(
    { slug: "design-patterns", title: "Design Patterns", unit: "Lesson", description: "The classic patterns and the backend ones, with where Spring already uses them." },
    roadmap.designPatternPhases,
  ),
  track(
    { slug: "spring", title: "Spring Framework", unit: "Lesson", description: "IoC, dependency injection, beans, configuration, AOP, events and transactions — the core under Spring Boot." },
    roadmap.springPhases,
  ),
  track(
    { slug: "spring-boot", title: "Spring Boot", unit: "Lesson", description: "Auto-configuration, REST APIs, validation, scheduling, caching, Actuator and packaging." },
    roadmap.springBootPhases,
  ),
  track(
    { slug: "spring-data-jpa", title: "Spring Data JPA and Hibernate", unit: "Lesson", description: "Entities, relationships, the persistence context, queries, the N+1 problem, locking and performance." },
    roadmap.springDataJpaPhases,
  ),
  track(
    { slug: "spring-security", title: "Spring Security", unit: "Lesson", description: "The filter chain, passwords, JWT with refresh tokens, OAuth2, authorisation and testing security." },
    roadmap.springSecurityPhases,
  ),
  track(
    { slug: "rest-api-design", title: "REST API Design", unit: "Lesson", description: "Resources, status codes, errors, pagination, idempotency, versioning, rate limiting and webhooks." },
    roadmap.restApiDesignPhases,
  ),
  track(
    { slug: "testing", title: "Testing", unit: "Lesson", description: "JUnit 5, Mockito, Spring Boot test slices, Testcontainers, testing concurrency and load testing." },
    roadmap.testingPhases,
  ),
  track(
    { slug: "redis", title: "Redis and Caching", unit: "Lesson", description: "Data types, caching patterns, distributed locks, rate limiting, geo search and running Redis." },
    roadmap.redisPhases,
  ),
  track(
    { slug: "kafka-rabbitmq", title: "Kafka and RabbitMQ", unit: "Lesson", description: "Messaging basics, RabbitMQ exchanges and queues, Kafka partitions and internals, and when to use which." },
    roadmap.messagingPhases,
  ),
  track(
    { slug: "microservices", title: "Microservices", unit: "Lesson", description: "When to split, how services talk, resilience, sagas and the outbox, and observability." },
    roadmap.microservicesPhases,
  ),
  track(
    { slug: "devops-aws", title: "Docker, CI/CD and AWS", unit: "Lesson", description: "Linux, Docker, Compose, GitHub Actions, the core AWS services and deploying Spring Boot." },
    roadmap.devopsPhases,
  ),
  track(
    { slug: "system-design", title: "System Design (LLD and HLD)", unit: "Lesson", description: "Backend design fundamentals first, then low-level design (classes for real problems) and high-level design (building blocks, scaling and case studies)." },
    systemDesignPhases,
  ),
  track(
    { slug: "dsa", title: "DSA", unit: "Problem", alongside: true, description: "Problems solved from brute force to optimal, with intuition, dry runs and complexity. One or two a day, alongside every step." },
    roadmap.dsaPhases,
  ),
  track(
    { slug: "operating-systems", title: "Operating Systems", unit: "Lesson", alongside: true, description: "Processes, threads, scheduling, memory management and concurrency." },
    roadmap.operatingSystemsPhases,
  ),
  track(
    { slug: "networking", title: "Computer Networks", unit: "Lesson", alongside: true, description: "From the OSI model to TCP, HTTP, DNS and what happens when you open a URL." },
    roadmap.networkingPhases,
  ),
  track(
    { slug: "interview-questions", title: "Interview Questions", unit: "Set", alongside: true, description: "Questions with answers for every track, to revise right after finishing it." },
    interviewPhases,
  ),
  track(
    { slug: "backend-projects", title: "Backend Projects", unit: "Project", alongside: true, description: "Ten projects with full PRDs, from a simple REST API to microservices, to build while learning." },
    backendProjectPhases,
  ),
];

export interface LessonEntry {
  category: Category;
  lesson: Lesson;
  number: string;
  href: string;
  phase?: { number: string; title: string };
}

const pad = (n: number) => String(n).padStart(2, "0");

// A track is listed once it has a lesson or a planned phase; its empty phases show as "Coming soon".
export const publishedCategories = categories.filter(
  (category) => category.lessons.length > 0 || (category.phases?.length ?? 0) > 0,
);

export const pathCategories = publishedCategories.filter((category) => !category.alongside);
export const alongsideCategories = publishedCategories.filter((category) => category.alongside);

// "Step 03" for the main path; none for tracks studied alongside it.
export function getStep(category: Category) {
  const index = pathCategories.indexOf(category);
  return index === -1 ? undefined : pad(index + 1);
}

// The next step after this one on the main path.
export function getNextCategory(category: Category) {
  const index = pathCategories.indexOf(category);
  return index === -1 ? undefined : pathCategories[index + 1];
}

// The step before this one on the main path.
export function getPreviousCategory(category: Category) {
  const index = pathCategories.indexOf(category);
  return index > 0 ? pathCategories[index - 1] : undefined;
}

export function getEntries(category: Category): LessonEntry[] {
  const phaseOf = new Map(
    (category.phases ?? []).flatMap((phase, index) =>
      phase.lessons.map((lesson) => [lesson, { number: pad(index + 1), title: phase.title }] as const),
    ),
  );

  return category.lessons.map((lesson, index) => ({
    category,
    lesson,
    number: pad(index + 1),
    href: `/writing/${category.slug}/${lesson.slug}`,
    phase: phaseOf.get(lesson),
  }));
}

export const allEntries = publishedCategories.flatMap(getEntries);

export function getCategory(slug: string) {
  return publishedCategories.find((category) => category.slug === slug);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-07-17" -> "17 Jul 2026"
export function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
