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
import { Facebook } from "lucide-react"
import { signIn, signOut } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface ConnectFormProps {
    isConnected: boolean
}

export function ConnectForm({ isConnected: initialIsConnected }: ConnectFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleConnect = async () => {
        setIsLoading(true)
        try {
            await signIn("facebook", { callbackUrl: "/settings/connect" })
        } catch (error) {
            toast.error("Failed to connect to Facebook")
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

            toast.success("Disconnected from Facebook")
            router.refresh()
        } catch (error) {
            toast.error("Failed to disconnect")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Facebook Ads</CardTitle>
                <CardDescription>
                    Connect your Facebook account to manage your ads.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center space-x-4 rounded-md border p-4">
                    <Facebook className="h-6 w-6 text-blue-600" />
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                            Facebook Marketing API
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {initialIsConnected
                                ? "Connected to Facebook Ads"
                                : "Not connected"}
                        </p>
                    </div>
                    <Button
                        variant={initialIsConnected ? "destructive" : "default"}
                        onClick={initialIsConnected ? handleDisconnect : handleConnect}
                        disabled={isLoading}
                    >
                        {isLoading ? "Loading..." : initialIsConnected ? "Disconnect" : "Connect"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
