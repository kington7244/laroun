import { FacebookAdsApi, AdAccount, User } from "facebook-nodejs-business-sdk"

export const initFacebookSdk = (accessToken: string) => {
    FacebookAdsApi.init(accessToken)
}

export const getAdAccounts = async (accessToken: string) => {
    initFacebookSdk(accessToken)
    const user = new User("me")
    const accounts = await user.getAdAccounts([
        "account_id",
        "name",
        "account_status",
        "currency",
        "timezone_name",
        "timezone_offset_hours_utc",
        "business_country_code",
        "funding_source_details",
        "spend_cap",
        "amount_spent",
        "disable_reason",
    ], { limit: 1000 })

    // Get active ads count for each account
    const accountsWithAdsCount = await Promise.all(
        accounts.map(async (account: any) => {
            try {
                const offset = account.timezone_offset_hours_utc || 0
                const formattedOffset = offset >= 0 ? `+${offset}` : `${offset}`

                // Calculate delivery status for accounts first
                let deliveryStatus = account.account_status === 1 ? "ACTIVE" : "INACTIVE"

                // Check disable reasons - this should be checked first
                if (account.disable_reason && account.disable_reason !== 0) {
                    deliveryStatus = "DISABLED"
                }
                // Check account_status for disabled accounts (status 2 = DISABLED)
                else if (account.account_status === 2) {
                    deliveryStatus = "DISABLED"
                }
                // Check if spend limit reached (spend_cap is in cents, amount_spent is also in cents)
                else if (account.spend_cap && account.amount_spent) {
                    const spendCap = parseFloat(account.spend_cap)
                    const amountSpent = parseFloat(account.amount_spent)
                    if (spendCap > 0 && amountSpent >= spendCap) {
                        deliveryStatus = "SPEND_LIMIT_REACHED"
                    }
                }

                // Only count active ads if account is active
                let activeAdsCount = 0
                if (account.account_status === 1 && deliveryStatus !== "DISABLED") {
                    try {
                        const adAccount = new AdAccount(`act_${account.account_id}`)
                        const ads = await adAccount.getAds(["id", "effective_status"], {
                            limit: 1000,
                            filtering: [{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }]
                        })
                        activeAdsCount = ads.length
                    } catch (error) {
                        console.error(`Error fetching ads for account ${account.account_id}:`, error)
                    }
                }

                return {
                    id: account.account_id,
                    name: account.name,
                    status: account.account_status === 1 ? "ACTIVE" : "INACTIVE",
                    deliveryStatus: deliveryStatus,
                    activeAdsCount: activeAdsCount,
                    currency: account.currency,
                    timezone: `${account.timezone_name || 'Unknown'} | ${formattedOffset}`,
                    country: account.business_country_code || 'Unknown',
                    paymentMethod: account.funding_source_details?.display_string || "N/A",
                    spendCap: account.spend_cap,
                    amountSpent: account.amount_spent,
                }
            } catch (error) {
                console.error(`Error processing account ${account.account_id}:`, error)
                // Return a minimal account object on error
                return {
                    id: account.account_id,
                    name: account.name || 'Unknown',
                    status: "INACTIVE",
                    deliveryStatus: "ERROR",
                    activeAdsCount: 0,
                    currency: account.currency || 'USD',
                    timezone: 'Unknown',
                    country: 'Unknown',
                    paymentMethod: "N/A",
                    spendCap: null,
                    amountSpent: null,
                }
            }
        })
    )

    return accountsWithAdsCount
}

export const getCampaigns = async (accessToken: string, accountId: string) => {
    initFacebookSdk(accessToken)
    const account = new AdAccount(accountId)
    const campaigns = await account.getCampaigns(["id", "name", "status", "objective", "daily_budget", "lifetime_budget", "effective_status"], { limit: 1000 })
    return campaigns.map((campaign: any) => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        effectiveStatus: campaign.effective_status,
        objective: campaign.objective,
        dailyBudget: campaign.daily_budget,
        lifetimeBudget: campaign.lifetime_budget,
    }))
}

// Get campaigns with calculated delivery status based on child ad sets and ads
export const getCampaignsWithDeliveryStatus = async (accessToken: string, accountId: string) => {
    initFacebookSdk(accessToken)
    const account = new AdAccount(accountId)

    // First check if account is disabled
    const accountInfo = await account.read(['account_status', 'disable_reason'])
    const isAccountDisabled = accountInfo.account_status !== 1 || (accountInfo.disable_reason && accountInfo.disable_reason !== 0)

    // Get campaigns, adsets, and ads in parallel
    const [campaigns, adsets, ads] = await Promise.all([
        account.getCampaigns(["id", "name", "status", "objective", "daily_budget", "lifetime_budget", "effective_status"], { limit: 1000 }),
        account.getAdSets(["id", "name", "status", "campaign_id", "effective_status"], { limit: 1000 }),
        account.getAds(["id", "name", "status", "adset_id", "effective_status"], { limit: 1000 })
    ])

    // Create lookup maps
    const adsByAdSetId = new Map<string, any[]>()
    ads.forEach((ad: any) => {
        const adsetId = ad.adset_id
        if (!adsByAdSetId.has(adsetId)) {
            adsByAdSetId.set(adsetId, [])
        }
        adsByAdSetId.get(adsetId)!.push(ad)
    })

    const adsetsByCampaignId = new Map<string, any[]>()
    adsets.forEach((adset: any) => {
        const campaignId = adset.campaign_id
        if (!adsetsByCampaignId.has(campaignId)) {
            adsetsByCampaignId.set(campaignId, [])
        }
        adsetsByCampaignId.get(campaignId)!.push(adset)
    })

    return campaigns.map((campaign: any) => {
        // If account is disabled, all campaigns show as account disabled
        if (isAccountDisabled) {
            return {
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                effectiveStatus: campaign.effective_status,
                deliveryStatus: 'ACCOUNT_DISABLED',
                objective: campaign.objective,
                dailyBudget: campaign.daily_budget,
                lifetimeBudget: campaign.lifetime_budget,
            }
        }

        const campaignAdSets = adsetsByCampaignId.get(campaign.id) || []
        const campaignAds: any[] = []
        campaignAdSets.forEach((adset: any) => {
            const adsForAdSet = adsByAdSetId.get(adset.id) || []
            campaignAds.push(...adsForAdSet)
        })

        // Calculate delivery status based on ads
        let deliveryStatus = campaign.effective_status

        if (campaign.status === 'PAUSED') {
            deliveryStatus = 'CAMPAIGN_OFF'
        } else if (campaignAdSets.length === 0) {
            deliveryStatus = 'NO_ADSETS'
        } else if (campaignAds.length === 0) {
            deliveryStatus = 'NO_ADS'
        } else {
            const activeAdSets = campaignAdSets.filter((as: any) => as.effective_status === 'ACTIVE')
            const activeAds = campaignAds.filter((a: any) => a.effective_status === 'ACTIVE')
            const pausedAds = campaignAds.filter((a: any) => a.status === 'PAUSED')
            const pausedAdSets = campaignAdSets.filter((as: any) => as.status === 'PAUSED')

            if (activeAds.length > 0) {
                deliveryStatus = 'ACTIVE'
            } else if (pausedAds.length === campaignAds.length && campaignAds.length > 0) {
                deliveryStatus = pausedAds.length === 1 ? 'AD_OFF' : 'ADS_OFF'
            } else if (pausedAdSets.length === campaignAdSets.length && campaignAdSets.length > 0) {
                deliveryStatus = pausedAdSets.length === 1 ? 'ADSET_OFF' : 'ADSETS_INACTIVE'
            } else if (activeAdSets.length === 0) {
                deliveryStatus = 'ADSETS_INACTIVE'
            }
        }

        return {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            effectiveStatus: campaign.effective_status,
            deliveryStatus: deliveryStatus,
            objective: campaign.objective,
            dailyBudget: campaign.daily_budget,
            lifetimeBudget: campaign.lifetime_budget,
        }
    })
}

// Get ad sets with calculated delivery status based on child ads
export const getAdSetsWithDeliveryStatus = async (accessToken: string, accountId: string, campaignIds?: string[]) => {
    initFacebookSdk(accessToken)
    const account = new AdAccount(accountId)

    // First check if account is disabled
    const accountInfo = await account.read(['account_status', 'disable_reason'])
    const isAccountDisabled = accountInfo.account_status !== 1 || (accountInfo.disable_reason && accountInfo.disable_reason !== 0)

    const adsetParams: any = { limit: 1000 }
    if (campaignIds && campaignIds.length > 0) {
        adsetParams.filtering = [{
            field: 'campaign.id',
            operator: 'IN',
            value: campaignIds
        }]
    }

    const [adsets, ads, campaigns] = await Promise.all([
        account.getAdSets(["id", "name", "status", "campaign_id", "daily_budget", "lifetime_budget", "effective_status"], adsetParams),
        account.getAds(["id", "name", "status", "adset_id", "effective_status"], { limit: 1000 }),
        account.getCampaigns(["id", "objective"], { limit: 1000 })
    ])

    // Create lookup map for campaign objectives
    const campaignObjectiveMap = new Map<string, string>()
    campaigns.forEach((campaign: any) => {
        campaignObjectiveMap.set(campaign.id, campaign.objective)
    })

    // Create lookup map for ads by adset
    const adsByAdSetId = new Map<string, any[]>()
    ads.forEach((ad: any) => {
        const adsetId = ad.adset_id
        if (!adsByAdSetId.has(adsetId)) {
            adsByAdSetId.set(adsetId, [])
        }
        adsByAdSetId.get(adsetId)!.push(ad)
    })

    return adsets.map((adset: any) => {
        // If account is disabled, all adsets show as account disabled
        if (isAccountDisabled) {
            return {
                id: adset.id,
                name: adset.name,
                status: adset.status,
                effectiveStatus: adset.effective_status,
                deliveryStatus: 'ACCOUNT_DISABLED',
                campaignId: adset.campaign_id,
                dailyBudget: adset.daily_budget,
                lifetimeBudget: adset.lifetime_budget,
            }
        }

        const adsetAds = adsByAdSetId.get(adset.id) || []

        // Calculate delivery status based on ads
        let deliveryStatus = adset.effective_status

        if (adset.status === 'PAUSED') {
            deliveryStatus = 'ADSET_OFF'
        } else if (adsetAds.length === 0) {
            deliveryStatus = 'NO_ADS'
        } else {
            const activeAds = adsetAds.filter((a: any) => a.effective_status === 'ACTIVE')
            const pausedAds = adsetAds.filter((a: any) => a.status === 'PAUSED')

            if (activeAds.length > 0) {
                deliveryStatus = 'ACTIVE'
            } else if (pausedAds.length === adsetAds.length && adsetAds.length > 0) {
                deliveryStatus = pausedAds.length === 1 ? 'AD_OFF' : 'ADS_INACTIVE'
            }
        }

        return {
            id: adset.id,
            name: adset.name,
            status: adset.status,
            effectiveStatus: adset.effective_status,
            deliveryStatus: deliveryStatus,
            campaignId: adset.campaign_id,
            objective: campaignObjectiveMap.get(adset.campaign_id) || null,
            dailyBudget: adset.daily_budget,
            lifetimeBudget: adset.lifetime_budget,
        }
    })
}

export const getAdSets = async (accessToken: string, accountId: string, campaignIds?: string[]) => {
    initFacebookSdk(accessToken)
    const account = new AdAccount(accountId)
    const params: any = {
        fields: ["id", "name", "status", "campaign_id"],
        limit: 1000
    }

    if (campaignIds && campaignIds.length > 0) {
        params.filtering = [{
            field: 'campaign.id',
            operator: 'IN',
            value: campaignIds
        }]
    }

    const adsets = await account.getAdSets(["id", "name", "status", "campaign_id", "daily_budget", "lifetime_budget", "effective_status"], params)
    return adsets.map((adset: any) => ({
        id: adset.id,
        name: adset.name,
        status: adset.status,
        effectiveStatus: adset.effective_status,
        campaignId: adset.campaign_id,
        dailyBudget: adset.daily_budget,
        lifetimeBudget: adset.lifetime_budget,
    }))
}

export const getAds = async (accessToken: string, accountId: string, adSetIds?: string[]) => {
    initFacebookSdk(accessToken)
    const account = new AdAccount(accountId)

    // First check if account is disabled
    const accountInfo = await account.read(['account_status', 'disable_reason'])
    const isAccountDisabled = accountInfo.account_status !== 1 || (accountInfo.disable_reason && accountInfo.disable_reason !== 0)

    const params: any = {
        fields: ["id", "name", "status", "adset_id"],
        limit: 1000
    }

    if (adSetIds && adSetIds.length > 0) {
        params.filtering = [{
            field: 'adset.id',
            operator: 'IN',
            value: adSetIds
        }]
    }

    // Fetch ads, adsets, and campaigns in parallel to get budget info
    const [ads, adsets, campaigns] = await Promise.all([
        account.getAds(["id", "name", "status", "adset_id", "effective_status", "creative{thumbnail_url,image_url,object_story_spec,actor_id,effective_object_story_id}"], params),
        account.getAdSets(["id", "campaign_id", "daily_budget", "lifetime_budget"], { limit: 1000 }),
        account.getCampaigns(["id", "daily_budget", "lifetime_budget", "objective"], { limit: 1000 })
    ])

    // Create a map of campaign budgets and objectives
    const campaignBudgetMap = new Map<string, { dailyBudget?: string, lifetimeBudget?: string, objective?: string }>()
    campaigns.forEach((campaign: any) => {
        campaignBudgetMap.set(campaign.id, {
            dailyBudget: campaign.daily_budget,
            lifetimeBudget: campaign.lifetime_budget,
            objective: campaign.objective
        })
    })

    // Create a map of adset budgets (with campaign fallback info)
    const adsetBudgetMap = new Map<string, { dailyBudget?: string, lifetimeBudget?: string, campaignId?: string }>()
    adsets.forEach((adset: any) => {
        adsetBudgetMap.set(adset.id, {
            dailyBudget: adset.daily_budget,
            lifetimeBudget: adset.lifetime_budget,
            campaignId: adset.campaign_id
        })
    })

    // Collect unique page IDs to fetch page info
    const pageIds = new Set<string>()
    ads.forEach((ad: any) => {
        // SDK returns data in _data property or direct access
        const adData = ad._data || ad
        const creative = adData.creative

        const pageId = creative?.actor_id || creative?.object_story_spec?.page_id
        if (pageId) pageIds.add(String(pageId))

        // Also try to get page ID from effective_object_story_id (format: pageId_postId)
        if (creative?.effective_object_story_id) {
            const parts = creative.effective_object_story_id.split('_')
            if (parts.length > 0) {
                pageIds.add(parts[0])
            }
        }
    })

    // Fetch page info for each page ID individually
    const pageInfoMap = new Map<string, { name: string, username?: string }>()
    if (pageIds.size > 0) {
        const pageIdsArray = Array.from(pageIds)

        // Fetch all pages in parallel
        const pagePromises = pageIdsArray.map(async (pageId) => {
            try {
                const response = await fetch(
                    `https://graph.facebook.com/v18.0/${pageId}?fields=name,username,link&access_token=${accessToken}`
                )
                const data = await response.json()
                console.log(`Page ${pageId} response:`, JSON.stringify(data))

                if (data && !data.error) {
                    return {
                        id: pageId,
                        name: data.name,
                        username: data.username
                    }
                }
            } catch (error) {
                console.error(`Error fetching page ${pageId}:`, error)
            }
            return null
        })

        const results = await Promise.all(pagePromises)
        results.forEach((result) => {
            if (result) {
                pageInfoMap.set(result.id, {
                    name: result.name,
                    username: result.username
                })
            }
        })
    }
    console.log("========== PAGE INFO MAP ==========")
    console.log(JSON.stringify(Array.from(pageInfoMap.entries()), null, 2))
    console.log("====================================")

    return ads.map((ad: any) => {
        let imageUrl = ad.creative?.thumbnail_url || ad.creative?.image_url

        // Try to extract from object_story_spec if not found
        if (!imageUrl && ad.creative?.object_story_spec) {
            const spec = ad.creative.object_story_spec
            imageUrl = spec.link_data?.picture || spec.video_data?.image_url || spec.photo_data?.url
        }

        // Extract page info from creative
        const pageId = ad.creative?.actor_id || ad.creative?.object_story_spec?.page_id || null
        const pageInfo = pageId ? pageInfoMap.get(pageId) : null
        const pageName = pageInfo?.username || pageInfo?.name || null

        // Get budget from parent AdSet, or fall back to Campaign budget (CBO)
        const adsetInfo = adsetBudgetMap.get(ad.adset_id)
        let dailyBudget = adsetInfo?.dailyBudget
        let lifetimeBudget = adsetInfo?.lifetimeBudget
        let budgetSource: 'adset' | 'campaign' | null = null
        let objective: string | null = null

        // Check if AdSet has its own budget
        if (dailyBudget || lifetimeBudget) {
            budgetSource = 'adset'
        }
        // If AdSet has no budget, use Campaign budget (Campaign Budget Optimization)
        if (adsetInfo?.campaignId) {
            const campaignInfo = campaignBudgetMap.get(adsetInfo.campaignId)
            if (!dailyBudget && !lifetimeBudget) {
                dailyBudget = campaignInfo?.dailyBudget
                lifetimeBudget = campaignInfo?.lifetimeBudget
                if (dailyBudget || lifetimeBudget) {
                    budgetSource = 'campaign'
                }
            }
            objective = campaignInfo?.objective || null
        }

        return {
            id: ad.id,
            name: ad.name,
            status: ad.status,
            effectiveStatus: ad.effective_status,
            deliveryStatus: isAccountDisabled ? 'ACCOUNT_DISABLED' : ad.effective_status,
            adsetId: ad.adset_id,
            objective,
            pageId,
            pageName,
            dailyBudget,
            lifetimeBudget,
            budgetSource,
            creative: ad.creative ? {
                thumbnailUrl: imageUrl,
                imageUrl: imageUrl // Use same URL for both for now
            } : null
        }
    })
}

export const getInsights = async (
    accessToken: string,
    accountId: string,
    level: 'campaign' | 'adset' | 'ad',
    dateRange?: { from: string, to: string }
) => {
    initFacebookSdk(accessToken)
    const account = new AdAccount(accountId)
    try {
        const fields = [
            'spend', 'impressions', 'clicks', 'cpc', 'ctr', 'reach', 'frequency', 'actions',
            'video_avg_time_watched_actions',
            'video_play_actions',
            'video_p25_watched_actions',
            'video_p50_watched_actions',
            'video_p75_watched_actions',
            'video_p95_watched_actions',
            'video_p100_watched_actions',
            'cost_per_action_type'
        ]
        if (level === 'campaign') fields.push('campaign_id')
        if (level === 'adset') fields.push('adset_id')
        if (level === 'ad') fields.push('ad_id')

        const params: any = {
            level,
            limit: 1000
        }

        if (dateRange) {
            params.time_range = {
                since: dateRange.from,
                until: dateRange.to
            }
        } else {
            params.date_preset = 'maximum'
        }

        const insights = await account.getInsights(fields, params)

        return insights.map((i: any) => {
            const getActionValue = (actions: any[], type: string) => {
                const action = actions?.find((a: any) => a.action_type === type)
                return action ? parseFloat(action.value) : 0
            }

            const getCostValue = (costs: any[], type: string) => {
                const cost = costs?.find((c: any) => c.action_type === type)
                return cost ? parseFloat(cost.value) : 0
            }

            return {
                id: i.campaign_id || i.adset_id || i.ad_id,
                spend: i.spend,
                impressions: i.impressions,
                clicks: i.clicks,
                cpc: i.cpc,
                ctr: i.ctr,
                reach: i.reach,
                frequency: i.frequency,
                postEngagements: getActionValue(i.actions, 'post_engagement'),
                newMessagingContacts: getActionValue(i.actions, 'onsite_conversion.messaging_conversation_started_7d'),
                costPerNewMessagingContact: getCostValue(i.cost_per_action_type, 'onsite_conversion.messaging_conversation_started_7d'),
                videoAvgTimeWatched: i.video_avg_time_watched_actions?.[0]?.value,
                videoPlays: i.video_play_actions?.[0]?.value,
                video3SecWatched: getActionValue(i.actions, 'video_view'), // 'video_view' is often 3-second views
                videoP25Watched: i.video_p25_watched_actions?.[0]?.value,
                videoP50Watched: i.video_p50_watched_actions?.[0]?.value,
                videoP75Watched: i.video_p75_watched_actions?.[0]?.value,
                videoP95Watched: i.video_p95_watched_actions?.[0]?.value,
                videoP100Watched: i.video_p100_watched_actions?.[0]?.value,
                actions: i.actions,
                costPerActionType: i.cost_per_action_type
            }
        })
    } catch (error) {
        console.error(`Error fetching insights for ${accountId} at level ${level}:`, error)
        return []
    }
}

// ===== Facebook Pages API Functions (for AdBox) =====

export async function getPages(accessToken: string) {
    console.log('[getPages] Calling Facebook API...');
    const response = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,category,picture&access_token=${accessToken}`
    )
    const data = await response.json()

    console.log('[getPages] Response:', JSON.stringify(data).slice(0, 500));

    if (data.error) {
        console.error('[getPages] Facebook error:', data.error);
        throw new Error(data.error.message)
    }

    return data.data || []
}

// Exchange short-lived user token to long-lived, then fetch page token; also return app (business) token
export async function getFreshPageAccessToken(
    userAccessToken: string,
    pageId: string
) {
    let workingUserToken = userAccessToken
    let pageAccessToken: string | null = null
    let appAccessToken: string | null = null

    const appId = process.env.FACEBOOK_APP_ID
    const appSecret = process.env.FACEBOOK_APP_SECRET

    // Helper to fetch page token using a user token with timeout
    const fetchPageToken = async (token: string) => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        try {
            const resp = await fetch(
                `https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${token}`,
                { signal: controller.signal }
            )
            const data = await resp.json()
            if (data?.access_token) return data.access_token
            throw new Error(data?.error?.message || 'Failed to fetch page token')
        } finally {
            clearTimeout(timeout)
        }
    }

    try {
        pageAccessToken = await fetchPageToken(workingUserToken)
    } catch (e) {
        // Try to exchange for a long-lived token then retry
        if (appId && appSecret) {
            try {
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 5000)
                const exchangeResp = await fetch(
                    `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${workingUserToken}`,
                    { signal: controller.signal }
                )
                clearTimeout(timeout)
                const exchangeData = await exchangeResp.json()
                if (exchangeData?.access_token) {
                    workingUserToken = exchangeData.access_token
                    pageAccessToken = await fetchPageToken(workingUserToken)
                }
            } catch (err) {
                console.error('[getFreshPageAccessToken] exchange failed:', err instanceof Error ? err.message : String(err))
            }
        }
    }

    // App (business) token via client credentials
    if (appId && appSecret) {
        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 5000)
            const appResp = await fetch(
                `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`,
                { signal: controller.signal }
            )
            clearTimeout(timeout)
            const appData = await appResp.json()
            if (appData?.access_token) {
                appAccessToken = appData.access_token
            }
        } catch (err) {
            console.error('[getFreshPageAccessToken] app token failed:', err instanceof Error ? err.message : String(err))
        }
    }

    return {
        pageAccessToken,
        refreshedUserToken: workingUserToken !== userAccessToken ? workingUserToken : null,
        appAccessToken,
    }
}

export async function getPageConversations(userAccessToken: string, pageId: string, pageAccessToken?: string) {
    const token = pageAccessToken || userAccessToken

    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)
        const response = await fetch(
            `https://graph.facebook.com/v21.0/${pageId}/conversations?` +
            `fields=id,snippet,updated_time,unread_count,participants,link&` +
            `limit=50&access_token=${token}`,
            { signal: controller.signal }
        )
        clearTimeout(timeout)
        const data = await response.json()

        if (data.error) {
            console.error(`Error fetching conversations for page ${pageId}:`, data.error)
            return []
        }

        return data.data || []
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            console.error(`Timeout fetching conversations for page ${pageId}`)
        } else {
            console.error(`Error fetching conversations:`, err instanceof Error ? err.message : String(err))
        }
        return []
    }
}

export async function getConversationMessages(
    userAccessToken: string,
    conversationId: string,
    pageId: string,
    pageAccessToken?: string,
    limit: number = 100,
    after?: string
) {
    const token = pageAccessToken || userAccessToken

    try {
        let url = `https://graph.facebook.com/v21.0/${conversationId}/messages?` +
            `fields=id,message,from,created_time,attachments,sticker,referral,tags,subject&` +
            `limit=${limit}&access_token=${token}`

        if (after) {
            url += `&after=${after}`
        }

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)
        const response = await fetch(url, { signal: controller.signal })
        clearTimeout(timeout)
        const data = await response.json()

        if (data.error) {
            console.error(`Error fetching messages for conversation ${conversationId}:`, data.error)
            return { messages: [], paging: null }
        }

        return {
            messages: data.data || [],
            paging: data.paging || null
        }
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            console.error(`Timeout fetching messages for conversation ${conversationId}`)
        } else {
            console.error(`Error fetching messages:`, err instanceof Error ? err.message : String(err))
        }
        return { messages: [], paging: null }
    }
}

// Helper function to extract ad_id from message object
export function extractAdIdFromMessage(msg: any): string | null {
    if (!msg) return null;

    // case 1: direct
    if (msg.ad_id) return msg.ad_id;

    // case 2: referral.ad_id
    if (msg.referral?.ad_id) return msg.referral.ad_id;

    // case 3: referral.ref
    const ref = msg.referral?.ref;
    if (typeof ref === "string") {
        const match = ref.match(/ad::(\d+)/);
        if (match) return match[1];
    }

    return null;
}

// Get conversation tags/labels - including auto-generated ad campaign tags
export async function getConversationTags(
    userAccessToken: string,
    conversationId: string,
    pageId: string,
    pageAccessToken?: string
): Promise<string[]> {
    try {
        const token = pageAccessToken || userAccessToken
        console.log(`[getConversationTags] fetching tags for ${conversationId}`)

        let allTags: string[] = []

        // Method 1: Try to get conversation with all available fields that might contain tags
        try {
            // Added custom_labels and tags to fields
            const convUrl = `https://graph.facebook.com/v21.0/${conversationId}?fields=id,wallpaper,customization_info,form_data,custom_labels,tags&access_token=${token}`
            const convResp = await fetch(convUrl)
            const convData = await convResp.json()
            console.log(`[getConversationTags] conversation data keys:`, Object.keys(convData).filter(k => k !== 'id'))

            if (convData.custom_labels && Array.isArray(convData.custom_labels)) {
                const names = convData.custom_labels.map((l: any) => l.name);
                console.log(`[getConversationTags] Method 1 found custom_labels:`, names);
                allTags.push(...names);
            }

            if (convData.tags && Array.isArray(convData.tags)) {
                const names = convData.tags.map((l: any) => l.name);
                console.log(`[getConversationTags] Method 1 found tags:`, names);
                allTags.push(...names);
            }
        } catch (err) {
            console.error(`[getConversationTags] conversation fetch error:`, err instanceof Error ? err.message : 'unknown')
        }

        // Method 1.5: Fetch custom_labels edge directly
        try {
            const labelsUrl = `https://graph.facebook.com/v21.0/${conversationId}/custom_labels?fields=id,name&access_token=${token}`
            console.log(`[getConversationTags] Method 1.5: fetching custom_labels edge`)
            const labelsResp = await fetch(labelsUrl)
            const labelsData = await labelsResp.json()

            if (labelsData.data && Array.isArray(labelsData.data)) {
                const names = labelsData.data.map((l: any) => l.name)
                console.log(`[getConversationTags] Method 1.5 found labels:`, names)
                allTags.push(...names)
            } else if (labelsData.error) {
                console.log(`[getConversationTags] Method 1.5 error:`, labelsData.error)
            }
        } catch (err) {
            console.error(`[getConversationTags] Method 1.5 error:`, err)
        }

        // Method 2: Get page conversations with label_names field
        try {
            // Added custom_labels to fields
            const pageConvUrl = `https://graph.facebook.com/v21.0/${pageId}/conversations?fields=id,label_names,custom_labels,wallpaper,snippet&limit=100&access_token=${token}`
            const pageConvResp = await fetch(pageConvUrl)
            const pageConvData = await pageConvResp.json()

            if (pageConvData.data && Array.isArray(pageConvData.data)) {
                console.log(`[getConversationTags] found ${pageConvData.data.length} conversations in page`)

                // Normalize ID for matching
                const searchId = conversationId.replace(/^t_/, '')
                const targetConv = pageConvData.data.find((c: any) => {
                    const cId = c.id.replace(/^t_/, '')
                    return c.id === conversationId || cId === searchId || c.id === `t_${searchId}`
                })

                if (targetConv) {
                    console.log(`[getConversationTags] found matching conversation:`, { id: targetConv.id, labels: targetConv.label_names, custom_labels: targetConv.custom_labels })

                    if (targetConv.label_names && Array.isArray(targetConv.label_names)) {
                        console.log(`[getConversationTags] extracted label_names:`, targetConv.label_names)
                        allTags = [...allTags, ...targetConv.label_names]
                    }

                    if (targetConv.custom_labels && Array.isArray(targetConv.custom_labels)) {
                        const names = targetConv.custom_labels.map((l: any) => l.name);
                        console.log(`[getConversationTags] extracted custom_labels:`, names)
                        allTags = [...allTags, ...names]
                    }
                } else {
                    // Log first few conv IDs for debugging
                    console.log(`[getConversationTags] no match found. page conversation IDs:`, pageConvData.data.slice(0, 3).map((c: any) => c.id))
                }
            }
        } catch (err) {
            console.error(`[getConversationTags] page conversations error:`, err instanceof Error ? err.message : 'unknown')
        }

        // Method 3: Check for assigned labels via API (some pages use a different endpoint)
        // This is often redundant if Method 1.5 works, but kept as a lightweight fallback
        try {
            const labelsUrl = `https://graph.facebook.com/v21.0/${conversationId}/labels?limit=50&access_token=${token}`
            const labelsResp = await fetch(labelsUrl)
            const labelsData = await labelsResp.json()

            if (labelsData.data && Array.isArray(labelsData.data)) {
                console.log(`[getConversationTags] /labels endpoint returned ${labelsData.data.length} labels`)
                const labelNames = labelsData.data.map((l: any) => l.name).filter(Boolean)
                allTags = [...allTags, ...labelNames]
            }
        } catch (err) {
            console.error(`[getConversationTags] labels endpoint error:`, err instanceof Error ? err.message : 'unknown')
        }

        // Check if we found the ad_id yet. If so, we can skip the heavy message fetching.
        const hasAdId = allTags.some(t => t.startsWith('ad_id') || t.match(/^ad_id[:.]/));

        if (!hasAdId) {
            // Method 4 (Optimized): Get ONLY the first page of messages to check for referral/ad_id
            // We removed the full pagination loop to save API calls.
            try {
                console.log(`[getConversationTags] Method 4 (Optimized): fetching first page of messages`)

                // Request explicit sub-fields for referral to ensure we get the data
                let url = `https://graph.facebook.com/v21.0/${conversationId}/messages?` +
                    `fields=id,message,from,referral{ad_id,ref,source,type},ad_id,tags,created_time,subject,message_tags,type,story&` +
                    `limit=25&access_token=${token}` // Reduced limit to 25

                const messResp = await fetch(url)
                const messData = await messResp.json()

                if (messData.data && Array.isArray(messData.data)) {
                    console.log(`[getConversationTags] fetched ${messData.data.length} messages`)

                    // Process messages for ad_id
                    messData.data.forEach((m: any) => {
                        const extractedId = extractAdIdFromMessage(m);
                        if (extractedId) {
                            console.log(`[getConversationTags] message has ad_id:`, extractedId)
                            allTags.push(`ad_id:${extractedId}`)
                        }

                        // Also check message_tags
                        if (m.message_tags && Array.isArray(m.message_tags)) {
                            const adTag = m.message_tags.find((tag: any) => tag && tag.name && tag.name.includes('ad_'));
                            if (adTag) {
                                allTags.push(adTag.name)
                            }
                        }
                    })
                }
            } catch (err) {
                console.error(`[getConversationTags] messages fetch error:`, err instanceof Error ? err.message : 'unknown')
            }
        } else {
            console.log(`[getConversationTags] Skipping message fetch (Method 4) because ad_id already found in labels`)
        }

        // Method 5: REMOVED (Too expensive - fetches all page labels and checks assignments)
        // This was causing exponential API calls.

        // Remove duplicates
        const uniqueTags = Array.from(new Set(allTags))
        console.log(`[getConversationTags] final tags (${uniqueTags.length}):`, uniqueTags)
        return uniqueTags
    } catch (err) {
        console.error(`[getConversationTags] unexpected error:`, err instanceof Error ? err.message : String(err))
        return []
    }
}



// Fetch all messages from a conversation (with pagination)
export async function getAllConversationMessages(
    userAccessToken: string,
    conversationId: string,
    pageId: string,
    pageAccessToken?: string,
    maxMessages: number = 500
) {
    const allMessages: Array<{
        id: string
        message?: string
        from: { id: string; name?: string; email?: string }
        created_time: string
        attachments?: { data: Array<{ type: string; image_data?: { url: string }; video_data?: { url: string }; file_url?: string; name?: string }> }
        sticker?: string
    }> = []
    let after: string | undefined = undefined
    let hasMore = true

    while (hasMore && allMessages.length < maxMessages) {
        const result = await getConversationMessages(
            userAccessToken,
            conversationId,
            pageId,
            pageAccessToken,
            100,
            after
        )

        if (result.messages.length === 0) {
            hasMore = false
            break
        }

        allMessages.push(...result.messages)

        if (result.paging?.cursors?.after) {
            after = result.paging.cursors.after
        } else {
            hasMore = false
        }
    }

    return allMessages
}

export async function sendMessage(
    userAccessToken: string,
    pageId: string,
    recipientId: string,
    messageText: string
) {
    // First, get page access token
    const pagesResponse = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${userAccessToken}`
    )
    const pageData = await pagesResponse.json()

    if (pageData.error) {
        throw new Error(pageData.error.message)
    }

    const pageAccessToken = pageData.access_token

    // Send message using Page token
    const response = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/messages`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: recipientId },
                message: { text: messageText },
                messaging_type: 'RESPONSE',
                access_token: pageAccessToken
            })
        }
    )

    const data = await response.json()

    if (data.error) {
        throw new Error(data.error.message)
    }

    return data
}

export async function getPageProfilePicture(pageId: string, accessToken: string) {
    const response = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/picture?redirect=false&access_token=${accessToken}`
    )
    const data = await response.json()
    return data.data?.url || null
}
