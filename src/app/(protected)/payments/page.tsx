"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { RefreshCw, Search, MoreHorizontal, Download, ExternalLink, FileText, ChevronDown, Check } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useTheme } from "@/contexts/ThemeContext"
import { toast } from "sonner"
import { format, subDays, addDays } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { DatePickerWithRange } from "@/components/DateRangePicker"
import { DateRange } from "react-day-picker"

// Theme color classes mapping
const themeColors = {
    violet: { active: 'bg-violet-500 text-white', inactive: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400' },
    blue: { active: 'bg-blue-500 text-white', inactive: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' },
    indigo: { active: 'bg-indigo-500 text-white', inactive: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' },
    cyan: { active: 'bg-cyan-500 text-white', inactive: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400' },
    teal: { active: 'bg-teal-500 text-white', inactive: 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400' },
    green: { active: 'bg-green-500 text-white', inactive: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400' },
    amber: { active: 'bg-amber-500 text-white', inactive: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
    orange: { active: 'bg-orange-500 text-white', inactive: 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400' },
    rose: { active: 'bg-rose-500 text-white', inactive: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400' },
    pink: { active: 'bg-pink-500 text-white', inactive: 'bg-pink-50 text-pink-600 dark:bg-pink-950 dark:text-pink-400' },
}

interface PaymentTransaction {
    id: string
    transactionId: string
    date: string
    amount: number
    currency: string
    paymentMethod: string
    referenceNumber: string | null
    paymentStatus: string
    vatInvoiceId: string | null
    accountId: string
    accountName: string
}

interface AdAccount {
    id: string
    name: string
    currency: string
}

export default function PaymentsPage() {
    const { t } = useLanguage()
    const { primaryColor } = useTheme()
    const colors = themeColors[primaryColor] || themeColors.violet

    const [isLoading, setIsLoading] = useState(false)
    const [accounts, setAccounts] = useState<AdAccount[]>([])
    const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
    const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isAccountsLoading, setIsAccountsLoading] = useState(true)
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date()
    })

    // Fetch accounts on mount
    useEffect(() => {
        fetchAccounts()
    }, [])

    // Fetch transactions when selected accounts change or date range changes
    useEffect(() => {
        if (selectedAccountIds.length > 0) {
            fetchTransactions()
        } else {
            setTransactions([])
        }
    }, [selectedAccountIds, dateRange])

    const fetchAccounts = async () => {
        setIsAccountsLoading(true)
        try {
            const res = await fetch('/api/ads/basic')
            const result = await res.json()
            if (result.data && Array.isArray(result.data)) {
                setAccounts(result.data.map((acc: any) => ({
                    id: acc.id,
                    name: acc.name,
                    currency: acc.currency
                })))
            }
        } catch (error) {
            console.error('Error fetching accounts:', error)
            toast.error('Failed to fetch accounts')
        } finally {
            setIsAccountsLoading(false)
        }
    }

    const fetchTransactions = async () => {
        if (selectedAccountIds.length === 0) return
        
        setIsLoading(true)
        try {
            const res = await fetch('/api/ads/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    accountIds: selectedAccountIds,
                    startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
                    endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined
                })
            })
            const data = await res.json()
            
            if (data.error) {
                throw new Error(data.error)
            }
            
            setTransactions(data.transactions || [])
        } catch (error: any) {
            console.error('Error fetching transactions:', error)
            toast.error(error.message || 'Failed to fetch payment transactions')
        } finally {
            setIsLoading(false)
        }
    }

    const toggleAccount = (accountId: string) => {
        setSelectedAccountIds(prev => 
            prev.includes(accountId)
                ? prev.filter(id => id !== accountId)
                : [...prev, accountId]
        )
    }

    const toggleAllAccounts = () => {
        if (selectedAccountIds.length === accounts.length) {
            setSelectedAccountIds([])
        } else {
            setSelectedAccountIds(accounts.map(acc => acc.id))
        }
    }

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: currency || 'USD' 
        }).format(amount / 100) // Facebook returns amount in cents
    }

    const getStatusBadge = (status: string) => {
        const statusLower = status?.toLowerCase() || ''
        if (statusLower.includes('completed') || statusLower.includes('success')) {
            return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Completed</Badge>
        } else if (statusLower.includes('pending')) {
            return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">Pending</Badge>
        } else if (statusLower.includes('failed') || statusLower.includes('error')) {
            return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Failed</Badge>
        } else if (statusLower.includes('refund')) {
            return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Refunded</Badge>
        }
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>
    }

    const filteredTransactions = transactions.filter(tx => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            tx.transactionId?.toLowerCase().includes(query) ||
            tx.accountName?.toLowerCase().includes(query) ||
            tx.paymentMethod?.toLowerCase().includes(query) ||
            tx.vatInvoiceId?.toLowerCase().includes(query)
        )
    })

    return (
        <div className="h-full">
            <Card className="h-full flex flex-col">
                <CardContent className="flex-1 overflow-hidden pt-6">
                    <div className="flex flex-col gap-4 h-full">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold">Payment Activity</h1>
                            <div className="flex items-center gap-2">
                                {/* Account Selector */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="min-w-[200px] justify-between">
                                            {selectedAccountIds.length === 0 
                                                ? "Select Accounts" 
                                                : `${selectedAccountIds.length} account${selectedAccountIds.length > 1 ? 's' : ''} selected`
                                            }
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0" align="end">
                                        <div className="p-2 border-b">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="w-full justify-start"
                                                onClick={toggleAllAccounts}
                                            >
                                                <div className={cn(
                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                                                    selectedAccountIds.length === accounts.length
                                                        ? "bg-primary border-primary text-primary-foreground"
                                                        : "opacity-50"
                                                )}>
                                                    {selectedAccountIds.length === accounts.length && (
                                                        <Check className="h-3 w-3" />
                                                    )}
                                                </div>
                                                Select All
                                            </Button>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto p-2">
                                            {isAccountsLoading ? (
                                                <div className="text-center py-4 text-muted-foreground">
                                                    Loading accounts...
                                                </div>
                                            ) : accounts.length === 0 ? (
                                                <div className="text-center py-4 text-muted-foreground">
                                                    No accounts found
                                                </div>
                                            ) : (
                                                accounts.map((account) => (
                                                    <div
                                                        key={account.id}
                                                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                                                        onClick={() => toggleAccount(account.id)}
                                                    >
                                                        <div className={cn(
                                                            "flex h-4 w-4 items-center justify-center rounded-sm border",
                                                            selectedAccountIds.includes(account.id)
                                                                ? "bg-primary border-primary text-primary-foreground"
                                                                : "opacity-50"
                                                        )}>
                                                            {selectedAccountIds.includes(account.id) && (
                                                                <Check className="h-3 w-3" />
                                                            )}
                                                        </div>
                                                        <span className="flex-1 truncate text-sm">{account.name}</span>
                                                        <span className="text-xs text-muted-foreground">{account.currency}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {/* Date Range Picker */}
                                <DatePickerWithRange
                                    date={dateRange}
                                    setDate={setDateRange}
                                />

                                {/* Search */}
                                <div className="relative w-48">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8 h-9"
                                    />
                                </div>

                                {/* Refresh */}
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-9 w-9"
                                    onClick={fetchTransactions}
                                    disabled={selectedAccountIds.length === 0 || isLoading}
                                >
                                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                                </Button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-auto rounded-lg border">
                            <Table>
                                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                                    <TableRow>
                                        <TableHead className="font-semibold">Transaction ID</TableHead>
                                        <TableHead className="font-semibold">Account</TableHead>
                                        <TableHead className="font-semibold">Date</TableHead>
                                        <TableHead className="font-semibold text-right">Amount</TableHead>
                                        <TableHead className="font-semibold">Payment Method</TableHead>
                                        <TableHead className="font-semibold">Payment Status</TableHead>
                                        <TableHead className="font-semibold">VAT Invoice ID</TableHead>
                                        <TableHead className="font-semibold text-center w-[80px]">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-10">
                                                <div className="flex items-center justify-center gap-2">
                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                    <span>Loading transactions...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : selectedAccountIds.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                                                Please select at least one account to view payment activity
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredTransactions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                                                No payment transactions found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredTransactions.map((tx) => (
                                            <TableRow key={tx.id} className="hover:bg-muted/50">
                                                <TableCell className="font-mono text-sm">
                                                    {tx.transactionId}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium truncate max-w-[150px]">{tx.accountName}</span>
                                                        <span className="text-xs text-muted-foreground">{tx.accountId}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {tx.date ? format(new Date(tx.date), 'MMM dd, yyyy HH:mm') : '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(tx.amount, tx.currency)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{tx.paymentMethod || '-'}</span>
                                                        {tx.referenceNumber && (
                                                            <span className="text-xs text-muted-foreground font-mono">{tx.referenceNumber}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(tx.paymentStatus)}</TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {tx.vatInvoiceId || '-'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => {
                                                                navigator.clipboard.writeText(tx.transactionId)
                                                                toast.success('Transaction ID copied')
                                                            }}>
                                                                <FileText className="mr-2 h-4 w-4" />
                                                                Copy Transaction ID
                                                            </DropdownMenuItem>
                                                            {tx.vatInvoiceId && (
                                                                <DropdownMenuItem onClick={() => {
                                                                    window.open(`https://business.facebook.com/billing/invoices?asset_id=${tx.accountId}`, '_blank')
                                                                }}>
                                                                    <Download className="mr-2 h-4 w-4" />
                                                                    Download Invoice
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem onClick={() => {
                                                                window.open(`https://business.facebook.com/billing/transactions?asset_id=${tx.accountId}`, '_blank')
                                                            }}>
                                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                                View in Facebook
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Footer Info */}
                        {filteredTransactions.length > 0 && (
                            <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                                <span>
                                    Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} 
                                    {selectedAccountIds.length > 0 && ` from ${selectedAccountIds.length} account${selectedAccountIds.length > 1 ? 's' : ''}`}
                                </span>
                                <span>
                                    Total: {formatCurrency(
                                        filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0),
                                        filteredTransactions[0]?.currency || 'USD'
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
