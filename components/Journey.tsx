import Reveal from "./Reveal";
import { journey } from "@/data/experience";

export default function Journey() {
  return (
    <section
      id="journey"
      className="relative border-t border-white/10 px-5 py-28 md:px-8 md:py-36"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-orange-300">
              The Journey
            </p>
          </div>

          <div>
            <h2 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.05em] text-white md:text-6xl">
              Still becoming
              <br />
              <span className="text-white/35">the engineer I want to be.</span>
            </h2>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/50 md:text-lg">
              Every role, project and experiment has added another layer to
              how I understand software and the problems worth solving.
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative mt-20">
          {/* Vertical line */}
          <div className="absolute bottom-0 left-[7px] top-0 w-px bg-white/10 md:left-1/2 md:-translate-x-1/2" />

          <div className="space-y-16 md:space-y-24">
            {journey.map((item, index) => (
              <Reveal
                key={`${item.year}-${item.role}`}
                delay={index * 0.1}
                y={30}
              >
                <article
                  className="relative grid gap-8 pl-10 md:grid-cols-2 md:gap-16 md:pl-0"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1 flex h-[15px] w-[15px] items-center justify-center rounded-full border border-orange-300/50 bg-[#080808] shadow-[0_0_20px_rgba(251,146,60,0.08)] md:left-1/2 md:-translate-x-1/2">                    <div className="absolute inset-[4px] rounded-full bg-orange-300" />
                  </div>

                  {/* Left side */}
                  <div
                    className={`${index % 2 === 0
                      ? "md:pr-16"
                      : "md:order-2 md:pl-16"
                      }`}
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-orange-300/70">
                      {item.year}
                    </p>

                    <h3 className="mt-4 text-2xl font-medium tracking-tight text-white md:text-3xl">
                      {item.role}
                    </h3>

                    <p className="mt-2 text-sm text-white/35">
                      {item.company}
                    </p>
                  </div>

                  {/* Right side */}
                  <div
                    className={`${index % 2 === 0
                      ? "md:pl-16"
                      : "md:order-1 md:pr-16"
                      }`}
                  >
                    <p className="text-sm leading-7 text-white/45 md:text-base">
                      {item.description}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-white/30"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="mt-28 border-t border-white/10 pt-10 md:mt-36">
          <p className="max-w-4xl text-2xl font-light leading-relaxed tracking-tight text-white/60 md:text-4xl">
            &ldquo;The goal isn&apos;t to know everything.
            <span className="text-white">
              {" "}
              It&apos;s to keep getting better at understanding the systems
              behind what we build.
            </span>
            &rdquo;
          </p>
        </div>
      </div>
    </section>
  );
}