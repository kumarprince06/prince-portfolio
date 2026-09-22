import { ArrowUpRight } from "lucide-react";
import Reveal from "./Reveal";
import { projects } from "@/data/projects";

export default function FeaturedProjects() {
  return (
    <section
      id="work"
      className="relative border-t border-white/10 px-5 py-28 md:px-8 md:py-36"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section heading */}
        <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-orange-300">
              Selected Work
            </p>
          </div>

          <div>
            <h2 className="max-w-4xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-white md:text-6xl">
              Building products,
              <br />
              <span className="text-white/35">
                not just writing code.
              </span>
            </h2>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/50 md:text-lg">
              I enjoy working on products where backend architecture,
              business logic, APIs and user experience have to work
              together as one system.
            </p>
          </div>
        </div>

        {/* Projects */}
        <div className="mt-20">
          {projects.map((project, index) => (
            <Reveal
              key={project.number}
              delay={index * 0.08}
              y={25}
            >
              <article
                className={`group relative border-t border-white/10 py-10 transition-all duration-500 hover:px-3 ${index === projects.length - 1 ? "border-b" : ""
                  }`}
              >
                <div className="grid gap-8 md:grid-cols-[80px_1fr_180px] lg:grid-cols-[100px_1fr_220px]">
                  {/* Number */}
                  <div>
                    <span className="text-xs tracking-[0.2em] text-white/25">
                      {project.number}
                    </span>
                  </div>

                  {/* Main content */}
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-3xl font-medium tracking-tight text-white transition-transform duration-300 group-hover:translate-x-2 md:text-4xl">
                        {project.title}
                      </h3>

                      {project.featured && (
                        <span className="rounded-full border border-orange-400/20 bg-orange-400/5 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-orange-300">
                          Featured
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/30">
                      {project.category}
                    </p>

                    <p className="mt-5 max-w-2xl text-sm leading-7 text-white/40 transition-colors duration-300 group-hover:text-white/55 md:text-base">
                      {project.description}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2">
                      {project.stack.map((technology) => (
                        <span
                          key={technology}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/40 transition-colors group-hover:border-white/20 group-hover:text-white/60"
                        >
                          {technology}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-start justify-start md:justify-end">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-white/40 transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:border-white/30 group-hover:bg-white group-hover:text-black group-hover:shadow-[0_10px_30px_rgba(255,255,255,0.08)]">
                      <ArrowUpRight size={19} />
                    </div>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {/* Bottom statement */}
        <div className="mt-12 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <p className="max-w-xl text-sm leading-6 text-white/30">
            More experiments, applications and engineering work are
            continuously being added.
          </p>

          <a
            href="https://github.com/kumarprince06"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex w-fit items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            View more on GitHub
            <ArrowUpRight
              size={15}
              className="transition-transform group-hover:translate-x-2 group-hover:-translate-y-1"
            />
          </a>
        </div>
      </div>
    </section>
  );
}