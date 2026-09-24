import {
  Boxes,
  Database,
  GitBranch,
  Layers3,
  LockKeyhole,
  Workflow,
} from "lucide-react";
import Reveal from "./Reveal";

const engineeringAreas = [
  {
    icon: Layers3,
    number: "01",
    title: "Backend Systems",
    description:
      "Designing APIs, business logic and service layers with a focus on maintainability, reliability and clean architecture.",
    technologies: "Java · Spring Boot · PHP · Laravel",
  },
  {
    icon: Database,
    number: "02",
    title: "Data & Persistence",
    description:
      "Working with relational databases, entity relationships, transactions, queries and persistence layers.",
    technologies: "PostgreSQL · MySQL · JPA · Hibernate · Flyway",
  },
  {
    icon: Workflow,
    number: "03",
    title: "Distributed Workflows",
    description:
      "Exploring asynchronous processing, event-driven architecture and the challenges of building systems that scale.",
    technologies: "Kafka · Redis · WebSockets · Outbox Pattern",
  },
  {
    icon: LockKeyhole,
    number: "04",
    title: "Security & APIs",
    description:
      "Building authenticated and authorized applications with secure API boundaries and role-based access control.",
    technologies: "Spring Security · JWT · RBAC · REST APIs",
  },
  {
    icon: Boxes,
    number: "05",
    title: "Infrastructure",
    description:
      "Containerizing applications and understanding the infrastructure required to develop, deploy and operate modern systems.",
    technologies: "Docker · Linux · AWS · Azure",
  },
  {
    icon: GitBranch,
    number: "06",
    title: "Engineering Workflow",
    description:
      "Using version control, automation and testing to make software development more consistent and dependable.",
    technologies: "Git · GitHub Actions · JUnit 5 · Mockito",
  },
];

export default function Engineering() {
  return (
    <section
      id="engineering"
      className="relative border-t border-white/10 px-5 py-28 md:px-8 md:py-36"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-orange-300">
              How I Think
            </p>
          </div>

          <div>
            <h2 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.05em] text-white md:text-6xl">
              Engineering is more than
              <br />
              <span className="text-white/35">
                making things work.
              </span>
            </h2>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/50 md:text-lg">
              I&apos;m interested in what happens underneath the interface:
              how services communicate, how data moves through a system,
              how failures are handled and how software evolves over time.
            </p>
          </div>
        </div>

        {/* Engineering grid */}
        <div className="mt-20 grid border-l border-t border-white/10 md:grid-cols-2 lg:grid-cols-3">
          {engineeringAreas.map((area, index) => {
            const Icon = area.icon;

            return (
              <Reveal
                key={area.number}
                delay={index * 0.07}
                y={25}
                className="h-full"
              >
                <article
                  className="group relative flex h-full flex-col border-b border-r border-white/10 p-7 transition-all duration-500 hover:-translate-y-1 hover:bg-white/[0.025] hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)] md:p-9"                >
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/50 transition-all duration-300 group-hover:border-orange-300/30 group-hover:bg-orange-300/5 group-hover:text-orange-300">
                      <Icon size={19} strokeWidth={1.5} />
                    </div>

                    <span className="text-[10px] tracking-[0.2em] text-white/20">
                      {area.number}
                    </span>
                  </div>

                  {/* Content */}
                  <h3 className="mt-10 text-xl font-medium tracking-tight text-white">
                    {area.title}
                  </h3>

                  <p className="mb-7 mt-4 text-sm leading-6 text-white/40">
                    {area.description}
                  </p>

                  {/* Technologies */}
                  <p className="mt-auto min-h-15 border-t border-white/10 pt-5 text-[11px] uppercase leading-5 tracking-[0.12em] text-white/25">
                    {area.technologies}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>

        {/* Architecture statement */}
        <div className="mt-20 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025]">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
            <div className="border-b border-white/10 p-8 md:p-12 lg:border-b-0 lg:border-r">
              <p className="text-xs uppercase tracking-[0.25em] text-white/25">
                Architecture
              </p>

              <h3 className="mt-6 text-3xl font-medium leading-tight tracking-[-0.04em] text-white md:text-4xl">
                Think in
                <br />
                systems.
              </h3>

              <p className="mt-6 max-w-md text-sm leading-6 text-white/40">
                From request to database and back again, I like
                understanding the complete path a piece of data takes
                through an application.
              </p>
            </div>

            <div className="relative min-h-[320px] p-8 md:p-12">
              {/* Connection lines */}
              <div className="absolute left-[15%] right-[15%] top-1/2 h-px bg-white/10" />

              <div className="absolute bottom-[25%] left-1/2 top-[25%] w-px bg-white/10" />

              {/* Nodes */}
              <div className="absolute left-[8%] top-1/2 -translate-y-1/2">
                <ArchitectureNode label="Client" />
              </div>

              <div className="absolute left-1/2 top-[22%] -translate-x-1/2">
                <ArchitectureNode label="API" />
              </div>

              <div className="absolute right-[8%] top-1/2 -translate-y-1/2">
                <ArchitectureNode label="Database" />
              </div>

              <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2">
                <ArchitectureNode label="Services" />
              </div>

              <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 animate-pulse items-center justify-center rounded-2xl border border-orange-300/30 bg-orange-300/5 shadow-[0_0_40px_rgba(251,146,60,0.08)]">
                <span className="text-xs font-medium text-orange-200">
                  CORE
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArchitectureNode({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-[#0d0d0d] px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-white/40">
      {label}
    </div>
  );
}