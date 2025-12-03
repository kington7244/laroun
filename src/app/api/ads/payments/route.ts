import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { accountIds, startDate, endDate } = await request.json()

        if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
            return NextResponse.json({ error: "No account IDs provided" }, { status: 400 })
        }

        // Get user's Facebook token from Account table (same as basic API)
        const account = await db.account.findFirst({
            where: {
                userId: session.user.id,
                provider: "facebook",
            },
        })

        if (!account || !account.access_token) {
            return NextResponse.json({ error: "Facebook account not connected" }, { status: 400 })
        }

        const accessToken = account.access_token

        // Fetch transactions for all selected accounts
        const allTransactions: any[] = []

        for (const accountId of accountIds) {
            try {
                // Fetch account name and funding source details
                const accountRes = await fetch(
                    `https://graph.facebook.com/v18.0/act_${accountId}?fields=name,currency,funding_source_details&access_token=${accessToken}`
                )
                const accountData = await accountRes.json()
                
                if (accountData.error) {
                    console.error(`Error fetching account ${accountId}:`, accountData.error)
                    continue
                }

                // Extract payment method info
                const fundingSource = accountData.funding_source_details || {}
                const paymentMethodDisplay = fundingSource.display_string || 'Unknown'
                const paymentMethodId = fundingSource.id || null
                const paymentMethodType = fundingSource.type || null

                // Build time range filter if provided
                let timeRange = ''
                if (startDate && endDate) {
                    timeRange = `&time_range={"since":"${startDate}","until":"${endDate}"}`
                }

                // Try multiple endpoints to get payment/billing data
                let allAccountTx: any[] = []

                // 1. Try adbilling_payment_history first (for payment history)
                try {
                    const paymentRes = await fetch(
                        `https://graph.facebook.com/v18.0/act_${accountId}?` +
                        `fields=adspaymentcycle,funding_source_details,spend_cap,amount_spent,balance,currency` +
                        `&access_token=${accessToken}`
                    )
                    const paymentData = await paymentRes.json()
                    
                    if (paymentData && !paymentData.error) {
                        // Add account billing info as a summary
                        if (paymentData.amount_spent) {
                            allAccountTx.push({
                                id: `${accountId}_spent`,
                                transactionId: `SPEND-${accountId}`,
                                date: new Date().toISOString(),
                                amount: parseFloat(paymentData.amount_spent) || 0,
                                currency: paymentData.currency || accountData.currency || 'USD',
                                paymentMethod: paymentMethodDisplay,
                                referenceNumber: paymentMethodId,
                                paymentStatus: 'Total Spent',
                                vatInvoiceId: null,
                                accountId: accountId,
                                accountName: accountData.name || accountId,
                            })
                        }
                    }
                } catch (e) {
                    console.log('Payment history not available:', e)
                }

                // 2. Try to get insights with spend data per day
                try {
                    const insightsRes = await fetch(
                        `https://graph.facebook.com/v18.0/act_${accountId}/insights?` +
                        `fields=spend,account_currency,date_start,date_stop` +
                        `&level=account&time_increment=1${timeRange}` +
                        `&limit=100&access_token=${accessToken}`
                    )
                    const insightsData = await insightsRes.json()

                    if (insightsData.data && Array.isArray(insightsData.data)) {
                        const dailySpend = insightsData.data.map((day: any, index: number) => ({
                            id: `${accountId}_day_${index}`,
                            transactionId: `DAILY-${day.date_start}`,
                            date: day.date_start,
                            amount: parseFloat(day.spend) * 100 || 0, // Convert to cents
                            currency: day.account_currency || accountData.currency || 'USD',
                            paymentMethod: paymentMethodDisplay,
                            referenceNumber: paymentMethodId,
                            paymentStatus: 'Daily Spend',
                            vatInvoiceId: null,
                            accountId: accountId,
                            accountName: accountData.name || accountId,
                        }))
                        allAccountTx.push(...dailySpend)
                    }
                } catch (e) {
                    console.log('Insights not available:', e)
                }

                // 3. Try transactions endpoint (legacy)
                try {
                    const txRes = await fetch(
                        `https://graph.facebook.com/v18.0/act_${accountId}/transactions?` +
                        `fields=id,time,amount,billing_event_type,currency,payment_type,provider_amount,status,charge_type,invoice_id` +
                        `&limit=100&access_token=${accessToken}`
                    )
                    const txData = await txRes.json()

                    if (txData.data && Array.isArray(txData.data) && txData.data.length > 0) {
                        const transactions = txData.data.map((tx: any) => ({
                            id: `${accountId}_${tx.id}`,
                            transactionId: tx.id,
                            date: tx.time,
                            amount: tx.amount || tx.provider_amount || 0,
                            currency: tx.currency || accountData.currency || 'USD',
                            paymentMethod: formatPaymentType(tx.payment_type) || paymentMethodDisplay,
                            referenceNumber: paymentMethodId,
                            paymentStatus: tx.status || tx.billing_event_type || 'Completed',
                            vatInvoiceId: tx.invoice_id || null,
                            accountId: accountId,
                            accountName: accountData.name || accountId,
                        }))
                        allAccountTx.push(...transactions)
                    }
                } catch (e) {
                    console.log('Transactions not available:', e)
                }

                allTransactions.push(...allAccountTx)
            } catch (error) {
                console.error(`Error processing account ${accountId}:`, error)
            }
        }

        // Sort by date descending
        allTransactions.sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0
            const dateB = b.date ? new Date(b.date).getTime() : 0
            return dateB - dateA
        })

        return NextResponse.json({ 
            transactions: allTransactions,
            totalCount: allTransactions.length
        })

    } catch (error: any) {
        console.error("Error fetching payment transactions:", error)
        return NextResponse.json(
            { error: error.message || "Failed to fetch payment transactions" },
            { status: 500 }
        )
    }
}

function formatPaymentType(paymentType: string | undefined): string {
    if (!paymentType) return 'Unknown'
    
    const types: Record<string, string> = {
        'CREDIT_CARD': 'Credit Card',
        'DEBIT_CARD': 'Debit Card',
        'PAYPAL': 'PayPal',
        'DIRECT_DEBIT': 'Direct Debit',
        'BANK_TRANSFER': 'Bank Transfer',
        'FACEBOOK_WALLET': 'Facebook Wallet',
        'FACEBOOK_AD_CREDIT': 'Ad Credit',
        'COUPON': 'Coupon',
        'MANUAL': 'Manual',
        'BOLETO': 'Boleto',
        'credit_card': 'Credit Card',
        'debit_card': 'Debit Card',
    }
    
    return types[paymentType] || paymentType.replace(/_/g, ' ')
}
