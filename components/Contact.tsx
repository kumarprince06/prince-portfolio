import { ArrowUpRight, Mail } from "lucide-react";
import Reveal from "./Reveal";
import { social } from "@/data/social";

export default function Contact() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden border-t border-white/10 px-5 py-28 md:px-8 md:py-40"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400/[0.07] blur-[140px]" />

      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.6fr]">
          {/* Main CTA */}
          <Reveal>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-orange-300">
                Get in touch
              </p>

              <h2 className="mt-6 max-w-5xl text-5xl font-semibold leading-[0.95] tracking-[-0.06em] text-white md:text-7xl lg:text-8xl">
                Have an idea?
                <br />
                <span className="text-white/30">Let&apos;s talk.</span>
              </h2>

              <p className="mt-8 max-w-xl text-base leading-7 text-white/45 md:text-lg">
                Whether it&apos;s a product, an engineering problem, an
                interesting collaboration or simply a conversation about
                technology — feel free to reach out.
              </p>

              <a
                href={`mailto:${social.email}`}
                className="group mt-9 inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 text-sm font-medium text-black shadow-[0_10px_40px_rgba(255,255,255,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_50px_rgba(255,255,255,0.08)]"              >
                <Mail size={16} />

                Send me an email

                <ArrowUpRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </a>
            </div>
          </Reveal>

          {/* Contact details */}
          <Reveal delay={0.1}>
            <div className="lg:pt-14">
              <div className="border-t border-white/10">
                <ContactItem
                  label="Email"
                  value={social.email}
                  href={`mailto:${social.email}`}
                />

                <ContactItem
                  label="GitHub"
                  value={social.github.replace("https://", "")}
                  href={social.github}
                />

                <ContactItem
                  label="LinkedIn"
                  value={social.linkedin.replace("https://", "")}
                  href={social.linkedin}
                />

                <div className="border-b border-white/10 py-6">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/20">
                    Based in
                  </p>

                  <p className="mt-2 text-sm text-white/55">
                    Kolkata, India · Open to relocation
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="mt-8 flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-300 opacity-50" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-300" />
                </span>

                <span className="text-xs text-white/35">
                  Open to Java backend roles
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ContactItem({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      className="group flex items-center justify-between border-b border-white/10 py-6"
    >
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/20">
          {label}
        </p>

        <p className="mt-2 text-sm text-white/55 transition-colors group-hover:text-white">
          {value}
        </p>
      </div>

      <ArrowUpRight
        size={17}
        className="text-white/20 transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-white"
      />
    </a>
  );
}