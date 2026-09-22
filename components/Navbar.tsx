"use client";

import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";

const navItems = [
  { label: "Work", href: "#work" },
  { label: "Engineering", href: "#engineering" },
  { label: "Journey", href: "#journey" },
  { label: "About", href: "#about" },
  { label: "Writing", href: "#writing" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed left-0 top-0 z-50 w-full">
      <nav className="mx-auto mt-4 flex max-w-7xl items-center justify-between rounded-full border border-white/[0.08] bg-black/70 px-5 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.25)] backdrop-blur-2xl md:px-7">        {/* Logo */}
        <a
          href="#"
          className="group flex items-center gap-3"
          onClick={() => setOpen(false)}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white text-sm font-bold text-black transition-all duration-300 group-hover:rotate-6 group-hover:scale-105">
            PK
          </span>

          <div className="hidden sm:block">
            <p className="text-sm font-semibold tracking-tight text-white">
              Prince Kumar
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
              Engineer · Builder
            </p>
          </div>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="relative text-sm text-white/50 transition-colors duration-300 hover:text-white"            >
              {item.label}
            </a>
          ))}

          <a
            href="#contact"
            className="group flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-all hover:bg-white/90"
          >
            Let&apos;s talk
            <ArrowUpRight
              size={15}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </a>
        </div>

        {/* Mobile menu */}
        <button
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {open && (
        <div className="mx-4 mt-2 rounded-3xl border border-white/10 bg-black/95 p-5 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </a>
            ))}

            <a
              href="#contact"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-xl bg-white px-4 py-3 text-center text-sm font-medium text-black"
            >
              Let&apos;s talk
            </a>
          </div>
        </div>
      )}
    </header>
  );
}