"use client"

import {
    BarChart3,
    Zap,
    ShieldCheck,
    Globe2,
    Smartphone,
    MessageSquare
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

export default function FeatureSection() {
    const { t } = useLanguage()

    const features = [
        {
            icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
            title: t.landing.features.items.analytics.title,
            description: t.landing.features.items.analytics.description
        },
        {
            icon: <Zap className="w-6 h-6 text-blue-600" />,
            title: t.landing.features.items.optimization.title,
            description: t.landing.features.items.optimization.description
        },
        {
            icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
            title: t.landing.features.items.security.title,
            description: t.landing.features.items.security.description
        },
        {
            icon: <Globe2 className="w-6 h-6 text-blue-600" />,
            title: t.landing.features.items.global.title,
            description: t.landing.features.items.global.description
        },
        {
            icon: <Smartphone className="w-6 h-6 text-blue-600" />,
            title: t.landing.features.items.mobile.title,
            description: t.landing.features.items.mobile.description
        },
        {
            icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
            title: t.landing.features.items.support.title,
            description: t.landing.features.items.support.description
        }
    ]

    return (
        <section id="features" className="py-24 bg-white relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-50/50 skew-x-12 translate-x-1/2"></div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-blue-600 font-semibold tracking-wide uppercase text-sm mb-3">{t.landing.features.title}</h2>
                    <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                        {t.landing.features.mainTitle}
                    </h3>
                    <p className="text-xl text-gray-600">
                        {t.landing.features.description}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="group p-8 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                                <div className="group-hover:text-white transition-colors duration-300">
                                    {feature.icon}
                                </div>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h4>
                            <p className="text-gray-600 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
