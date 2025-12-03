import Navbar from "@/components/landing/Navbar"
import BentoGrid from "@/components/landing/BentoGrid"
import Footer from "@/components/landing/Footer"
import HeroSection from "@/components/landing/HeroSection"
import FeatureSection from "@/components/landing/FeatureSection"
import CTA from "@/components/landing/CTA"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-white">
      <Navbar />
      <div className="flex-1 flex flex-col">
        <HeroSection />
        <div className="relative z-20 py-20">
          <BentoGrid />
        </div>
        <FeatureSection />
        <CTA />
      </div>
      <Footer />
    </main>
  )
}
