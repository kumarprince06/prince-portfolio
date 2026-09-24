import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import CursorGlow from "@/components/CursorGlow";
import { social } from "@/data/social";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description =
  "Prince Kumar Sharma is a Java backend engineer in Kolkata, India, building with Java, Spring Boot, PostgreSQL and Redis. Projects, experience and in-depth Java notes.";

export const metadata: Metadata = {
  metadataBase: new URL(social.website),
  title: {
    default: "Prince Kumar Sharma — Java Backend Engineer",
    template: "%s — Prince Kumar Sharma",
  },
  description,
  applicationName: "Prince Kumar Sharma",
  authors: [{ name: "Prince Kumar Sharma", url: social.website }],
  creator: "Prince Kumar Sharma",
  keywords: [
    "Prince Kumar Sharma",
    "Java backend engineer",
    "Spring Boot developer",
    "backend developer Kolkata",
    "Java notes",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    firstName: "Prince Kumar",
    lastName: "Sharma",
    url: "/",
    siteName: "Prince Kumar Sharma",
    title: "Prince Kumar Sharma — Java Backend Engineer",
    description,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prince Kumar Sharma — Java Backend Engineer",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <CursorGlow />
      </body>
    </html>
  );
}
