'use client'

import DashboardLayout from "@/components/DashboardLayout"
import { useLanguage } from "@/contexts/LanguageContext"

export default function AssetsPage() {
    const { t } = useLanguage()

    return (
        <DashboardLayout>
            <div className="p-6">
                <h1 className="text-2xl font-bold text-white mb-6">{t.common.assets || 'Assets'}</h1>
                <div className="grid grid-cols-12 gap-6">
                    {/* Left Sidebar: Facebook Accounts */}
                    <div className="col-span-3 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-white">
                        <h2 className="font-semibold mb-4">Facebook Accounts</h2>
                        {/* Placeholder list */}
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-12 bg-white/10 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    </div>

                    {/* Main Content: Ad Accounts */}
                    <div className="col-span-6 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-white">
                        <h2 className="font-semibold mb-4">Ad Accounts</h2>
                        {/* Placeholder list */}
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-16 bg-white/10 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    </div>

                    {/* Right Sidebar: Status */}
                    <div className="col-span-3 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-white">
                        <h2 className="font-semibold mb-4">Connection Status</h2>
                        {/* Placeholder list */}
                        <div className="space-y-2">
                            {[1, 2].map((i) => (
                                <div key={i} className="h-24 bg-white/10 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
