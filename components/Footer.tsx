import { ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-5 py-8 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Brand */}
        <div>
          <p className="text-sm font-medium text-white">
            Prince Kumar Sharma
          </p>

          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/20">
            Software Engineer · Builder · Explorer
          </p>
        </div>

        {/* Center */}
        <p className="text-xs text-white/20">
          Build. Explore. Evolve.
        </p>

        {/* Back to top */}
        <a
          href="#"
          className="group flex items-center gap-2 text-xs text-white/35 transition-colors hover:text-white"
        >
          Back to top

          <ArrowUpRight
            size={14}
            className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </a>
      </div>

      <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-2 border-t border-white/5 pt-6 text-[10px] uppercase tracking-[0.15em] text-white/15 sm:flex-row sm:justify-between">
        <span>© {new Date().getFullYear()} Prince Kumar Sharma</span>

        <span>Designed & built with curiosity</span>
      </div>
    </footer>
  );
}