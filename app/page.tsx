import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FeaturedProjects from "@/components/FeaturedProjects";
import Engineering from "@/components/Engineering";
import Journey from "@/components/Journey";
import WritingPreview from "@/components/WritingPreview";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { social } from "@/data/social";

// Tells search engines and AI assistants who this site is about.
const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Prince Kumar Sharma",
  alternateName: "Kumar Prince",
  url: social.website,
  image: new URL("/images/profile/prince.webp", social.website).toString(),
  jobTitle: "Java Backend Engineer",
  description:
    "Backend engineer building with Java, Spring Boot, PostgreSQL and Redis; Associate Developer at Innofied Solution.",
  email: `mailto:${social.email}`,
  worksFor: { "@type": "Organization", name: "Innofied Solution" },
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "Dr. Sudhir Chandra Sur Institute of Technology & Sports Complex",
  },
  address: { "@type": "PostalAddress", addressLocality: "Kolkata", addressCountry: "IN" },
  knowsAbout: ["Java", "Spring Boot", "PostgreSQL", "Redis", "Kafka", "System Design", "REST APIs"],
  sameAs: [social.github, social.linkedin, social.instagram],
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, "\\u003c") }}
      />
      <Navbar />
      <Hero />
      <FeaturedProjects />
      <Engineering />
      <Journey />
      <WritingPreview />
      <About />
      <Contact />
      <Footer />
    </main>
  );
}