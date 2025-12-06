"use client"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import { Facebook, CheckCircle2, AlertCircle, ExternalLink, Shield } from "lucide-react"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/contexts/LanguageContext"

interface FacebookAccount {
    isConnected: boolean
    providerAccountId?: string
    scope?: string
    tokenExpires?: Date | null
}

interface ConnectFormProps {
    facebookAccount?: FacebookAccount
}

export function ConnectForm({ facebookAccount }: ConnectFormProps) {
    const { t, language } = useLanguage()
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    // Support both old and new props format
    const account: FacebookAccount = facebookAccount || { isConnected: false }
    const isConnected = account.isConnected

    const handleConnect = async () => {
        setIsLoading(true)
        try {
            await signIn("facebook", { callbackUrl: "/settings?tab=connect" })
        } catch (error) {
            toast.error(t.settings.connect.messages.connectError)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDisconnect = async () => {
        setIsLoading(true)
        try {
            const response = await fetch("/api/auth/disconnect-facebook", {
                method: "POST",
            })

            if (!response.ok) throw new Error("Failed to disconnect")

            toast.success(t.settings.connect.messages.disconnectConfirm)
            router.refresh()
        } catch (error) {
            toast.error(t.settings.connect.messages.disconnectError)
        } finally {
            setIsLoading(false)
        }
    }

    // Parse scopes for display
    const getPermissions = () => {
        if (!account.scope) return []
        return account.scope.split(',').map(s => s.trim())
    }

    // Check if token is expired
    const isTokenExpired = () => {
        if (!account.tokenExpires) return false
        return new Date() > new Date(account.tokenExpires)
    }

    // Format expiry date
    const formatExpiry = () => {
        if (!account.tokenExpires) return 'Unknown'
        const date = new Date(account.tokenExpires)
        return date.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Facebook className="h-5 w-5 text-blue-600" />
                    {t.settings.connect.facebookAds}
                </CardTitle>
                <CardDescription>
                    {t.settings.connect.facebookAdsDesc}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Connection Status Card */}
                <div className={`flex items-start space-x-4 rounded-xl border p-4 ${isConnected
                        ? isTokenExpired()
                            ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30'
                            : 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/30'
                    }`}>
                    {isConnected ? (
                        isTokenExpired() ? (
                            <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
                        ) : (
                            <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5" />
                        )
                    ) : (
                        <Facebook className="h-6 w-6 text-gray-400 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium leading-none">
                                {t.settings.connect.marketingApi}
                            </p>
                            {isConnected && (
                                <Badge variant={isTokenExpired() ? "destructive" : "default"} className="text-xs">
                                    {isTokenExpired() ? t.settings.connect.status.tokenExpired : t.settings.connect.status.connected}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {isConnected
                                ? isTokenExpired()
                                    ? t.settings.connect.messages.tokenExpired
                                    : t.settings.connect.messages.connectedReady
                                : t.settings.connect.messages.notConnected}
                        </p>
                    </div>
                    <Button
                        variant={isConnected ? "outline" : "default"}
                        onClick={isConnected ? handleDisconnect : handleConnect}
                        disabled={isLoading}
                        className={isConnected ? "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" : ""}
                    >
                        {isLoading ? t.settings.connect.buttons.loading : isConnected ? t.settings.connect.buttons.disconnect : t.settings.connect.buttons.connect}
                    </Button>
                </div>

                {/* Account Details - Only show when connected */}
                {isConnected && (
                    <div className="space-y-4 pt-2">
                        {/* Account Info */}
                        <div className="rounded-xl border bg-background p-4 space-y-3">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                                <Shield className="h-4 w-4 text-muted-foreground" />
                                {t.settings.connect.accountDetails}
                            </h4>

                            <div className="grid gap-2 text-sm">
                                <div className="flex justify-between items-center py-1.5 border-b border-dashed">
                                    <span className="text-muted-foreground">{t.settings.connect.facebookId}</span>
                                    <div className="flex items-center gap-2">
                                        <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
                                            {account.providerAccountId}
                                        </code>
                                        <a
                                            href={`https://facebook.com/${account.providerAccountId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-700"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center py-1.5 border-b border-dashed">
                                    <span className="text-muted-foreground">{t.settings.connect.tokenExpires}</span>
                                    <span className={isTokenExpired() ? "text-red-600 font-medium" : "text-foreground"}>
                                        {formatExpiry()}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center py-1.5">
                                    <span className="text-muted-foreground">{t.common.status}</span>
                                    <Badge variant={isTokenExpired() ? "destructive" : "secondary"}>
                                        {isTokenExpired() ? t.settings.connect.status.expired : t.settings.connect.status.active}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Permissions */}
                        {account.scope && (
                            <div className="rounded-xl border bg-background p-4 space-y-3">
                                <h4 className="text-sm font-medium">{t.settings.connect.grantedPermissions}</h4>
                                <div className="flex flex-wrap gap-2">
                                    {getPermissions().map((permission, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                            {permission.replace(/_/g, ' ')}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Reconnect hint if expired */}
                        {isTokenExpired() && (
                            <div className="rounded-xl border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30 p-4">
                                <div className="flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                            {t.settings.connect.reconnectTitle}
                                        </p>
                                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                            {t.settings.connect.reconnectDesc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
