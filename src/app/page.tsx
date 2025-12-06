import Navbar from "@/components/landing/Navbar"
import Footer from "@/components/landing/Footer"
import HeroSection from "@/components/landing/HeroSection"
import CTA from "@/components/landing/CTA"
import SimpleFeature from "@/components/landing/SimpleFeature"


export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <SimpleFeature />
      <CTA />
      <Footer />
    </main>
  )
}
