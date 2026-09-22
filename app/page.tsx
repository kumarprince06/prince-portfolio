import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FeaturedProjects from "@/components/FeaturedProjects";
import Engineering from "@/components/Engineering";
import Journey from "@/components/Journey";
import WritingPreview from "@/components/WritingPreview";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080808] text-white">
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