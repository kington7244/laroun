import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { initFacebookSdk } from "@/lib/facebook"
import { AdAccount } from "facebook-nodejs-business-sdk"
import { getCachedData } from "@/lib/cache"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get("accountId")
    const type = searchParams.get("type")

    const accountIdsParam = searchParams.get("accountIds")
    const accountIds = accountIdsParam ? accountIdsParam.split(",") : (accountId ? [accountId] : [])

    const campaignIdsParam = searchParams.get("campaignIds")
    const campaignIds = campaignIdsParam ? campaignIdsParam.split(",") : []

    const adSetIdsParam = searchParams.get("adSetIds")
    const adSetIds = adSetIdsParam ? adSetIdsParam.split(",") : []

    const since = searchParams.get("since")
    const until = searchParams.get("until")

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

        initFacebookSdk(account.access_token)

        const cacheKey = [
            `ads-insights-${session.user.id}`,
            type || 'unknown',
            accountIds.join(','),
            campaignIds.join(','),
            adSetIds.join(','),
            since || 'default',
            until || 'default'
        ]

        // let data: any[] = await getCachedData(cacheKey, async () => {
        let results: any[] = []
        if (accountIds.length > 0) {
            const promises = accountIds.map(async (id) => {
                const adAccount = new AdAccount(`act_${id}`)
                let level: 'account' | 'campaign' | 'adset' | 'ad' = 'account'

                if (type === 'campaigns') level = 'campaign'
                if (type === 'adsets') level = 'adset'
                if (type === 'ads') level = 'ad'

                const params: any = { level, date_preset: 'maximum' }
                if (since && until) {
                    params.time_range = { since, until }
                    delete params.date_preset
                }

                // Add filtering
                if (type === 'adsets' && campaignIds.length > 0) {
                    params.filtering = [{ field: 'campaign.id', operator: 'IN', value: campaignIds }]
                } else if (type === 'ads' && adSetIds.length > 0) {
                    params.filtering = [{ field: 'adset.id', operator: 'IN', value: adSetIds }]
                }

                let allInsights: any[] = []
                let currentInsights: any = await adAccount.getInsights(
                    [
                        'account_id',
                        'campaign_id',
                        'adset_id',
                        'ad_id',
                        'spend',
                        'impressions',
                        'clicks',
                        'cpc',
                        'cpm',
                        'reach',
                        'actions',
                        'cost_per_action_type',
                        'video_play_actions',
                        'video_avg_time_watched_actions',
                        'video_p25_watched_actions',
                        'video_p50_watched_actions',
                        'video_p75_watched_actions',
                        'video_p95_watched_actions',
                        'video_p100_watched_actions'
                    ],
                    params
                )

                allInsights = [...currentInsights]
                while (currentInsights.hasNext()) {
                    currentInsights = await currentInsights.next()
                    allInsights = [...allInsights, ...currentInsights]
                }

                console.log(`Insights for ${id} (${level}): Found ${allInsights.length} records`)

                return allInsights.map((i: any) => {
                    const mappedId = i[level + '_id'] || i.account_id

                    return {
                        id: mappedId,
                        spend: i.spend,
                        impressions: i.impressions,
                        clicks: i.clicks,
                        reach: i.reach,
                        actions: i.actions,
                        costPerActionType: i.cost_per_action_type,
                        videoAvgTimeWatched: i.video_avg_time_watched_actions?.[0]?.value,
                        videoPlays: i.video_play_actions?.[0]?.value,
                        videoP25Watched: i.video_p25_watched_actions?.[0]?.value,
                        videoP50Watched: i.video_p50_watched_actions?.[0]?.value,
                        videoP75Watched: i.video_p75_watched_actions?.[0]?.value,
                        videoP95Watched: i.video_p95_watched_actions?.[0]?.value,
                        videoP100Watched: i.video_p100_watched_actions?.[0]?.value,
                    }
                })
            })

            const promiseResults = await Promise.all(promises)
            results = promiseResults.flat()
        }
        // return results
        // }, 300) // Cache for 5 minutes
        let data = results

        return NextResponse.json({ data })
    } catch (error) {
        console.error("Error fetching Facebook insights:", error)
        return NextResponse.json({ error: "Failed to fetch Facebook insights" }, { status: 500 })
    }
}
