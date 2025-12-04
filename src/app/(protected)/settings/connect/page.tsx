import { Separator } from "@/components/ui/separator"
import { ConnectForm } from "@/components/settings/ConnectForm"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

interface FacebookAccount {
    isConnected: boolean
    providerAccountId?: string
    scope?: string
    tokenExpires?: Date | null
}

export default async function SettingsConnectPage() {
    const session = await getServerSession(authOptions)
    let facebookAccount: FacebookAccount = { isConnected: false }

    if (session?.user?.id) {
        const account = await db.account.findFirst({
            where: {
                userId: session.user.id,
                provider: "facebook",
            },
            select: {
                providerAccountId: true,
                scope: true,
                expires_at: true,
                access_token: true,
            }
        })
        
        if (account) {
            facebookAccount = {
                isConnected: true,
                providerAccountId: account.providerAccountId,
                scope: account.scope || undefined,
                tokenExpires: account.expires_at ? new Date(account.expires_at * 1000) : null,
            }
        }
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
            <ConnectForm facebookAccount={facebookAccount} />
        </div>
    )
}
