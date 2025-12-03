import { Separator } from "@/components/ui/separator"
import { ConnectForm } from "@/components/settings/ConnectForm"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export default async function SettingsConnectPage() {
    const session = await getServerSession(authOptions)
    let isConnected = false

    if (session?.user?.id) {
        const account = await db.account.findFirst({
            where: {
                userId: session.user.id,
                provider: "facebook",
            },
        })
        isConnected = !!account
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Connect</h3>
                <p className="text-sm text-muted-foreground">
                    Connect your Facebook Ads account.
                </p>
            </div>
            <Separator />
            <ConnectForm isConnected={isConnected} />
        </div>
    )
}
