"use client"

import {
    BarChart3,
    Zap,
    ShieldCheck,
    Globe2,
    Smartphone,
    MessageSquare
} from "lucide-react"

export default function FeatureSection() {
    const features = [
        {
            icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
            title: "Advanced Analytics",
            description: "Get deep insights into your ad performance with real-time data visualization and custom reporting."
        },
        {
            icon: <Zap className="w-6 h-6 text-blue-600" />,
            title: "Automated Optimization",
            description: "Let our AI algorithms automatically adjust bids and targeting to maximize your ROI 24/7."
        },
        {
            icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
            title: "Enterprise Security",
            description: "Bank-grade encryption and role-based access control to keep your data safe and compliant."
        },
        {
            icon: <Globe2 className="w-6 h-6 text-blue-600" />,
            title: "Global Reach",
            description: "Manage campaigns across multiple regions and currencies from a single unified dashboard."
        },
        {
            icon: <Smartphone className="w-6 h-6 text-blue-600" />,
            title: "Mobile First",
            description: "Monitor and manage your campaigns on the go with our fully responsive mobile interface."
        },
        {
            icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
            title: "24/7 Support",
            description: "Our dedicated support team is always ready to help you resolve issues and optimize strategy."
        }
    ]

    return (
        <section id="features" className="py-24 bg-white relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-50/50 skew-x-12 translate-x-1/2"></div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-blue-600 font-semibold tracking-wide uppercase text-sm mb-3">Features</h2>
                    <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                        Everything you need to scale your ads
                    </h3>
                    <p className="text-xl text-gray-600">
                        Powerful tools designed to help you manage, optimize, and scale your advertising campaigns with ease.
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
