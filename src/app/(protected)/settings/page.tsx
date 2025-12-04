"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { User, Link2, Bell, Shield, Globe, Palette, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { AccountForm } from "@/components/settings/AccountForm"
import { ConnectForm } from "@/components/settings/ConnectForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/contexts/LanguageContext"
import { useTheme } from "@/contexts/ThemeContext"
import { toast } from "sonner"
import Link from "next/link"

const settingsMenu = [
    { id: "account", name: "Account", icon: User, description: "Manage your account details" },
    { id: "connect", name: "Connections", icon: Link2, description: "Connected accounts" },
    { id: "notifications", name: "Notifications", icon: Bell, description: "Notification preferences" },
    { id: "security", name: "Security", icon: Shield, description: "Security settings" },
    { id: "language", name: "Language", icon: Globe, description: "Language & region" },
    { id: "appearance", name: "Appearance", icon: Palette, description: "Theme settings" },
    { id: "danger", name: "Delete Account", icon: Trash2, description: "Permanently delete account" },
]

interface UserSettings {
    language: string
    timezone: string
    currency: string
    theme: string
    primaryColor: string
    compactMode: boolean
    showAnimations: boolean
    emailNotifications: boolean
    campaignAlerts: boolean
    weeklyReports: boolean
    budgetAlerts: boolean
    twoFactorEnabled: boolean
}

export default function SettingsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const activeSection = searchParams.get("tab") || "account"
    const { data: session } = useSession()
    const { language, setLanguage } = useLanguage()
    const { theme, setTheme, primaryColor, setPrimaryColor, compactMode, setCompactMode, showAnimations, setShowAnimations } = useTheme()
    
    const [settings, setSettings] = useState<UserSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState("")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)

    // Load settings from database
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch("/api/settings")
                if (res.ok) {
                    const data = await res.json()
                    setSettings(data)
                    // Sync with context
                    if (data.language) setLanguage(data.language as 'en' | 'th')
                    if (data.theme) setTheme(data.theme as any)
                    if (data.primaryColor) setPrimaryColor(data.primaryColor as any)
                    if (data.compactMode !== undefined) setCompactMode(data.compactMode)
                    if (data.showAnimations !== undefined) setShowAnimations(data.showAnimations)
                }
            } catch (error) {
                console.error("Failed to load settings:", error)
            } finally {
                setLoading(false)
            }
        }
        loadSettings()
    }, [])

    // Save setting to database
    const saveSetting = async (key: string, value: any) => {
        setSaving(true)
        try {
            const res = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [key]: value })
            })
            if (res.ok) {
                const data = await res.json()
                setSettings(data)
                toast.success("Setting saved")
            } else {
                toast.error("Failed to save setting")
            }
        } catch (error) {
            toast.error("Failed to save setting")
        } finally {
            setSaving(false)
        }
    }

    // Handle setting change with save
    const handleSettingChange = (key: string, value: any) => {
        // Update context immediately for UX
        switch (key) {
            case 'language':
                setLanguage(value as 'en' | 'th')
                break
            case 'theme':
                setTheme(value)
                break
            case 'primaryColor':
                setPrimaryColor(value)
                break
            case 'compactMode':
                setCompactMode(value)
                break
            case 'showAnimations':
                setShowAnimations(value)
                break
        }
        // Save to database
        saveSetting(key, value)
    }

    // Delete account
    const handleDeleteAccount = async () => {
        if (deleteConfirm !== "DELETE") {
            toast.error("Please type DELETE to confirm")
            return
        }
        
        setDeleting(true)
        try {
            const res = await fetch("/api/account/delete", {
                method: "DELETE"
            })
            if (res.ok) {
                toast.success("Account deleted successfully")
                signOut({ callbackUrl: "/" })
            } else {
                toast.error("Failed to delete account")
            }
        } catch (error) {
            toast.error("Failed to delete account")
        } finally {
            setDeleting(false)
        }
    }

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
                                    <Link
                                        key={item.id}
                                        href={`/settings?tab=${item.id}`}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                                            activeSection === item.id
                                                ? item.id === "danger" 
                                                    ? "bg-red-50 text-red-600"
                                                    : "bg-primary/10 text-primary"
                                                : item.id === "danger"
                                                    ? "text-red-500 hover:bg-red-50"
                                                    : "text-gray-600 hover:bg-white"
                                        )}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <div>
                                            <div className="font-medium text-sm">{item.name}</div>
                                            <div className={cn(
                                                "text-xs",
                                                item.id === "danger" ? "text-red-400" : "text-muted-foreground"
                                            )}>{item.description}</div>
                                        </div>
                                    </Link>
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
                                <ConnectForm />
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
                                    <Switch 
                                        checked={settings?.emailNotifications ?? true}
                                        onCheckedChange={(v) => handleSettingChange('emailNotifications', v)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="font-medium">Campaign Alerts</Label>
                                        <p className="text-sm text-muted-foreground">Get notified when campaigns need attention</p>
                                    </div>
                                    <Switch 
                                        checked={settings?.campaignAlerts ?? true}
                                        onCheckedChange={(v) => handleSettingChange('campaignAlerts', v)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="font-medium">Weekly Reports</Label>
                                        <p className="text-sm text-muted-foreground">Receive weekly performance reports</p>
                                    </div>
                                    <Switch 
                                        checked={settings?.weeklyReports ?? false}
                                        onCheckedChange={(v) => handleSettingChange('weeklyReports', v)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="font-medium">Budget Alerts</Label>
                                        <p className="text-sm text-muted-foreground">Alert when budget is running low</p>
                                    </div>
                                    <Switch 
                                        checked={settings?.budgetAlerts ?? true}
                                        onCheckedChange={(v) => handleSettingChange('budgetAlerts', v)}
                                    />
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
                                            <span className="text-sm text-muted-foreground">
                                                Status: {settings?.twoFactorEnabled ? "Enabled" : "Not enabled"}
                                            </span>
                                            <Switch 
                                                checked={settings?.twoFactorEnabled ?? false}
                                                onCheckedChange={(v) => handleSettingChange('twoFactorEnabled', v)}
                                            />
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
                                    <Select 
                                        value={settings?.language || language} 
                                        onValueChange={(value) => handleSettingChange('language', value)}
                                    >
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
                                    <Select 
                                        value={settings?.timezone || "asia-bangkok"}
                                        onValueChange={(value) => handleSettingChange('timezone', value)}
                                    >
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
                                    <Select 
                                        value={settings?.currency || "usd"}
                                        onValueChange={(value) => handleSettingChange('currency', value)}
                                    >
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
                                            onClick={() => handleSettingChange('theme', 'light')}
                                            className={cn(
                                                "flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all",
                                                (settings?.theme || theme) === "light" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                                            )}
                                        >
                                            <div className="w-16 h-10 bg-white border rounded shadow-sm"></div>
                                            <span className={cn("text-sm", (settings?.theme || theme) === "light" ? "font-medium text-primary" : "")}>Light</span>
                                        </button>
                                        <button 
                                            onClick={() => handleSettingChange('theme', 'dark')}
                                            className={cn(
                                                "flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all",
                                                (settings?.theme || theme) === "dark" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                                            )}
                                        >
                                            <div className="w-16 h-10 bg-gray-900 rounded shadow-sm"></div>
                                            <span className={cn("text-sm", (settings?.theme || theme) === "dark" ? "font-medium text-primary" : "")}>Dark</span>
                                        </button>
                                        <button 
                                            onClick={() => handleSettingChange('theme', 'system')}
                                            className={cn(
                                                "flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all",
                                                (settings?.theme || theme) === "system" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                                            )}
                                        >
                                            <div className="w-16 h-10 bg-gradient-to-b from-white to-gray-900 rounded shadow-sm"></div>
                                            <span className={cn("text-sm", (settings?.theme || theme) === "system" ? "font-medium text-primary" : "")}>System</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="font-medium">Primary Color</Label>
                                    <div className="flex flex-wrap gap-3">
                                        {primaryColors.map((color) => (
                                            <button
                                                key={color.id}
                                                onClick={() => handleSettingChange('primaryColor', color.id)}
                                                className={cn(
                                                    "flex flex-col items-center gap-2 p-3 border-2 rounded-lg transition-all min-w-[80px]",
                                                    (settings?.primaryColor || primaryColor) === color.id ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                                                )}
                                            >
                                                <div className={cn("w-8 h-8 rounded-full shadow-sm", color.color)}></div>
                                                <span className={cn("text-xs", (settings?.primaryColor || primaryColor) === color.id ? "font-medium text-primary" : "")}>{color.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between py-2">
                                    <div>
                                        <Label className="font-medium">Compact Mode</Label>
                                        <p className="text-sm text-muted-foreground">Use smaller spacing and fonts</p>
                                    </div>
                                    <Switch 
                                        checked={settings?.compactMode ?? compactMode} 
                                        onCheckedChange={(v) => handleSettingChange('compactMode', v)} 
                                    />
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <div>
                                        <Label className="font-medium">Show Animations</Label>
                                        <p className="text-sm text-muted-foreground">Enable UI animations</p>
                                    </div>
                                    <Switch 
                                        checked={settings?.showAnimations ?? showAnimations} 
                                        onCheckedChange={(v) => handleSettingChange('showAnimations', v)} 
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === "danger" && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold text-red-600">Delete Account</h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Permanently delete your account and all associated data
                                </p>
                            </div>
                            <div className="border-t pt-6">
                                <Card className="border-red-200 bg-red-50">
                                    <CardHeader>
                                        <CardTitle className="text-red-600 flex items-center gap-2">
                                            <Trash2 className="w-5 h-5" />
                                            Danger Zone
                                        </CardTitle>
                                        <CardDescription className="text-red-500">
                                            This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="text-sm text-gray-700">
                                            <p className="font-medium mb-2">Deleting your account will:</p>
                                            <ul className="list-disc list-inside space-y-1 text-gray-600">
                                                <li>Remove all your personal information</li>
                                                <li>Disconnect all linked accounts (Facebook, Google)</li>
                                                <li>Delete all your ad accounts and data</li>
                                                <li>Remove all settings and preferences</li>
                                            </ul>
                                        </div>
                                        
                                        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="destructive" className="w-full">
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete My Account
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle className="text-red-600">Are you absolutely sure?</DialogTitle>
                                                    <DialogDescription>
                                                        This action cannot be undone. Please type <strong>DELETE</strong> to confirm.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="py-4">
                                                    <Input
                                                        placeholder="Type DELETE to confirm"
                                                        value={deleteConfirm}
                                                        onChange={(e) => setDeleteConfirm(e.target.value)}
                                                        className="border-red-200 focus:border-red-500"
                                                    />
                                                </div>
                                                <DialogFooter>
                                                    <Button 
                                                        variant="outline" 
                                                        onClick={() => {
                                                            setDeleteDialogOpen(false)
                                                            setDeleteConfirm("")
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button 
                                                        variant="destructive" 
                                                        onClick={handleDeleteAccount}
                                                        disabled={deleteConfirm !== "DELETE" || deleting}
                                                    >
                                                        {deleting ? "Deleting..." : "Delete Account"}
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </CardContent>
                                </Card>
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
