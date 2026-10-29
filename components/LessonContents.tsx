"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type ContentsSection = { number: string; title: string };

// The section counts as "being read" once its heading passes this line.
const READING_LINE = 140;

function useActiveSection(sections: ContentsSection[]) {
  const [active, setActive] = useState(sections[0]?.number);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      let current = sections[0]?.number;
      for (const section of sections) {
        const element = document.getElementById(`section-${section.number}`);
        if (element && element.getBoundingClientRect().top <= READING_LINE) {
          current = section.number;
        }
      }
      // At the very bottom, the last short section can never reach the line.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = sections[sections.length - 1]?.number;
      }
      setActive(current);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [sections]);

  return active;
}

// Desktop: the sticky contents list, with the section being read highlighted.
export function LessonContents({ sections }: { sections: ContentsSection[] }) {
  const active = useActiveSection(sections);
  const navRef = useRef<HTMLElement>(null);

  // Keep the highlighted item visible when the list is taller than the screen.
  useEffect(() => {
    const link = navRef.current?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    link?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <div className="sticky top-24">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">Contents</p>

      <nav
        ref={navRef}
        aria-label="Lesson contents"
        className="mt-5 max-h-[calc(100vh-10rem)] space-y-1 overflow-y-auto pr-1"
      >
        {sections.map((section) => {
          const isActive = section.number === active;
          return (
            <a
              key={section.number}
              data-section={section.number}
              href={`#section-${section.number}`}
              aria-current={isActive ? "location" : undefined}
              className={`block border-l-2 py-1 pl-3 text-xs leading-5 transition-colors ${
                isActive
                  ? "border-orange-300 text-orange-300"
                  : "border-transparent text-white/30 hover:text-white"
              }`}
            >
              {section.number}. {section.title}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

// Mobile: a slim sticky bar naming the section being read; tap to jump elsewhere.
export function LessonContentsMobile({ sections }: { sections: ContentsSection[] }) {
  const active = useActiveSection(sections);
  const [open, setOpen] = useState(false);
  const current = sections.find((section) => section.number === active) ?? sections[0];

  if (!current) return null;

  return (
    <div className="sticky top-0 z-40 -mx-5 mb-10 border-b border-white/10 bg-[#080808]/95 px-5 backdrop-blur lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-3 text-left"
      >
        <span className="min-w-0 truncate text-xs text-white/70">
          <span className="text-orange-300">
            {current.number} / {sections.length.toString().padStart(2, "0")}
          </span>
          <span className="mx-2 text-white/20">·</span>
          {current.title}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <nav aria-label="Lesson contents" className="max-h-[60vh] space-y-1 overflow-y-auto pb-4">
          {sections.map((section) => {
            const isActive = section.number === active;
            return (
              <a
                key={section.number}
                href={`#section-${section.number}`}
                onClick={() => setOpen(false)}
                aria-current={isActive ? "location" : undefined}
                className={`block border-l-2 py-1.5 pl-3 text-sm ${
                  isActive ? "border-orange-300 text-orange-300" : "border-transparent text-white/45"
                }`}
              >
                {section.number}. {section.title}
              </a>
            );
          })}
        </nav>
      )}
    </div>
  );
}
