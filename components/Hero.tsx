"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import Reveal from "./Reveal";
import { social } from "@/data/social";

const headlineLines = [
    [{ text: "I build ", className: "text-white" }],
    [{ text: "Software", className: "text-white/35" }],
    [{ text: "and keep", className: "text-white" }],
    [{ text: "Exploring", className: "text-orange-300" }],
];

export default function Hero() {
    return (
        <section className="relative min-h-screen overflow-hidden px-5 pt-32 md:px-8 md:pt-40">
            {/* Background grid */}
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:70px_70px]" />

                <div className="absolute left-1/2 top-[20%] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-orange-500/10 blur-[140px]" />
            </div>

            <div className="mx-auto max-w-7xl">
                {/* Top metadata */}
                <div className="mb-10 flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-white/40">
                    <span className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.8)]" />
                    Available for interesting projects
                </div>

                <div className="grid items-center gap-14 lg:grid-cols-[1.25fr_0.75fr]">
                    {/* LEFT */}
                    <Reveal>
                        <div>
                            <p className="mb-6 text-sm font-medium text-orange-300">
                                Software Engineer · Builder · Explorer
                            </p>

                            <h1
                                className="max-w-5xl text-[clamp(3.4rem,8vw,8rem)] font-semibold leading-[0.86] tracking-[-0.075em] text-white md:leading-[0.84]"
                            >
                                {headlineLines.map((segments, lineIndex) => (
                                    <span key={lineIndex} className="block whitespace-nowrap">
                                        {segments.map((segment) => (
                                            <span key={segment.text} className={segment.className}>
                                                {segment.text.split("").map((character, characterIndex) => {
                                                    const index = headlineLines
                                                        .slice(0, lineIndex)
                                                        .flat()
                                                        .reduce((total, item) => total + item.text.length, 0) +
                                                        segments
                                                            .slice(0, segments.indexOf(segment))
                                                            .reduce((total, item) => total + item.text.length, 0) +
                                                        characterIndex;

                                                    return (
                                                        <motion.span
                                                            key={`${segment.text}-${characterIndex}`}
                                                            className={`inline-block ${character === " " ? "w-[0.28em]" : ""}`}
                                                            animate={{ opacity: [0, 1, 1, 0], y: [5, 0, 0, -3] }}
                                                            transition={{
                                                                duration: 4.2,
                                                                delay: index * 0.06,
                                                                repeat: Infinity,
                                                                ease: [0.4, 0, 0.2, 1],
                                                            }}
                                                        >
                                                            {character === " " ? "\u00a0" : character}
                                                        </motion.span>
                                                    );
                                                })}
                                            </span>
                                        ))}
                                        {lineIndex < headlineLines.length - 1 && <br />}
                                    </span>
                                ))}
                            </h1>

                            <p className="mt-8 max-w-2xl text-base leading-7 text-white/55 md:text-lg">
                                I&apos;m Prince Kumar Sharma, a software engineer focused on
                                backend systems, Java and Spring Boot. I build products,
                                explore how systems work, and document the journey along
                                the way.
                            </p>

                            <div className="mt-10 flex flex-wrap items-center gap-3">
                                <a
                                    href="#work"
                                    className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-transform hover:-translate-y-0.5"
                                >
                                    View work
                                    <ArrowUpRight
                                        size={16}
                                        className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                                    />
                                </a>
                                <a
                                    href="/resume.pdf"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-full border border-white/15 px-6 py-3 text-sm text-white/70 transition-colors hover:border-white/30 hover:text-white"
                                >
                                    Résumé
                                </a>
                                <a
                                    href={social.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-3 text-sm text-white/45 transition-colors hover:text-white"
                                >
                                    GitHub
                                </a>
                                <a
                                    href={social.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-3 text-sm text-white/45 transition-colors hover:text-white"
                                >
                                    LinkedIn
                                </a>
                            </div>
                        </div>
                    </Reveal>

                    {/* RIGHT — Portrait */}
                    <Reveal delay={0.15} y={40}>
                        <div className="relative mx-auto w-full max-w-md lg:ml-auto">
                            <div className="group/image relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03]">                                {/* Glow */}
                                <div className="absolute -left-20 top-20 h-48 w-48 rounded-full bg-orange-400/20 blur-[80px]" />

                                {/* Image */}
                                <Image
                                    src="/images/profile/prince.webp"
                                    alt="Prince Kumar Sharma"
                                    fill
                                    priority
                                    className="object-cover grayscale-[20%] transition-transform duration-700 ease-out group-hover/image:scale-[1.035] group-hover/image:grayscale-0"
                                    sizes="(max-width: 1024px) 90vw, 400px"
                                />

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

                                {/* Image metadata */}
                                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                                            Currently
                                        </p>
                                        <p className="mt-1 text-sm text-white">
                                            Building · Learning · Exploring
                                        </p>
                                    </div>

                                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 backdrop-blur-md">
                                        <ArrowUpRight size={16} className="text-white" />
                                    </div>
                                </div>
                            </div>

                            {/* Floating label */}
                            <div className="absolute -bottom-5 -left-5 rounded-2xl border border-white/10 bg-[#111]/90 px-4 py-3 shadow-2xl backdrop-blur-xl">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                                    Focus
                                </p>
                                <p className="mt-1 text-sm text-white">
                                    Backend Engineering
                                </p>
                            </div>
                        </div>
                    </Reveal>
                </div>

                {/* Bottom statement */}
                <div className="mt-24 grid border-t border-white/10 py-8 md:grid-cols-3">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/30">
                            Building with
                        </p>
                        <p className="mt-3 text-sm text-white/70">
                            Java · Spring Boot · PostgreSQL
                        </p>
                    </div>

                    <div className="mt-6 md:mt-0">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/30">
                            Interested in
                        </p>
                        <p className="mt-3 text-sm text-white/70">
                            Distributed Systems · Product Engineering
                        </p>
                    </div>

                    <div className="mt-6 md:mt-0 md:text-right">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/30">
                            Philosophy
                        </p>
                        <p className="mt-3 text-sm text-white/70">
                            Build. Explore. Evolve.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}