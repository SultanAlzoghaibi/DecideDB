import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { LearningLoop } from "@/components/LearningLoop";
import { GradeSection } from "@/components/GradeSection";
import { Principles } from "@/components/Principles";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <LearningLoop />
        <GradeSection />
        <Principles />
      </main>
      <Footer />
    </>
  );
}
