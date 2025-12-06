import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { refreshAccessToken, getGoogleSheetsClient } from '@/lib/google-auth'
import { getAdAccounts, getCampaignsWithDeliveryStatus, getAdSetsWithDeliveryStatus, getAds, getInsights } from '@/lib/facebook'

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { configId } = body

        if (!configId) {
            return NextResponse.json({ error: 'Config ID required' }, { status: 400 })
        }

        const config = await db.exportConfig.findUnique({
            where: { id: configId }
        })

        if (!config) {
            return NextResponse.json({ error: 'Config not found' }, { status: 404 })
        }

        if (config.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // --- Logic duplicated from scheduler.ts (Refactor recommended) ---
        // For now, we'll copy-paste to ensure it works immediately, 
        // but ideally we should extract this to a shared function in lib/export-service.ts

        const user = await db.user.findUnique({
            where: { id: session.user.id },
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
            return NextResponse.json({ error: 'Google Account not connected. Please sign in with Google.' }, { status: 400 })
        }

        if (!googleAccount.refresh_token) {
            return NextResponse.json({ error: 'Google Refresh Token missing. Please sign out and sign in again to grant permissions.' }, { status: 400 })
        }

        if (!fbToken) {
            return NextResponse.json({ error: 'Facebook Ad Token missing. Please connect your Facebook account.' }, { status: 400 })
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
                    refresh_token: googleTokens.refresh_token || undefined // Update if new one provided
                }
            })
        }

        const googleClient = getGoogleSheetsClient(googleTokens.access_token!)

        // Fetch Ad Data
        const accountIds = config.accountIds ? JSON.parse(config.accountIds) : []
        if (accountIds.length === 0) {
            return NextResponse.json({ error: 'No accounts selected' }, { status: 400 })
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

            // Extract dateRange from body if present
            const dateRange = body.dateRange

            if (config.dataType === 'campaigns') {
                const promises = accountIds.map(async (id: string) => {
                    const [items, insights] = await Promise.all([
                        getCampaignsWithDeliveryStatus(fbToken, `act_${id}`),
                        getInsights(fbToken, `act_${id}`, 'campaign', dateRange)
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
                        getInsights(fbToken, `act_${id}`, 'adset', dateRange)
                    ])
                    return mergeInsights(items, insights)
                })
                const results = await Promise.all(promises)
                data = results.flat()
            } else if (config.dataType === 'ads') {
                // Fetch account names first
                const accounts = await getAdAccounts(fbToken)
                const accountMap = new Map(accounts.map((a: any) => [a.id, a.name]))

                const promises = accountIds.map(async (id: string) => {
                    const [items, insights] = await Promise.all([
                        getAds(fbToken, `act_${id}`),
                        getInsights(fbToken, `act_${id}`, 'ad', dateRange)
                    ])
                    const merged = mergeInsights(items, insights)
                    const accountName = accountMap.get(id) || ''
                    return merged.map(item => ({ ...item, accountName }))
                })
                const results = await Promise.all(promises)
                data = results.flat()
            }
        }

        if (data.length === 0) {
            return NextResponse.json({ message: 'No data to export', count: 0 })
        }

        // Prepare Rows
        const now = new Date()
        const rows: string[][] = []

        // Determine date string to use: from dateRange if available (Manual export), otherwise today (Auto export)
        let dateStr = ''
        if (body.dateRange && body.dateRange.from) {
            const [y, m, d] = body.dateRange.from.split('-')
            dateStr = `${d}/${m}/${y}`
        } else {
            dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
        }

        const mapping = JSON.parse(config.columnMapping)

        for (const item of data) {
            const maxColIndex = 26
            const rowData = new Array(maxColIndex).fill('')

            if (config.includeDate) {
                rowData[0] = dateStr
            }

            Object.entries(mapping).forEach(([key, colLetter]) => {
                if (colLetter === 'skip') return
                const colIndex = (colLetter as string).charCodeAt(0) - 65
                if (colIndex >= 0 && colIndex < maxColIndex) {
                    let value = item[key]
                    if (key === 'videoAvgTimeWatched') {
                        const val = value ? parseFloat(value) : 0
                        if (val === 0 && !value) {
                            value = '-'
                        } else {
                            const m = Math.floor(val / 60)
                            const s = Math.floor(val % 60)
                            value = `${String(m).padStart(2, '0')}.${String(s).padStart(2, '0')}`
                        }
                    } else if (['spend', 'budget', 'spendCap'].includes(key) && value) {
                        value = parseFloat(value).toFixed(2)
                    }
                    rowData[colIndex] = String(value || '')
                }
            })

            let lastIndex = -1
            for (let i = 0; i < rowData.length; i++) {
                if (rowData[i] !== '') lastIndex = i
            }

            rows.push(rowData.slice(0, lastIndex + 1))
        }

        // Append to Sheets
        await googleClient.spreadsheets.values.append({
            spreadsheetId: config.spreadsheetId,
            range: `${config.sheetName}!A1`,
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

        return NextResponse.json({ success: true, count: rows.length })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Manual export failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
