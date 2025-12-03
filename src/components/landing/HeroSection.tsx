"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle2, PlayCircle } from "lucide-react"

export default function HeroSection() {
    return (
        <section className="relative pt-20 pb-32 px-4 overflow-hidden">
            <div className="max-w-4xl mx-auto text-center relative z-10">

                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-8 animate-fade-in-up">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    <span className="text-sm font-medium text-blue-600">New: Advanced Video Metrics</span>
                </div>

                {/* Headline */}
                <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight mb-6 leading-tight animate-fade-in-up delay-100">
                    Master Your <br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-400">
                        Facebook Ads
                    </span>
                </h1>

                {/* Subheadline */}
                <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
                    Simplify your ad management with powerful analytics, real-time insights,
                    and automated optimization tools designed for growth.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in-up delay-300">
                    <Button className="h-12 px-8 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/30 transition-all hover:scale-105">
                        Start Free Trial <span className="ml-2">→</span>
                    </Button>
                    <Button variant="outline" className="h-12 px-8 text-lg bg-white hover:bg-gray-50 text-gray-700 border-gray-200 rounded-lg transition-all hover:scale-105">
                        View Demo
                    </Button>
                </div>

                {/* Trust Indicators */}
                <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 text-sm font-medium text-gray-500 animate-fade-in-up delay-400">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="text-green-500 w-5 h-5" />
                        <span>No credit card required</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="text-green-500 w-5 h-5" />
                        <span>14-day free trial</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="text-green-500 w-5 h-5" />
                        <span>Cancel anytime</span>
                    </div>
                </div>
            </div>

            {/* Background Glow Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-400/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        </section>
    )
}
