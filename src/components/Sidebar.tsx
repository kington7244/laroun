"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Settings, LogOut, ChevronLeft, ChevronRight, Megaphone, Receipt, MessageCircle, FileSpreadsheet } from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "next-auth/react"
import { useLanguage } from "@/contexts/LanguageContext"



interface SidebarProps {
    isCollapsed: boolean
    toggleSidebar: () => void
}

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
    const pathname = usePathname()
    const { t } = useLanguage()

    const navigation = [
        { name: t.common.dashboard, href: "/dashboard", icon: LayoutDashboard },
        { name: t.common.adManager, href: "/admanager", icon: Megaphone },
        { name: "AdBox", href: "/adbox", icon: MessageCircle },
        { name: "Google Sheets", href: "/google-sheets", icon: FileSpreadsheet },
        { name: t.common.payments, href: "/payments", icon: Receipt },
        { name: t.common.settings, href: "/settings", icon: Settings },
    ]

    return (
        <div className={cn(
            "flex flex-col bg-white rounded-xl shadow-sm transition-all duration-300 h-full",
            isCollapsed ? "w-16" : "w-64"
        )}>
            <div className="flex items-center justify-end h-12 px-2">
                <button
                    onClick={toggleSidebar}
                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="px-2 space-y-1">
                    {navigation.map((item) => {
                        // Exact match or sub-path match (e.g. /admanager/123 matches /admanager, but /admanager-team does not)
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center px-2 py-2 text-sm font-medium rounded-md group",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                                    isCollapsed ? "justify-center" : "px-4"
                                )}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <item.icon
                                    className={cn(
                                        "h-5 w-5 flex-shrink-0",
                                        isActive ? "text-primary" : "text-gray-400 group-hover:text-gray-500",
                                        !isCollapsed && "mr-3"
                                    )}
                                />
                                {!isCollapsed && <span>{item.name}</span>}
                            </Link>
                        )
                    })}
                </nav>
            </div>
            <div className="p-4 mt-auto">
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className={cn(
                        "flex items-center w-full py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50",
                        isCollapsed ? "justify-center px-0" : "px-4"
                    )}
                    title={isCollapsed ? "Sign Out" : undefined}
                >
                    <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                    {!isCollapsed && "Sign Out"}
                </button>
            </div>
        </div>
    )
}
