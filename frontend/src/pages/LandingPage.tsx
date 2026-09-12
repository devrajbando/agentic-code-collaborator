import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Footer from "../components/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Navbar />
      <Hero />
      <Features />
      <Footer />
    </div>
  );
}