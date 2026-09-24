import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { social } from "@/data/social";

// Emails me when someone new visits the site or opens the résumé.
// Needs RESEND_API_KEY; ALERT_EMAIL defaults to the contact email and must be
// the address the Resend account was created with (free plan sends only there).

const VISITOR_COOKIE = "pk_seen";
const RESUME_COOKIE = "pk_resume";
// Only real pages count as a visit, so scanners probing /wp-admin etc. stay quiet.
const SITE_PAGE = /^\/(writing(\/[a-z0-9-]+){0,2})?$/;
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|slack|discord|headless|lighthouse|curl|wget|python|axios|node-fetch|go-http|java\//i;

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const response = NextResponse.next();
  const userAgent = request.headers.get("user-agent") ?? "";
  // Browser-level prefetches aren't visits. In-app navigations need no check: they
  // follow the first page load, which has already set the visitor cookie.
  const isBackgroundFetch =
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose")?.includes("prefetch");

  if (!userAgent || BOT.test(userAgent) || isBackgroundFetch) return response;

  if (request.nextUrl.pathname === "/resume.pdf") {
    // PDF viewers follow up with byte-range requests; alert on the first one only.
    const range = request.headers.get("range");
    if ((range && !range.startsWith("bytes=0-")) || request.cookies.has(RESUME_COOKIE)) {
      return response;
    }
    response.cookies.set(RESUME_COOKIE, "1", { maxAge: 60 * 30, httpOnly: true, sameSite: "lax", path: "/" });
    event.waitUntil(sendAlert("📄 Someone opened your résumé", request));
    return response;
  }

  if (!SITE_PAGE.test(request.nextUrl.pathname) || request.cookies.has(VISITOR_COOKIE)) {
    return response;
  }

  response.cookies.set(VISITOR_COOKIE, "1", { maxAge: 60 * 60 * 24, httpOnly: true, sameSite: "lax", path: "/" });
  event.waitUntil(sendAlert("👀 New visitor on your portfolio", request));
  return response;
}

function describe(request: NextRequest) {
  const headers = request.headers;
  const city = decodeURIComponent(headers.get("x-vercel-ip-city") ?? "");
  const country = headers.get("x-vercel-ip-country") ?? "";
  const userAgent = headers.get("user-agent") ?? "";

  const device = /iPhone|iPad|Android|Mobi/i.test(userAgent) ? "Mobile" : "Desktop";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Other browser";
  const os = /Windows/.test(userAgent)
    ? "Windows"
    : /iPhone|iPad/.test(userAgent)
      ? "iOS"
      : /Mac OS/.test(userAgent)
        ? "macOS"
        : /Android/.test(userAgent)
          ? "Android"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "Other OS";

  let referrer = "Direct link or bookmark";
  const referer = headers.get("referer");
  const host = URL.canParse(referer ?? "") ? new URL(referer!).hostname.replace(/^www\./, "") : "";
  if (host) referrer = host === request.nextUrl.hostname ? "Your own site" : host;

  return [
    `Page:     ${request.nextUrl.pathname}`,
    `From:     ${[city, country].filter(Boolean).join(", ") || "Unknown location"}`,
    `Came via: ${referrer}`,
    `Device:   ${device} · ${browser} on ${os}`,
    `Time:     ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`,
  ].join("\n");
}

async function sendAlert(subject: string, request: NextRequest) {
  const text = describe(request);
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.info(`[visitor alert] ${subject}\n${text}`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Portfolio Alerts <onboarding@resend.dev>",
        to: process.env.ALERT_EMAIL ?? social.email,
        subject,
        text,
      }),
    });
    if (!res.ok) console.error(`[visitor alert] Resend ${res.status}: ${await res.text()}`);
  } catch (error) {
    console.error("[visitor alert] send failed", error);
  }
}

export const config = {
  matcher: [
    // Pages and the résumé; skip Next internals, APIs and other static files.
    "/((?!_next/|api/|images/|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|xml|js|css)$).*)",
  ],
};
