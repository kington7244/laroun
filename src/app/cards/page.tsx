'use client'

import DashboardLayout from "@/components/DashboardLayout"
import { useLanguage } from "@/contexts/LanguageContext"

export default function CardsPage() {
    const { t } = useLanguage()

    return (
        <DashboardLayout>
            <div className="p-6">
                <h1 className="text-2xl font-bold text-white mb-6">{t.common.cards || 'Cards'}</h1>
                <div className="grid grid-cols-12 gap-6">
                    {/* Main Content: Card List */}
                    <div className="col-span-9 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-white">
                        <div className="grid grid-cols-5 gap-4 mb-4 font-semibold text-sm opacity-70">
                            <div>Card</div>
                            <div>Top-up</div>
                            <div>To Pay</div>
                            <div>Refunded</div>
                            <div>Balance</div>
                        </div>
                        <div className="space-y-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-16 bg-white/10 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    </div>

                    {/* Right Sidebar: Details */}
                    <div className="col-span-3 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-white">
                        <h2 className="font-semibold mb-4">Card Details</h2>
                        <div className="h-40 bg-white/10 rounded-lg animate-pulse mb-4" />
                        <div className="h-20 bg-white/10 rounded-lg animate-pulse" />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
