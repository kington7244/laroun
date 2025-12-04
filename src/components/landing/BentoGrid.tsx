"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Users,
    LayoutGrid,
    Megaphone,
    ShoppingCart,
    ArrowUp,
    TrendingUp
} from "lucide-react"

export default function BentoGrid() {
    return (
        <section className="py-8 px-4 md:px-8 max-w-[1400px] mx-auto">
            <style jsx>{`
                @keyframes border-flow {
                    0% { background-position: 100% 100%; }
                    100% { background-position: 0% 0%; }
                }
                @keyframes border-flow-reverse {
                    0% { background-position: 0% 100%; }
                    100% { background-position: 100% 0%; }
                }
                .animate-border-flow {
                    background-image: linear-gradient(135deg, transparent 40%, #ec4899 50%, transparent 60%);
                    background-size: 300% 300%;
                    animation: border-flow 3s linear infinite;
                }
                .animate-border-flow-reverse {
                    background-image: linear-gradient(225deg, transparent 40%, #3b82f6 50%, transparent 60%);
                    background-size: 300% 300%;
                    animation: border-flow-reverse 3s linear infinite;
                }
            `}</style>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* Left Column (3 cols wide) */}
                <div className="md:col-span-3 md:col-start-2 flex flex-col gap-6">
                    {/* Visual Data Card */}
                    <Card className="p-6 bg-white/80 backdrop-blur-sm border-none shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-center h-32 animate-fade-in-up">
                        <div className="bg-cyan-50 rounded-full px-6 py-3 flex items-center gap-3 shadow-sm border border-cyan-100">
                            <div className="bg-cyan-400 p-2 rounded-full text-white">
                                <LayoutGrid size={20} />
                            </div>
                            <span className="font-semibold text-gray-700">Visual Data</span>
                        </div>
                    </Card>

                    {/* Report Card */}
                    <Card className="p-6 bg-white/80 backdrop-blur-sm border-none shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex-1 flex flex-col justify-between min-h-[280px] animate-fade-in-up delay-100">
                        <div className="flex justify-center mb-4">
                            <span className="bg-cyan-100 text-cyan-600 text-xs font-bold px-3 py-1 rounded-full">Report</span>
                        </div>
                        <p className="text-center text-gray-600 font-medium mb-6">
                            Reduce errors and increase accuracy in data reporting 🤩
                        </p>
                        <div className="bg-blue-500 rounded-xl p-4 relative overflow-hidden h-32 flex items-end justify-center gap-2">
                            {/* Abstract Chart UI */}
                            <div className="w-full h-full absolute inset-0 bg-gradient-to-b from-blue-400 to-blue-600 opacity-90"></div>
                            <div className="relative z-10 bg-white/20 w-4 h-12 rounded-t-sm"></div>
                            <div className="relative z-10 bg-white/40 w-4 h-20 rounded-t-sm"></div>
                            <div className="relative z-10 bg-white/30 w-4 h-16 rounded-t-sm"></div>
                            <div className="relative z-10 bg-white/50 w-4 h-24 rounded-t-sm"></div>

                            {/* Floating checkmarks panel */}
                            <div className="absolute top-2 left-2 bg-white/90 rounded-lg p-2 shadow-lg w-24 animate-float">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 rounded-full border border-gray-300"></div>
                                    <div className="h-1 w-12 bg-gray-200 rounded"></div>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white">✓</div>
                                    <div className="h-1 w-10 bg-gray-200 rounded"></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white">✓</div>
                                    <div className="h-1 w-8 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Data Driven Card */}
                    <Card className="p-6 bg-white/80 backdrop-blur-sm border-none shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-48 flex flex-col items-center justify-center animate-fade-in-up delay-200">
                        <p className="text-center text-gray-700 font-medium mb-4">
                            Make data-driven decisions 🚀
                        </p>
                        <div className="grid grid-cols-6 gap-2">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className={`w-6 h-6 rounded-md ${[0, 2, 5, 7, 8, 10].includes(i) ? 'bg-blue-400' : 'bg-blue-100'
                                    }`}></div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Center Column (4 cols wide) */}
                <div className="md:col-span-4 flex flex-col relative">


                    {/* Top Cards Area */}
                    <div className="grid grid-cols-2 gap-4 mb-20 relative z-10 px-2">
                        {/* Marketing Card - With Animated Border Flow */}
                        <div className="relative rounded-3xl p-[2px] overflow-hidden h-64 animate-float shadow-sm">
                            {/* Animated Gradient Border Layer */}
                            <div className="absolute inset-0 animate-border-flow"></div>

                            {/* Inner Content Layer */}
                            <div className="bg-blue-50/90 backdrop-blur-sm rounded-[22px] h-full w-full flex flex-col items-center gap-4 justify-center relative z-10">
                                <div className="absolute top-8 left-4 flex flex-col items-center gap-3 z-30">
                                    <div className="bg-pink-100 p-4 rounded-full text-pink-500 shadow-inner">
                                        <Megaphone size={28} />
                                    </div>
                                    <div className="bg-pink-500 text-white text-sm font-bold px-6 py-1.5 rounded-full shadow-lg shadow-pink-200">
                                        Marketing
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sales Card - With Reverse Animated Border Flow */}
                        <div className="relative rounded-3xl p-[2px] overflow-hidden h-64 animate-float-delayed shadow-sm">
                            {/* Animated Gradient Border Layer */}
                            <div className="absolute inset-0 animate-border-flow-reverse"></div>

                            {/* Inner Content Layer */}
                            <div className="bg-blue-50/90 backdrop-blur-sm rounded-[22px] h-full w-full flex flex-col items-center gap-4 justify-center relative z-10">
                                <div className="absolute top-8 right-4 flex flex-col items-center gap-3 z-30">
                                    <div className="bg-blue-100 p-4 rounded-full text-blue-500 shadow-inner">
                                        <ShoppingCart size={28} />
                                    </div>
                                    <div className="bg-blue-500 text-white text-sm font-bold px-6 py-1.5 rounded-full shadow-lg shadow-blue-200">
                                        Sales
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Center Card Wrapper */}
                    <div className="flex-1 relative mt-[-60px] z-30 animate-fade-in-up delay-300 group transition-all duration-300 hover:-translate-y-1">
                        {/* Avatar Center - Large Blue Circle (Moved Outside) */}
                        <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 z-50">
                            <div className="relative">
                                {/* Outer Glow/Border */}
                                <div className="absolute inset-0 bg-blue-100 rounded-full scale-110 opacity-50 blur-sm"></div>

                                {/* Main Blue Gradient Circle */}
                                <div className="w-48 h-48 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full flex items-center justify-center shadow-2xl border-[6px] border-white relative z-10">

                                    {/* Inner Avatar Circle */}
                                    <div className="w-24 h-24 bg-white rounded-full p-1 relative">
                                        <div className="w-full h-full rounded-full overflow-hidden border-2 border-white bg-gradient-to-br from-indigo-100 via-blue-50 to-cyan-100 flex items-center justify-center">
                                            {/* Cool 3D Style Avatar */}
                                            <svg viewBox="0 0 100 100" className="w-full h-full">
                                                <defs>
                                                    <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor="#FFE0BD"/>
                                                        <stop offset="100%" stopColor="#FFCD94"/>
                                                    </linearGradient>
                                                    <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor="#2D3748"/>
                                                        <stop offset="100%" stopColor="#1A202C"/>
                                                    </linearGradient>
                                                    <linearGradient id="shirtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                                        <stop offset="0%" stopColor="#3B82F6"/>
                                                        <stop offset="100%" stopColor="#1D4ED8"/>
                                                    </linearGradient>
                                                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2"/>
                                                    </filter>
                                                </defs>
                                                
                                                {/* Background */}
                                                <circle cx="50" cy="50" r="50" fill="url(#skinGrad)" opacity="0"/>
                                                
                                                {/* Body/Shirt */}
                                                <path d="M20 95 Q20 70 50 65 Q80 70 80 95" fill="url(#shirtGrad)" filter="url(#shadow)"/>
                                                
                                                {/* Neck */}
                                                <rect x="42" y="55" width="16" height="12" fill="url(#skinGrad)"/>
                                                
                                                {/* Head */}
                                                <ellipse cx="50" cy="40" rx="22" ry="24" fill="url(#skinGrad)" filter="url(#shadow)"/>
                                                
                                                {/* Hair - Modern Style */}
                                                <path d="M28 35 Q28 15 50 12 Q72 15 72 35 Q70 25 50 22 Q30 25 28 35" fill="url(#hairGrad)"/>
                                                <path d="M28 35 Q25 40 28 45 L30 38 Z" fill="url(#hairGrad)"/>
                                                <path d="M72 35 Q75 40 72 45 L70 38 Z" fill="url(#hairGrad)"/>
                                                
                                                {/* Eyebrows */}
                                                <path d="M36 32 Q40 30 44 32" stroke="#2D3748" strokeWidth="2" fill="none" strokeLinecap="round"/>
                                                <path d="M56 32 Q60 30 64 32" stroke="#2D3748" strokeWidth="2" fill="none" strokeLinecap="round"/>
                                                
                                                {/* Eyes */}
                                                <ellipse cx="40" cy="38" rx="5" ry="4" fill="white"/>
                                                <ellipse cx="60" cy="38" rx="5" ry="4" fill="white"/>
                                                <circle cx="41" cy="38" r="2.5" fill="#1E3A5F"/>
                                                <circle cx="61" cy="38" r="2.5" fill="#1E3A5F"/>
                                                <circle cx="42" cy="37" r="1" fill="white"/>
                                                <circle cx="62" cy="37" r="1" fill="white"/>
                                                
                                                {/* Nose */}
                                                <path d="M50 40 L48 48 Q50 50 52 48 L50 40" fill="#FFCD94" opacity="0.6"/>
                                                
                                                {/* Confident Smile */}
                                                <path d="M42 52 Q50 58 58 52" stroke="#C53030" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                                                
                                                {/* Ears */}
                                                <ellipse cx="28" cy="42" rx="4" ry="6" fill="url(#skinGrad)"/>
                                                <ellipse cx="72" cy="42" rx="4" ry="6" fill="url(#skinGrad)"/>
                                            </svg>
                                        </div>

                                        {/* 200% Badge */}
                                        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-lg flex items-center gap-1 min-w-[80px] justify-center border border-blue-50">
                                            <ArrowUp size={14} className="text-blue-600 stroke-[3px]" />
                                            <span className="text-sm font-extrabold text-blue-600">200%</span>
                                        </div>
                                    </div>

                                    {/* Floating User Label with Icon */}
                                    <div className="absolute top-6 right-6 bg-white px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                                        <TrendingUp size={14} className="text-blue-500" />
                                        <span className="text-xs font-semibold text-gray-700">User</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* The Card itself */}
                        <Card className="h-full bg-blue-50/30 backdrop-blur-sm border-none shadow-sm group-hover:shadow-xl transition-all duration-300 flex flex-col items-center pt-24 pb-0 px-0 relative overflow-hidden rounded-[2rem]">
                            <div className="mt-2 text-center mb-4 px-6">
                                <span className="text-blue-500 text-sm font-bold tracking-wide">Business</span>
                                <h2 className="text-2xl font-bold text-gray-800 mt-1">Real-time tracking results</h2>
                            </div>

                            {/* Wave Chart */}
                            <div className="w-full mt-auto relative h-40">
                                <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="waveGradientFilled" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="1" />
                                            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.8" />
                                        </linearGradient>
                                    </defs>
                                    {/* Filled Wave */}
                                    <path d="M0 120 C 50 100, 100 140, 150 120 S 200 60, 250 100 S 350 80, 400 60 V 150 H 0 Z" fill="url(#waveGradientFilled)" />
                                    {/* Lighter Wave behind */}
                                    <path d="M0 130 C 60 110, 120 150, 180 130 S 280 90, 320 110 S 380 100, 400 90 V 150 H 0 Z" fill="#93C5FD" fillOpacity="0.4" />
                                </svg>

                                {/* Chart Points/Labels */}
                                <div className="absolute bottom-2 left-0 w-full flex justify-between px-6 text-xs text-white font-medium z-20">
                                    <span className="opacity-70">Jan</span>
                                    <span className="opacity-70">Feb</span>
                                    <span className="opacity-70">Mar</span>
                                    <span className="opacity-70">Apr</span>
                                    <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full shadow-sm font-bold">May</span>
                                    <span className="opacity-70">Jun</span>
                                    <span className="opacity-70">Jul</span>
                                </div>

                                {/* Vertical Indicator Line for May */}
                                <div className="absolute bottom-0 left-[64%] w-[1px] h-full bg-white/30 border-l border-dashed border-white/50 z-10"></div>
                                {/* Active Point Indicator */}
                                <div className="absolute bottom-[45%] left-[64%] transform -translate-x-1/2 w-4 h-4 bg-white rounded-full border-4 border-blue-500 shadow-lg z-30"></div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Right Column (3 cols wide) */}
                <div className="md:col-span-3 flex flex-col gap-6">
                    {/* Management Card */}
                    <Card className="p-6 bg-white/80 backdrop-blur-sm border-none shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-64 relative overflow-hidden animate-fade-in-up delay-400 group">
                        <p className="text-gray-700 font-medium mb-6 relative z-10">
                            Easy & convenient management of finance, invoices, payment cards 💳
                        </p>

                        {/* Credit Cards Stack */}
                        <div className="relative h-full w-full mt-4">
                            <div className="absolute top-0 left-4 w-48 h-28 bg-gradient-to-r from-cyan-200 to-blue-200 rounded-xl transform rotate-[-5deg] opacity-60"></div>
                            <div className="absolute top-4 left-8 w-48 h-28 bg-gradient-to-r from-cyan-300 to-blue-300 rounded-xl transform rotate-[-2deg] opacity-80"></div>
                            <div className="absolute top-8 left-12 w-48 h-28 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-xl shadow-lg flex flex-col justify-between p-4 text-white transition-transform duration-300 group-hover:translate-x-2 group-hover:-translate-y-2">
                                <div className="flex justify-between items-start">
                                    <div className="w-8 h-5 bg-white/30 rounded"></div>
                                    <div className="text-xs font-bold italic">VISA</div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                                    <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                                    <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                                    <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Cost Optimization Card */}
                    <Card className="p-6 bg-white/80 backdrop-blur-sm border-none shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex-1 min-h-[200px] flex flex-col animate-fade-in-up delay-500">
                        <p className="text-gray-700 font-medium mb-4">
                            Cost optimization, performance improvement
                        </p>
                        <div className="flex-1 flex items-end justify-center pb-4 relative">
                            {/* Gauge Chart */}
                            <div className="relative w-40 h-20 overflow-hidden">
                                <div className="absolute top-0 left-0 w-40 h-40 rounded-full border-[12px] border-blue-100 border-t-blue-500 border-r-blue-500 transform rotate-[-45deg]"></div>
                            </div>
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-1 h-16 bg-cyan-400 origin-bottom rotate-[-30deg] rounded-full"></div>

                            {/* Emojis */}
                            <div className="absolute bottom-4 left-4 bg-cyan-100 p-1 rounded-md">
                                <span className="text-lg">😀</span>
                            </div>
                            <div className="absolute bottom-4 right-4 bg-pink-100 p-1 rounded-md">
                                <span className="text-lg">🥵</span>
                            </div>
                        </div>
                    </Card>

                    {/* Staff Efficiency Card */}
                    <Card className="p-4 bg-white/80 backdrop-blur-sm border-none shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-24 flex items-center justify-center animate-fade-in-up delay-500">
                        <div className="bg-pink-100 rounded-full px-6 py-3 flex items-center gap-3 w-full justify-center">
                            <div className="bg-pink-500 p-1.5 rounded-full text-white">
                                <Users size={16} />
                            </div>
                            <span className="font-medium text-gray-700 text-sm">Increase staff efficiency</span>
                        </div>
                    </Card>
                </div>

            </div>
        </section>
    )
}
