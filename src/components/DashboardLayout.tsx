"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { User } from "next-auth"
import { useTheme } from "@/contexts/ThemeContext"

interface DashboardLayoutProps {
    children: React.ReactNode
    user?: User & {
        id: string
    }
}

const headerColors: Record<string, string> = {
    violet: "bg-violet-100",
    blue: "bg-blue-100",
    green: "bg-green-100",
    orange: "bg-orange-100",
    rose: "bg-rose-100",
    cyan: "bg-cyan-100",
    indigo: "bg-indigo-100",
    teal: "bg-teal-100",
    amber: "bg-amber-100",
    pink: "bg-pink-100",
    sky: "bg-sky-100",
    slate: "bg-slate-200",
    emerald: "bg-emerald-100",
    lavender: "bg-purple-50",
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const { primaryColor } = useTheme()

    useEffect(() => {
        const savedState = localStorage.getItem('sidebarCollapsed')
        if (savedState) {
            setIsCollapsed(JSON.parse(savedState))
        }
    }, [])

    const toggleSidebar = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        localStorage.setItem('sidebarCollapsed', JSON.stringify(newState))
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <div className="flex flex-col flex-1 overflow-hidden bg-slate-50 relative">
                {/* Tall Background with Primary Color */}
                <div className={`absolute top-0 left-0 right-0 h-64 ${headerColors[primaryColor] || 'bg-sky-100'} z-0`} />

                <div className="relative z-10 flex flex-col h-full">
                    <Header user={user} />
                    <main className="flex-1 overflow-hidden px-4 pb-4 pt-0">
                        <div className="flex h-full gap-4">
                            <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <div className="flex-1 overflow-y-auto">
                                    {children}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    )
}
