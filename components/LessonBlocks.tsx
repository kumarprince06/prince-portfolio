import Image from "next/image";
import type { ReactNode } from "react";
import type { LessonBlock } from "@/content/writing/types";

const label = "text-[10px] uppercase tracking-[0.2em]";

// Renders inline `code` and **bold** inside lesson text.
function Inline({ text }: { text: string }) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/).map((part, index): ReactNode => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      return (
        <code
          key={index}
          className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[0.85em] text-orange-200/90 [overflow-wrap:anywhere] box-decoration-clone"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 3) {
      return (
        <strong key={index} className="font-medium text-white/80">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

const calloutStyles = {
  note: { box: "border-white/10 bg-white/[0.02]", title: "text-white/40", fallback: "Note" },
  tip: { box: "border-orange-300/20 bg-orange-300/[0.03]", title: "text-orange-300/70", fallback: "Tip" },
  warning: { box: "border-red-400/25 bg-red-400/[0.04]", title: "text-red-300/80", fallback: "Watch out" },
};

function Block({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="text-[15px] leading-8 text-white/55 md:text-base">
          <Inline text={block.text} />
        </p>
      );

    case "heading":
      return (
        <h3 className="pt-4 text-lg font-medium tracking-tight text-white md:text-xl">
          <Inline text={block.text} />
        </h3>
      );

    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List className={`space-y-3 text-[15px] leading-7 text-white/55 md:text-base ${block.ordered ? "list-decimal pl-5 marker:text-orange-300/70" : ""}`}>
          {block.items.map((item) => (
            <li key={item} className={block.ordered ? "pl-1" : "flex gap-3"}>
              {!block.ordered && (
                <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-300/70" />
              )}
              <span>
                <Inline text={item} />
              </span>
            </li>
          ))}
        </List>
      );
    }

    case "code":
      return (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#050505]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <span className={`${label} text-white/25`}>{block.language}</span>
            {block.title && (
              <span className="font-mono text-xs text-white/35">{block.title}</span>
            )}
          </div>
          <pre className="overflow-x-auto p-5 text-sm leading-7 text-white/65">
            <code>{block.code}</code>
          </pre>
        </div>
      );

    case "output":
      return (
        <div className="border-l border-orange-300/50 pl-4">
          <p className={`${label} text-orange-300/70`}>Output</p>
          <pre className="mt-2 overflow-x-auto text-sm leading-7 text-white/55">
            <code>{block.text}</code>
          </pre>
        </div>
      );

    case "diagram":
      return (
        <figure className="overflow-hidden rounded-2xl border border-white/10 bg-[#050505]">
          <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-[1.2] text-white/60">
            {block.text}
          </pre>
          {block.caption && (
            <figcaption className="border-t border-white/10 px-5 py-3 text-sm leading-6 text-white/40">
              <Inline text={block.caption} />
            </figcaption>
          )}
        </figure>
      );

    case "table":
      return (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                {block.headers.map((header) => (
                  <th key={header} className={`${label} px-5 py-3 font-normal text-orange-300/70`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-white/5 last:border-0">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-5 py-3.5 align-top leading-6 ${cellIndex === 0 ? "text-white/75" : "text-white/50"}`}
                    >
                      <Inline text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "callout": {
      const style = calloutStyles[block.tone];
      return (
        <aside className={`rounded-2xl border p-5 md:p-6 ${style.box}`}>
          <p className={`${label} ${style.title}`}>{block.title ?? style.fallback}</p>
          <p className="mt-3 text-sm leading-7 text-white/55">
            <Inline text={block.text} />
          </p>
        </aside>
      );
    }

    case "image":
      return (
        <figure className="overflow-hidden rounded-2xl border border-white/10 bg-[#050505]">
          <Image src={block.src} alt={block.alt} width={1200} height={620} className="h-auto w-full" />
          {block.caption && (
            <figcaption className="border-t border-white/10 px-5 py-4 text-sm leading-6 text-white/45">
              <Inline text={block.caption} />
            </figcaption>
          )}
        </figure>
      );

    case "qa":
      return (
        <div className="space-y-3">
          {block.items.map((item) => (
            <details
              key={item.question}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] open:border-white/15"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 text-sm font-medium leading-6 text-white/75 [&::-webkit-details-marker]:hidden">
                <span>
                  <Inline text={item.question} />
                </span>
                <span className="mt-0.5 shrink-0 text-orange-300/70 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="space-y-3 border-t border-white/10 px-5 pb-5 pt-4 text-sm leading-7 text-white/55">
                {item.answer.split("\n\n").map((paragraph) => (
                  <p key={paragraph}>
                    <Inline text={paragraph} />
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>
      );

    case "complexity":
      return (
        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
          {[
            ["Time", block.time],
            ["Space", block.space],
          ].map(([name, value]) => (
            <div key={name} className="bg-[#080808] p-5">
              <p className={`${label} text-orange-300/70`}>{name} Complexity</p>
              <p className="mt-2 font-mono text-sm text-white/70">{value}</p>
            </div>
          ))}
        </div>
      );
  }
}

export default function LessonBlocks({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <div className="mt-6 space-y-6">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}
