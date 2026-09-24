"use client";

import { useEffect, useRef } from "react";

// A soft light that follows the mouse. The native cursor stays; touch
// devices and reduced-motion users never see the glow.
export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    let frame = 0;

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        glow.style.setProperty("--x", `${event.clientX}px`);
        glow.style.setProperty("--y", `${event.clientY}px`);
        glow.style.opacity = "1";
      });
    };

    const hide = () => {
      glow.style.opacity = "0";
    };

    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", hide);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", hide);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 opacity-0 transition-opacity duration-500 pointer-coarse:hidden motion-reduce:hidden"
      style={{
        background:
          "radial-gradient(600px circle at var(--x) var(--y), rgba(251, 146, 60, 0.07), transparent 45%)",
      }}
    />
  );
}
