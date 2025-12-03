import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAdAccounts, getCampaignsWithDeliveryStatus, getAdSetsWithDeliveryStatus, getAds } from "@/lib/facebook"
import { getCachedData } from "@/lib/cache"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") || "accounts"
    const accountId = searchParams.get("accountId")
    const accountIdsParam = searchParams.get("accountIds")
    const accountIds = accountIdsParam ? accountIdsParam.split(",") : (accountId ? [accountId] : [])

    const campaignIdsParam = searchParams.get("campaignIds")
    const campaignIds = campaignIdsParam ? campaignIdsParam.split(",") : []

    const adSetIdsParam = searchParams.get("adSetIds")
    const adSetIds = adSetIdsParam ? adSetIdsParam.split(",") : []

    try {
        const account = await db.account.findFirst({
            where: {
                userId: session.user.id,
                provider: "facebook",
            },
        })

        if (!account || !account.access_token) {
            return NextResponse.json({ error: "Facebook account not connected" }, { status: 400 })
        }

        const cacheKey = [
            `ads-basic-${session.user.id}`,
            type,
            accountIds.join(','),
            campaignIds.join(','),
            adSetIds.join(',')
        ]

        // let data: any[] = await getCachedData(cacheKey, async () => {
        let result: any[] = []
        if (type === "accounts") {
            result = await getAdAccounts(account.access_token!)
        } else if (type === "campaigns" && accountIds.length > 0) {
            const promises = accountIds.map(id => getCampaignsWithDeliveryStatus(account.access_token!, `act_${id}`))
            const results = await Promise.all(promises)
            result = results.flat()
        } else if (type === "adsets" && accountIds.length > 0) {
            const promises = accountIds.map(id => getAdSetsWithDeliveryStatus(account.access_token!, `act_${id}`, campaignIds.length > 0 ? campaignIds : undefined))
            const results = await Promise.all(promises)
            result = results.flat()
        } else if (type === "ads" && accountIds.length > 0) {
            const promises = accountIds.map(id => getAds(account.access_token!, `act_${id}`, adSetIds.length > 0 ? adSetIds : undefined))
            const results = await Promise.all(promises)
            result = results.flat()
        }
        // return result
        // }, 300) // Cache for 5 minutes
        let data = result

        return NextResponse.json({ data })
    } catch (error: any) {
        console.error("Facebook API Error:", error?.message || error)
        console.error("Error stack:", error?.stack)
        console.error("Error response:", JSON.stringify(error?.response?.data || error?.response || {}, null, 2))
        
        // Extract meaningful error message
        let errorMessage = "Failed to fetch data"
        if (error?.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message
        } else if (error?.message) {
            errorMessage = error.message
        }
        
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
