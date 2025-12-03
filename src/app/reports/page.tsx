'use client'

import DashboardLayout from "@/components/DashboardLayout"
import { useLanguage } from "@/contexts/LanguageContext"

export default function ReportsPage() {
    const { t } = useLanguage()

    return (
        <DashboardLayout>
            <div className="p-6">
                <h1 className="text-2xl font-bold text-white mb-6">{t.common.reports || 'Reports'}</h1>

                {/* Top Cards */}
                <div className="grid grid-cols-3 gap-6 mb-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 animate-pulse" />
                    ))}
                </div>

                {/* Middle Row */}
                <div className="grid grid-cols-5 gap-6 mb-6">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-24 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 animate-pulse" />
                    ))}
                </div>

                {/* Bottom Row: Chart & List */}
                <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 h-96 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 animate-pulse" />
                    <div className="col-span-1 h-96 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 animate-pulse" />
                </div>
            </div>
        </DashboardLayout>
    )
}
