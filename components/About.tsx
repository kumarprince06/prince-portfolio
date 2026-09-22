import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import Reveal from "./Reveal";

const interests = [
  "Software Engineering",
  "Backend Systems",
  "Technology",
  "Photography",
  "Motorcycling",
  "Exploration",
  "Personal Growth",
];

export default function About() {
  return (
    <section
      id="about"
      className="relative border-t border-white/10 px-5 py-28 md:px-8 md:py-36"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-orange-300">
              About
            </p>
          </div>

          <div>
            <h2 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.05em] text-white md:text-6xl">
              More than
              <br />
              <span className="text-white/35">just software.</span>
            </h2>
          </div>
        </div>

        {/* Main content */}
        <div className="mt-20 grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          {/* Image */}
          <Reveal y={35}>
            <div className="relative mx-auto w-full max-w-lg lg:mx-0">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03]">
                <Image
                  src="/images/profile/prince.webp"
                  alt="Prince Kumar Sharma"
                  fill
                  className="object-cover grayscale-[15%]"
                  sizes="(max-width: 1024px) 90vw, 500px"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              </div>

              <div className="absolute -bottom-5 -right-5 rounded-2xl border border-white/10 bg-[#111]/90 px-5 py-4 backdrop-blur-xl">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">
                  Based in
                </p>

                <p className="mt-1 text-sm text-white/70">
                  Kolkata, India
                </p>
              </div>
            </div>
          </Reveal>

          {/* Text */}
          <Reveal delay={0.1}>
            <div className="lg:pt-4">
              <p className="max-w-3xl text-xl leading-relaxed tracking-tight text-white/65 md:text-3xl md:leading-relaxed">
                I&apos;m Prince — a software engineer who enjoys understanding
                how things work, building useful products and continuously
                pushing my technical depth further.
              </p>

              <div className="mt-10 max-w-2xl space-y-6 text-sm leading-7 text-white/40 md:text-base">
                <p>
                  My professional focus is backend engineering. I&apos;m
                  particularly interested in Java, Spring Boot, databases,
                  distributed systems and the architecture behind reliable
                  software.
                </p>

                <p>
                  But engineering is only one part of the journey. I also enjoy
                  exploring technology, documenting what I learn, taking
                  photographs, travelling and discovering new places on two
                  wheels.
                </p>

                <p>
                  The common thread is curiosity — understanding something
                  deeply, building with it and then moving on to discover what
                  comes next.
                </p>
              </div>

              {/* Interests */}
              <div className="mt-12 border-t border-white/10 pt-8">
                <p className="text-xs uppercase tracking-[0.2em] text-white/25">
                  Currently interested in
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/40 transition-colors hover:border-white/20 hover:text-white/70"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>

              {/* Resume */}
              <div className="mt-10">
                <a
                  href="/resume.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-transform hover:-translate-y-0.5"
                >
                  View résumé

                  <ArrowUpRight
                    size={16}
                    className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </a>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Philosophy */}
        <div className="mt-28 border-t border-white/10 pt-10 md:mt-36">
          <p className="text-xs uppercase tracking-[0.2em] text-white/20">
            Philosophy
          </p>

          <div className="mt-7 grid gap-8 md:grid-cols-3">
            <div>
              <p className="text-3xl font-medium tracking-tight text-white">
                Build.
              </p>

              <p className="mt-3 text-sm leading-6 text-white/35">
                Turn ideas into working products and systems.
              </p>
            </div>

            <div>
              <p className="text-3xl font-medium tracking-tight text-white">
                Explore.
              </p>

              <p className="mt-3 text-sm leading-6 text-white/35">
                Stay curious about technology, places and experiences.
              </p>
            </div>

            <div>
              <p className="text-3xl font-medium tracking-tight text-white">
                Evolve.
              </p>

              <p className="mt-3 text-sm leading-6 text-white/35">
                Keep learning, refining and becoming better at the craft.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}