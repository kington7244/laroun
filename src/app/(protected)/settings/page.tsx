"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { User, Link2, Bell, Shield, Globe, Palette } from "lucide-react"
import { cn } from "@/lib/utils"
import { AccountForm } from "@/components/settings/AccountForm"
import { ConnectForm } from "@/components/settings/ConnectForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/contexts/LanguageContext"
import { useTheme } from "@/contexts/ThemeContext"

const settingsMenu = [
    { id: "account", name: "Account", icon: User, description: "Manage your account details" },
    { id: "connect", name: "Connections", icon: Link2, description: "Connected accounts" },
    { id: "notifications", name: "Notifications", icon: Bell, description: "Notification preferences" },
    { id: "security", name: "Security", icon: Shield, description: "Security settings" },
    { id: "language", name: "Language", icon: Globe, description: "Language & region" },
    { id: "appearance", name: "Appearance", icon: Palette, description: "Theme settings" },
]

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState("account")
    const { data: session } = useSession()
    const { language, setLanguage } = useLanguage()
    const { theme, setTheme, primaryColor, setPrimaryColor, compactMode, setCompactMode, showAnimations, setShowAnimations } = useTheme()

    const primaryColors = [
        { id: "sky", name: "Sky", color: "bg-sky-100" },
        { id: "violet", name: "Violet", color: "bg-violet-100" },
        { id: "blue", name: "Blue", color: "bg-blue-100" },
        { id: "indigo", name: "Indigo", color: "bg-indigo-100" },
        { id: "cyan", name: "Cyan", color: "bg-cyan-100" },
        { id: "teal", name: "Teal", color: "bg-teal-100" },
        { id: "green", name: "Green", color: "bg-green-100" },
        { id: "amber", name: "Amber", color: "bg-amber-100" },
        { id: "orange", name: "Orange", color: "bg-orange-100" },
        { id: "rose", name: "Rose", color: "bg-rose-100" },
        { id: "pink", name: "Pink", color: "bg-pink-100" },
        { id: "slate", name: "Slate", color: "bg-slate-200" },
        { id: "emerald", name: "Emerald", color: "bg-emerald-100" },
        { id: "lavender", name: "Lavender", color: "bg-purple-50" },
    ]

    return (
        <div className="h-full">
            <div className="bg-white rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
                <div className="flex gap-6 p-6 flex-1 overflow-auto">
                    {/* Settings Sidebar */}
                    <div className="w-64 flex-shrink-0">
                        <div className="bg-gray-50 rounded-xl p-4">
                            <h2 className="text-lg font-semibold mb-4 px-2">Settings</h2>
                            <nav className="space-y-1">
                                {settingsMenu.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveSection(item.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                                            activeSection === item.id
                                                ? "bg-primary/10 text-primary"
                                                : "text-gray-600 hover:bg-white"
                                        )}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <div>
                                            <div className="font-medium text-sm">{item.name}</div>
                                            <div className="text-xs text-muted-foreground">{item.description}</div>
                                        </div>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Settings Content */}
                    <div className="flex-1 max-w-3xl">
                        <div className="bg-gray-50 rounded-xl p-6">
                            {activeSection === "account" && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold">Account Settings</h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Manage your account information and preferences
                                </p>
                            </div>
                            <div className="border-t pt-6">
                                <AccountForm />
                            </div>
                        </div>
                    )}

                    {activeSection === "connect" && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold">Connected Accounts</h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Connect your social media and advertising accounts
                                </p>
                            </div>
                            <div className="border-t pt-6">
                                <ConnectForm isConnected={false} />
                            </div>
                        </div>
                    )}

                    {activeSection === "notifications" && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold">Notification Preferences</h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Choose what notifications you want to receive
                                </p>
                            </div>
                            <div className="border-t pt-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="font-medium">Email Notifications</Label>
                                        <p className="text-sm text-muted-foreground">Receive email updates about your ads</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="font-medium">Campaign Alerts</Label>
                                        <p className="text-sm text-muted-foreground">Get notified when campaigns need attention</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="font-medium">Weekly Reports</Label>
                                        <p className="text-sm text-muted-foreground">Receive weekly performance reports</p>
                                    </div>
                                    <Switch />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="font-medium">Budget Alerts</Label>
                                        <p className="text-sm text-muted-foreground">Alert when budget is running low</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === "security" && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold">Security Settings</h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Manage your account security
                                </p>
                            </div>
                            <div className="border-t pt-6 space-y-4">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
                                        <CardDescription>Add an extra layer of security to your account</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Status: Not enabled</span>
                                            <Switch />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Session Management</CardTitle>
                                        <CardDescription>Manage your active sessions</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm text-muted-foreground">
                                            Current session: {session?.user?.email || "Unknown"}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {activeSection === "language" && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold">Language & Region</h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Set your preferred language and regional settings
                                </p>
                            </div>
                            <div className="border-t pt-6 space-y-4">
                                <div className="space-y-2">
                                    <Label className="font-medium">Display Language</Label>
                                    <Select value={language} onValueChange={(value: 'en' | 'th') => setLanguage(value)}>
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Select language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">English</SelectItem>
                                            <SelectItem value="th">ไทย (Thai)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-medium">Timezone</Label>
                                    <Select defaultValue="asia-bangkok">
                                        <SelectTrigger className="w-[280px]">
                                            <SelectValue placeholder="Select timezone" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="asia-bangkok">Asia/Bangkok (GMT+7)</SelectItem>
                                            <SelectItem value="asia-singapore">Asia/Singapore (GMT+8)</SelectItem>
                                            <SelectItem value="utc">UTC (GMT+0)</SelectItem>
                                            <SelectItem value="america-newyork">America/New York (GMT-5)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-medium">Currency Display</Label>
                                    <Select defaultValue="usd">
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Select currency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="usd">USD ($)</SelectItem>
                                            <SelectItem value="thb">THB (฿)</SelectItem>
                                            <SelectItem value="eur">EUR (€)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === "appearance" && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold">Appearance</h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Customize the look and feel of the application
                                </p>
                            </div>
                            <div className="border-t pt-6 space-y-6">
                                <div className="space-y-3">
                                    <Label className="font-medium">Theme</Label>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => setTheme("light")}
                                            className={cn(
                                                "flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all",
                                                theme === "light" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                                            )}
                                        >
                                            <div className="w-16 h-10 bg-white border rounded shadow-sm"></div>
                                            <span className={cn("text-sm", theme === "light" ? "font-medium text-primary" : "")}>Light</span>
                                        </button>
                                        <button 
                                            onClick={() => setTheme("dark")}
                                            className={cn(
                                                "flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all",
                                                theme === "dark" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                                            )}
                                        >
                                            <div className="w-16 h-10 bg-gray-900 rounded shadow-sm"></div>
                                            <span className={cn("text-sm", theme === "dark" ? "font-medium text-primary" : "")}>Dark</span>
                                        </button>
                                        <button 
                                            onClick={() => setTheme("system")}
                                            className={cn(
                                                "flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all",
                                                theme === "system" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                                            )}
                                        >
                                            <div className="w-16 h-10 bg-gradient-to-b from-white to-gray-900 rounded shadow-sm"></div>
                                            <span className={cn("text-sm", theme === "system" ? "font-medium text-primary" : "")}>System</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="font-medium">Primary Color</Label>
                                    <div className="flex flex-wrap gap-3">
                                        {primaryColors.map((color) => (
                                            <button
                                                key={color.id}
                                                onClick={() => setPrimaryColor(color.id as any)}
                                                className={cn(
                                                    "flex flex-col items-center gap-2 p-3 border-2 rounded-lg transition-all min-w-[80px]",
                                                    primaryColor === color.id ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                                                )}
                                            >
                                                <div className={cn("w-8 h-8 rounded-full shadow-sm", color.color)}></div>
                                                <span className={cn("text-xs", primaryColor === color.id ? "font-medium text-primary" : "")}>{color.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between py-2">
                                    <div>
                                        <Label className="font-medium">Compact Mode</Label>
                                        <p className="text-sm text-muted-foreground">Use smaller spacing and fonts</p>
                                    </div>
                                    <Switch checked={compactMode} onCheckedChange={setCompactMode} />
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <div>
                                        <Label className="font-medium">Show Animations</Label>
                                        <p className="text-sm text-muted-foreground">Enable UI animations</p>
                                    </div>
                                    <Switch checked={showAnimations} onCheckedChange={setShowAnimations} />
                                </div>
                            </div>
                        </div>
                    )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
