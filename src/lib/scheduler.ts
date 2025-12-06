import cron from 'node-cron'
import { db } from './db'
import { getGoogleSheetsClient } from './google-auth'
import { getAdAccounts, getCampaignsWithDeliveryStatus, getAdSetsWithDeliveryStatus, getAds, getInsights } from './facebook'
import { refreshAccessToken } from './google-auth'

export function initScheduler() {
    console.log('Initializing Scheduler...')

    // Run every 15 minutes to check for jobs (0, 15, 30, 45)
    cron.schedule('*/15 * * * *', async () => {
        console.log('Running scheduled export check...')
        await runExportJobs()
    })
}

async function runExportJobs() {
    try {
        const now = new Date()
        const serverHour = now.getHours()
        const serverMinute = now.getMinutes()

        // Find configs that are enabled
        const configs = await db.exportConfig.findMany({
            where: {
                autoExportEnabled: true
            }
        })

        for (const config of configs) {
            try {
                // Check if due
                let isDue = false

                if (config.exportFrequency === 'daily') {
                    let currentHour = serverHour
                    let currentMinute = serverMinute

                    // Adjust for timezone if enabled
                    if (config.useAdAccountTimezone && config.adAccountTimezone) {
                        try {
                            // Get time in target timezone
                            const tzTimeStr = new Date().toLocaleString('en-US', { timeZone: config.adAccountTimezone })
                            const tzDate = new Date(tzTimeStr)
                            currentHour = tzDate.getHours()
                            currentMinute = tzDate.getMinutes()
                        } catch (e) {
                            console.error(`Invalid timezone ${config.adAccountTimezone} for config ${config.id}, falling back to server time`)
                        }
                    }

                    const targetHour = config.exportHour ?? 9
                    const targetMinute = config.exportMinute ?? 0

                    // Check if time matches (allow 14 minute window since we run every 15 mins)
                    // We check if we are in the same hour and the minute difference is small
                    if (currentHour === targetHour) {
                        const minuteDiff = Math.abs(currentMinute - targetMinute)
                        if (minuteDiff < 14) {
                            isDue = true
                        }
                    }

                    // Prevent double export in same day: check lastExportAt
                    if (isDue && config.lastExportAt) {
                        const lastExport = new Date(config.lastExportAt)
                        // Check if last export was less than 12 hours ago (simple debounce)
                        const hoursSinceLast = (now.getTime() - lastExport.getTime()) / (1000 * 60 * 60)
                        if (hoursSinceLast < 12) {
                            isDue = false
                        }
                    }

                } else if (config.exportFrequency === 'hourly') {
                    const lastExport = config.lastExportAt ? new Date(config.lastExportAt) : new Date(0)
                    const hoursSinceLast = (now.getTime() - lastExport.getTime()) / (1000 * 60 * 60)
                    if (hoursSinceLast >= (config.exportInterval || 6)) isDue = true
                }

                if (!isDue) continue

                console.log(`Processing export config: ${config.id} (${config.name})`)

                // Get User for tokens
                const user = await db.user.findUnique({
                    where: { id: config.userId },
                    include: {
                        accounts: {
                            where: {
                                provider: { in: ['google', 'facebook'] }
                            }
                        }
                    }
                })

                const googleAccount = user?.accounts.find(a => a.provider === 'google')
                const facebookAccount = user?.accounts.find(a => a.provider === 'facebook')
                const fbToken = user?.facebookAdToken || facebookAccount?.access_token

                if (!googleAccount) {
                    console.error(`User ${config.userId} missing Google Account`)
                    continue
                }

                if (!googleAccount.refresh_token) {
                    console.error(`User ${config.userId} missing Google Refresh Token`)
                    continue
                }

                if (!fbToken) {
                    console.error(`User ${config.userId} missing Facebook Ad Token`)
                    continue
                }

                // Refresh Google Token
                const googleTokens = await refreshAccessToken(googleAccount.refresh_token)

                // Update access token in DB
                if (googleTokens.access_token) {
                    await db.account.update({
                        where: { id: googleAccount.id },
                        data: {
                            access_token: googleTokens.access_token,
                            expires_at: googleTokens.expiry_date ? Math.floor(googleTokens.expiry_date / 1000) : undefined,
                            refresh_token: googleTokens.refresh_token || undefined
                        }
                    })
                }

                const googleClient = getGoogleSheetsClient(googleTokens.access_token!)

                // Fetch Ad Data
                const accountIds = config.accountIds ? JSON.parse(config.accountIds) : []
                if (accountIds.length === 0) {
                    console.log('No accounts selected for export')
                    continue
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let data: any[] = []

                if (config.dataType === 'accounts') {
                    const allAccounts = await getAdAccounts(fbToken)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    data = allAccounts.filter((acc: any) => accountIds.includes(acc.id))
                } else {
                    // Helper to merge insights
                    const mergeInsights = (items: any[], insights: any[]) => {
                        const insightsMap = new Map(insights.map(i => [i.id, i]))
                        return items.map(item => ({
                            ...item,
                            ...(insightsMap.get(item.id) || {})
                        }))
                    }

                    if (config.dataType === 'campaigns') {
                        const promises = accountIds.map(async (id: string) => {
                            const [items, insights] = await Promise.all([
                                getCampaignsWithDeliveryStatus(fbToken, `act_${id}`),
                                getInsights(fbToken, `act_${id}`, 'campaign')
                            ])
                            return mergeInsights(items, insights)
                        })
                        const results = await Promise.all(promises)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        data = results.flat() as any[]
                    } else if (config.dataType === 'adsets') {
                        const promises = accountIds.map(async (id: string) => {
                            const [items, insights] = await Promise.all([
                                getAdSetsWithDeliveryStatus(fbToken, `act_${id}`),
                                getInsights(fbToken, `act_${id}`, 'adset')
                            ])
                            return mergeInsights(items, insights)
                        })
                        const results = await Promise.all(promises)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        data = results.flat() as any[]
                    } else if (config.dataType === 'ads') {
                        const promises = accountIds.map(async (id: string) => {
                            const [items, insights] = await Promise.all([
                                getAds(fbToken, `act_${id}`),
                                getInsights(fbToken, `act_${id}`, 'ad')
                            ])
                            return mergeInsights(items, insights)
                        })
                        const results = await Promise.all(promises)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        data = results.flat() as any[]
                    }
                }

                if (data.length === 0) {
                    console.log('No data to export')
                    continue
                }

                // Prepare Rows
                const rows: string[][] = []
                const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
                const mapping = JSON.parse(config.columnMapping)

                for (const item of data) {
                    const row: string[] = []
                    if (config.includeDate) row.push(todayStr)

                    // Let's assume standard columns A-Z
                    const maxColIndex = 26 // Support up to Z
                    const rowData = new Array(maxColIndex).fill('')

                    if (config.includeDate) {
                        rowData[0] = todayStr // A
                    }

                    Object.entries(mapping).forEach(([key, colLetter]) => {
                        if (colLetter === 'skip') return
                        const colIndex = (colLetter as string).charCodeAt(0) - 65 // A=0, B=1...
                        if (colIndex >= 0 && colIndex < maxColIndex) {
                            // Get value from item
                            let value = item[key]

                            // Format value (spend, etc)
                            if (['spend', 'budget', 'spendCap'].includes(key) && value) {
                                // Basic formatting
                                value = parseFloat(value).toFixed(2)
                            }

                            rowData[colIndex] = String(value || '')
                        }
                    })

                    // Trim trailing empty strings to avoid huge ranges
                    let lastIndex = -1
                    for (let i = 0; i < rowData.length; i++) {
                        if (rowData[i] !== '') lastIndex = i
                    }

                    rows.push(rowData.slice(0, lastIndex + 1))
                }

                // Append to Sheets
                await googleClient.spreadsheets.values.append({
                    spreadsheetId: config.spreadsheetId,
                    range: `${config.sheetName}!A1`, // Append to the sheet
                    valueInputOption: 'USER_ENTERED',
                    requestBody: {
                        values: rows
                    }
                })

                // Update status
                await db.exportConfig.update({
                    where: { id: config.id },
                    data: {
                        lastExportAt: now,
                        lastExportStatus: 'success',
                        lastExportRows: rows.length,
                        lastExportError: null
                    }
                })

                console.log(`Export success for ${config.name}`)

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                console.error(`Export failed for ${config.name}:`, error)
                await db.exportConfig.update({
                    where: { id: config.id },
                    data: {
                        lastExportAt: now,
                        lastExportStatus: 'failed',
                        lastExportError: error.message
                    }
                })
            }
        }
    } catch (error) {
        console.error('Error in runExportJobs:', error)
    }
}
