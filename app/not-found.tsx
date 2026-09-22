"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Compass } from "lucide-react";
import { motion } from "motion/react";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-[#080808] px-5 text-white md:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:70px_70px]" />
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-orange-500/10 blur-[140px]" />
      </div>

      <motion.div
        className="mx-auto w-full max-w-5xl"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.12,
            },
          },
        }}
      >
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.85fr] lg:gap-20">
          <div className="max-w-2xl">
          <motion.p
            className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-orange-300"
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <motion.span
              className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.8)]"
              animate={{ scale: [1, 1.35, 1], opacity: [0.65, 1, 0.65] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            404 / Page not found
          </motion.p>

          <motion.h1
            className="mt-8 text-[clamp(3.75rem,16vw,10rem)] font-semibold leading-[0.82] tracking-[-0.06em] text-white"
            variants={{
              hidden: { opacity: 0, y: 28 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <span className="block">Signal</span>
            <span className="block whitespace-nowrap text-white/35">
              lost.
            </span>
          </motion.h1>

          <motion.p
            className="mt-8 max-w-md text-base leading-7 text-white/50 md:text-lg"
            variants={{
              hidden: { opacity: 0, y: 18 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            This page does not exist or the lesson has moved. Return to the
            portfolio and continue exploring.
          </motion.p>

          <motion.div
            className="flex items-center gap-5"
            variants={{
              hidden: { opacity: 0, y: 18 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <motion.div
              className="mt-9 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-orange-300/60"
              animate={{ rotate: [0, 18, -12, 0], y: [0, -5, 3, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            >
              <Compass size={21} />
            </motion.div>

            <Link
              href="/"
              className="group mt-9 inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-transform hover:-translate-y-0.5"
            >
              <ArrowLeft
                size={16}
                className="transition-transform group-hover:-translate-x-0.5"
              />
              Back home
              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </motion.div>
          </div>

          <motion.div
            className="relative mx-auto w-full max-w-xl lg:ml-auto lg:min-w-[360px]"
            initial={{ opacity: 0, x: 24, rotate: 2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative aspect-[1.23] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-2xl shadow-orange-950/20">
              <Image
                src="/images/lost-signal.svg"
                alt="A navigation display showing an offline signal and unknown coordinates"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 90vw, 520px"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-orange-400/5" />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}