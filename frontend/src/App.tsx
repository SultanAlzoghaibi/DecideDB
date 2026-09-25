import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { GradeSection } from "./components/GradeSection";
import { Principles } from "./components/Principles";
import { Footer } from "./components/Footer";

export function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <GradeSection />
        <Principles />
      </main>
      <Footer />
    </>
  );
}
