"use client"

import { useState, useEffect, useCallback } from "react"

import { useSession } from "next-auth/react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
    FileSpreadsheet,
    Loader2,
    Settings2,
    Trash2,
} from "lucide-react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"

export interface ExportConfig {
    id?: string
    name: string
    spreadsheetUrl: string
    sheetName: string
    dataType: string
    columnMapping: Record<string, string>
    autoExportEnabled: boolean
    exportFrequency: string | null
    exportHour: number | null
    exportMinute: number | null
    exportInterval: number | null
    appendMode: boolean
    includeDate: boolean
    accountIds: string[]
    adAccountTimezone?: string | null
    useAdAccountTimezone: boolean
    lastExportAt?: string
    lastExportStatus?: string
}

interface GoogleSheetsConfigContentProps {
    dataType: string // accounts, campaigns, adsets, ads
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: Record<string, any>[] // Made optional for standalone
    onClose?: () => void
    standalone?: boolean
    className?: string
}

// Available data columns based on data type
const getAvailableColumns = (dataType: string) => {
    const commonColumns = [
        { key: 'index', label: '#' },
        { key: 'name', label: 'ชื่อ' },
        { key: 'id', label: 'ID' },
    ]

    if (dataType === 'accounts') {
        return [
            ...commonColumns,
            { key: 'status', label: 'สถานะ' },
            { key: 'activeAdsCount', label: 'จำนวนโฆษณา' },
            { key: 'spendCap', label: 'Spending Cap' },
            { key: 'paymentMethod', label: 'วิธีชำระเงิน' },
            { key: 'timezone', label: 'Timezone' },
            { key: 'country', label: 'ประเทศ' },
            { key: 'currency', label: 'สกุลเงิน' },
        ]
    }

    return [
        ...commonColumns,
        { key: 'status', label: 'สถานะ' },
        { key: 'delivery', label: 'Delivery' },
        { key: 'results', label: 'Results' },
        { key: 'costPerResult', label: 'Cost Per Result' },
        { key: 'budget', label: 'งบประมาณ' },
        { key: 'impressions', label: 'Impressions' },
        { key: 'reach', label: 'Reach' },
        { key: 'postEngagements', label: 'Post Engagements' },
        { key: 'clicks', label: 'Clicks (All)' },
        { key: 'newMessagingContacts', label: 'ยอดทัก' },
        { key: 'spend', label: 'ยอดใช้จ่าย' },
        { key: 'costPerNewMessagingContact', label: 'Cost/ทัก' },
        // Video Metrics
        { key: 'videoAvgTimeWatched', label: 'Video Avg Play Time' },
        { key: 'videoPlays', label: 'Video Plays' },
        { key: 'videoP25Watched', label: 'Video Plays at 25%' },
        { key: 'videoP50Watched', label: 'Video Plays at 50%' },
        { key: 'videoP75Watched', label: 'Video Plays at 75%' },
        { key: 'videoP95Watched', label: 'Video Plays at 95%' },
        { key: 'videoP100Watched', label: 'Video Plays at 100%' },
        { key: 'video3SecWatched', label: '3-Second Video Plays' },
        { key: 'accountName', label: 'Account Name' },
    ]
}

// Sheet column letters
const sheetColumns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']

export default function GoogleSheetsConfigContent({
    dataType,
    data = [],
    onClose,
    standalone = false,
    className
}: GoogleSheetsConfigContentProps) {
    const { data: session } = useSession()
    const [step, setStep] = useState(1) // 1: Basic, 2: Column Mapping, 3: Schedule
    const [isLoading, setIsLoading] = useState(false)
    const [savedConfigs, setSavedConfigs] = useState<ExportConfig[]>([])
    const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null)

    const [googleStatus, setGoogleStatus] = useState<{ isConnected: boolean, email?: string, picture?: string } | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [availableAccounts, setAvailableAccounts] = useState<Record<string, any>[]>([])

    const [config, setConfig] = useState<ExportConfig>({
        name: '',
        spreadsheetUrl: '',
        sheetName: 'Sheet1',
        dataType: dataType,
        columnMapping: {},
        autoExportEnabled: false,
        exportFrequency: 'daily',
        exportHour: 9,
        exportMinute: 0,
        exportInterval: 6,
        appendMode: true,
        includeDate: true,
        accountIds: [],
        useAdAccountTimezone: false,
        adAccountTimezone: null
    })

    const [singleDate, setSingleDate] = useState<Date | undefined>(new Date())

    const availableColumns = getAvailableColumns(dataType)

    // Initialize default column mapping
    useEffect(() => {
        // Reset mapping if data type or config changes, but respect if modifying existing
        if (Object.keys(config.columnMapping).length === 0) {
            const defaultMapping: Record<string, string> = {}

            if (dataType === 'ads') {
                defaultMapping['id'] = 'B'
                // defaultMapping['name'] = 'C' // Skipped as requested
                defaultMapping['accountName'] = 'D'
                defaultMapping['reach'] = 'F'
                defaultMapping['impressions'] = 'G'
                defaultMapping['postEngagements'] = 'H'
                defaultMapping['clicks'] = 'I'
                defaultMapping['newMessagingContacts'] = 'J'
                defaultMapping['spend'] = 'K'
                defaultMapping['videoAvgTimeWatched'] = 'M'
                defaultMapping['videoPlays'] = 'N'
                defaultMapping['video3SecWatched'] = 'O'
                defaultMapping['videoP25Watched'] = 'P'
                defaultMapping['videoP50Watched'] = 'Q'
                defaultMapping['videoP75Watched'] = 'R'
                defaultMapping['videoP95Watched'] = 'S'
                defaultMapping['videoP100Watched'] = 'T'
            } else if (dataType !== 'accounts') {
                defaultMapping['name'] = 'D'
                defaultMapping['reach'] = 'F'
                defaultMapping['impressions'] = 'G'
                defaultMapping['postEngagements'] = 'H'
                defaultMapping['clicks'] = 'I'
                defaultMapping['newMessagingContacts'] = 'J'
                defaultMapping['spend'] = 'K'
            } else {
                availableColumns.forEach((col, index) => {
                    const startIndex = config.includeDate ? index + 1 : index
                    defaultMapping[col.key] = sheetColumns[startIndex] || 'skip'
                })
            }
            setConfig(prev => ({ ...prev, columnMapping: defaultMapping }))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataType, config.includeDate])

    const fetchGoogleStatus = async () => {
        try {
            const res = await fetch('/api/auth/google/status')
            if (res.ok) {
                const status = await res.json()
                setGoogleStatus(status)
            }
        } catch (error) {
            console.error('Error fetching google status:', error)
        }
    }

    const fetchAccounts = async () => {
        try {
            const res = await fetch('/api/ads/basic?type=accounts')
            if (res.ok) {
                const { data } = await res.json()
                setAvailableAccounts(data || [])
            }
        } catch (error) {
            console.error('Error fetching accounts:', error)
        }
    }

    const fetchSavedConfigs = useCallback(async () => {
        try {
            const res = await fetch('/api/export/google-sheets')
            if (res.ok) {
                const { configs } = await res.json()
                setSavedConfigs(configs.filter((c: ExportConfig) => c.dataType === dataType))
            }
        } catch (error) {
            console.error('Error fetching configs:', error)
        }
    }, [dataType])

    // Fetch Google Status and Accounts
    useEffect(() => {
        fetchGoogleStatus()
        fetchAccounts()
        fetchSavedConfigs()
    }, [fetchSavedConfigs])

    const handleSaveConfig = async () => {
        if (!config.spreadsheetUrl || !config.sheetName) {
            toast.error('กรุณากรอก URL และชื่อ Sheet')
            return
        }

        setIsLoading(true)
        try {
            const method = selectedConfigId ? 'PUT' : 'POST'
            const body = selectedConfigId
                ? { id: selectedConfigId, ...config }
                : config

            const res = await fetch('/api/export/google-sheets', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (res.ok) {
                const { config: savedConfig } = await res.json()
                toast.success('บันทึกการตั้งค่าสำเร็จ')
                setSelectedConfigId(savedConfig.id!)
                fetchSavedConfigs()
                if (onClose) onClose()
            } else {
                throw new Error('Failed to save')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการบันทึก')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteConfig = async (id: string) => {
        if (!confirm('ต้องการลบการตั้งค่านี้?')) return

        try {
            const res = await fetch(`/api/export/google-sheets?id=${id}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                toast.success('ลบสำเร็จ')
                if (selectedConfigId === id) {
                    setSelectedConfigId(null)
                    resetConfig()
                }
                fetchSavedConfigs()
            }
        } catch {
            toast.error('เกิดข้อผิดพลาด')
        }
    }

    const handleLoadConfig = (savedConfig: ExportConfig) => {
        setSelectedConfigId(savedConfig.id || null)
        setConfig({
            ...savedConfig,
            columnMapping: typeof savedConfig.columnMapping === 'string'
                ? JSON.parse(savedConfig.columnMapping)
                : savedConfig.columnMapping || {}
        })
        setStep(3)
    }

    const resetConfig = () => {
        setConfig({
            name: '',
            spreadsheetUrl: '',
            sheetName: 'Sheet1',
            dataType: dataType,
            columnMapping: {},
            autoExportEnabled: false,
            exportFrequency: 'daily',
            exportHour: 9,
            exportMinute: 0,
            exportInterval: 6,
            appendMode: true,
            includeDate: true,
            accountIds: [],
            useAdAccountTimezone: false,
            adAccountTimezone: null
        })
        setSelectedConfigId(null)
        setStep(1)
    }

    const prepareExportData = (): string[][] => {
        const rows: string[][] = []
        const useDate = singleDate || new Date()
        const dd = String(useDate.getDate()).padStart(2, '0')
        const mm = String(useDate.getMonth() + 1).padStart(2, '0')
        const yyyy = useDate.getFullYear()
        const dateStr = `${dd}/${mm}/${yyyy}`

        let maxColIndex = 0
        Object.values(config.columnMapping).forEach(col => {
            if (col !== 'skip') {
                const index = col.charCodeAt(0) - 65
                if (index > maxColIndex) maxColIndex = index
            }
        })
        if (maxColIndex < 19 && config.dataType === 'ads') maxColIndex = 19

        const headerRow: string[] = new Array(maxColIndex + 1).fill('')
        if (config.includeDate) {
            headerRow[0] = 'วันที่'
        }
        Object.entries(config.columnMapping).forEach(([key, col]) => {
            if (col !== 'skip') {
                const colIndex = col.charCodeAt(0) - 65
                if (colIndex >= 0) {
                    const column = availableColumns.find(c => c.key === key)
                    headerRow[colIndex] = column?.label || key
                }
            }
        })
        rows.push(headerRow)

        data.forEach((item, index) => {
            const row: string[] = new Array(maxColIndex + 1).fill('')

            if (config.includeDate) {
                row[0] = dateStr
            }

            Object.entries(config.columnMapping).forEach(([key, col]) => {
                if (col !== 'skip') {
                    const colIndex = col.charCodeAt(0) - 65
                    if (colIndex >= 0) {
                        let value = ''
                        switch (key) {
                            case 'index':
                                value = String(index + 1)
                                break
                            case 'spendCap':
                            case 'budget':
                                value = item[key] ? (parseFloat(item[key]) / 100).toFixed(2) : ''
                                break
                            case 'spend':
                                value = item.spend ? parseFloat(item.spend).toFixed(2) : ''
                                break
                            case 'videoAvgTimeWatched':
                                const vVal = item.videoAvgTimeWatched ? parseFloat(item.videoAvgTimeWatched) : 0
                                if (vVal === 0 && !item.videoAvgTimeWatched) {
                                    value = '-'
                                } else {
                                    const m = Math.floor(vVal / 60)
                                    const s = Math.floor(vVal % 60)
                                    value = `${String(m).padStart(2, '0')}.${String(s).padStart(2, '0')}`
                                }
                                break
                            default:
                                value = String(item[key] || '')
                        }
                        row[colIndex] = value
                    }
                }
            })

            rows.push(row)
        })

        return rows
    }

    const handleExportNow = async () => {
        if (!config.spreadsheetUrl) {
            toast.error('กรุณากรอก URL ของ Google Sheets')
            return
        }

        setIsLoading(true)
        try {
            let currentConfigId = selectedConfigId
            if (!currentConfigId) {
                const method = 'POST'
                const res = await fetch('/api/export/google-sheets', {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                })
                if (res.ok) {
                    const { config: savedConfig } = await res.json()
                    currentConfigId = savedConfig.id
                    setSelectedConfigId(savedConfig.id!)
                    fetchSavedConfigs()
                } else {
                    throw new Error('Failed to save config')
                }
            }

            if (googleStatus?.isConnected) {
                const res = await fetch('/api/export/google-sheets/trigger', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        configId: currentConfigId,
                        dateRange: singleDate ? {
                            from: format(singleDate, 'yyyy-MM-dd'),
                            to: format(singleDate, 'yyyy-MM-dd')
                        } : undefined
                    })
                })

                const result = await res.json()
                if (res.ok) {
                    toast.success(`ส่งออกสำเร็จ! เพิ่มข้อมูล ${result.count} แถว`)
                    window.open(config.spreadsheetUrl, '_blank')
                    if (onClose) onClose()
                } else {
                    throw new Error(result.error || 'Export failed')
                }
            } else {
                if (data.length === 0) {
                    // For standalone page without data, we can't do clipboard export
                    toast.error('ไม่มีข้อมูลให้ส่งออก (Clipboard Export requires data loaded)')
                    return
                }
                const exportData = prepareExportData()
                const tsvContent = exportData.map(row => row.join('\t')).join('\n')
                await navigator.clipboard.writeText(tsvContent)

                toast.success(
                    <div className="flex flex-col gap-1">
                        <span className="font-medium">คัดลอก {data.length} รายการแล้ว!</span>
                        <span className="text-sm">ไปที่ Google Sheets แล้วกด Ctrl+V เพื่อวาง</span>
                    </div>
                )
                window.open(config.spreadsheetUrl, '_blank')
                if (onClose) onClose()
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    const updateColumnMapping = (dataKey: string, sheetColumn: string) => {
        setConfig(prev => ({
            ...prev,
            columnMapping: {
                ...prev.columnMapping,
                [dataKey]: sheetColumn
            }
        }))
    }

    const [availableSheets, setAvailableSheets] = useState<{ title: string, sheetId: number }[]>([])
    const [isFetchingSheets, setIsFetchingSheets] = useState(false)

    const handleConnectSheet = async () => {
        if (!config.spreadsheetUrl) {
            toast.error('กรุณากรอก URL ของ Google Sheets')
            return
        }

        setIsFetchingSheets(true)
        try {
            const res = await fetch('/api/google-sheets/list-sheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ spreadsheetUrl: config.spreadsheetUrl })
            })

            const data = await res.json()

            if (res.ok) {
                setAvailableSheets(data.sheets)
                setConfig(prev => ({
                    ...prev,
                    spreadsheetId: data.spreadsheetId,
                    sheetName: data.sheets[0]?.title || 'Sheet1'
                }))
                toast.success('เชื่อมต่อสำเร็จ! กรุณาเลือก Sheet')
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            toast.error(error.message || 'ไม่สามารถเชื่อมต่อได้')
        } finally {
            setIsFetchingSheets(false)
        }
    }

    return (
        <div className={cn("space-y-6", standalone ? "p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-sm" : "", className)}>
            {standalone && (
                <div className="flex items-center gap-2 mb-6 pb-4 border-b">
                    <FileSpreadsheet className="h-6 w-6 text-green-600" />
                    <h1 className="text-2xl font-bold">Google Sheets Export</h1>
                </div>
            )}

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 py-4">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${step >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                <div className={`h-1 w-8 rounded-full ${step >= 2 ? 'bg-green-600' : 'bg-gray-200'}`} />
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${step >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                <div className={`h-1 w-8 rounded-full ${step >= 3 ? 'bg-green-600' : 'bg-gray-200'}`} />
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${step >= 3 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
            </div>
            <div className="text-center text-sm text-gray-500 mb-4">
                {step === 1 && "เลือกบัญชีโฆษณา"}
                {step === 2 && "เชื่อมต่อ Google Sheet"}
                {step === 3 && "ตั้งเวลาส่งออก"}
            </div>

            {/* Saved Configs List */}
            {step === 1 && savedConfigs.length > 0 && (
                <div className="mb-6 border rounded-xl p-4 bg-gray-50">
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        การตั้งค่าที่บันทึกไว้
                    </h3>
                    <div className="space-y-2">
                        {savedConfigs.map(saved => (
                            <div key={saved.id} className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
                                <div className="flex-1">
                                    <div className="font-medium text-sm">{saved.sheetName || 'Untitled Config'}</div>
                                    <div className="text-xs text-gray-500 truncate max-w-[300px]">
                                        {saved.spreadsheetUrl}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {saved.autoExportEnabled
                                            ? `Auto: ${saved.exportHour}:${String(saved.exportMinute || 0).padStart(2, '0')}`
                                            : 'Manual Only'}
                                        {' • '}
                                        {saved.accountIds.length} Accounts
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleLoadConfig(saved)}
                                    >
                                        เลือกใช้
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleDeleteConfig(saved.id!)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 1: Select Ad Accounts */}
            {step === 1 && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>เลือกบัญชีโฆษณาที่ต้องการส่งออก</Label>
                        <div className="max-h-[300px] overflow-y-auto border rounded-xl p-2 bg-white space-y-1">
                            {availableAccounts.map(acc => (
                                <div key={acc.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-lg">
                                    <Checkbox
                                        id={`acc-${acc.id}`}
                                        checked={config.accountIds.includes(acc.id)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setConfig(prev => ({ ...prev, accountIds: [...prev.accountIds, acc.id] }))
                                            } else {
                                                setConfig(prev => ({ ...prev, accountIds: prev.accountIds.filter(id => id !== acc.id) }))
                                            }
                                        }}
                                    />
                                    <div className="flex-1">
                                        <Label htmlFor={`acc-${acc.id}`} className="text-sm font-medium cursor-pointer block">
                                            {acc.name} ({acc.id})
                                        </Label>
                                        <span className="text-xs text-gray-500">
                                            Timezone: {acc.timezone} | Currency: {acc.currency}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500">
                            * สามารถเลือกได้หลายบัญชี
                        </p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={() => setStep(2)}
                            disabled={config.accountIds.length === 0}
                            className="w-full sm:w-auto"
                        >
                            ถัดไป
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 2: Connect Google Sheet */}
            {step === 2 && (
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label>Google Sheets URL</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                value={config.spreadsheetUrl}
                                onChange={e => setConfig({ ...config, spreadsheetUrl: e.target.value })}
                            />
                            <Button onClick={handleConnectSheet} disabled={isFetchingSheets}>
                                {isFetchingSheets ? <Loader2 className="h-4 w-4 animate-spin" /> : 'เชื่อมต่อ'}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                            วางลิงก์ Google Sheet ที่คุณต้องการส่งออกข้อมูลไป
                        </p>
                    </div>

                    {availableSheets.length > 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <Label>เลือก Sheet (Tab)</Label>
                                <Select
                                    value={config.sheetName}
                                    onValueChange={val => setConfig({ ...config, sheetName: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableSheets.map(sheet => (
                                            <SelectItem key={sheet.sheetId} value={sheet.title}>
                                                {sheet.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="pt-4 border-t">
                                <Label className="mb-2 block">Mapping Columns</Label>
                                <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto p-2 border rounded-xl bg-gray-50">
                                    {availableColumns.map(col => (
                                        <div key={col.key} className="flex items-center justify-between text-sm">
                                            <span>{col.label}</span>
                                            <Select
                                                value={config.columnMapping[col.key] || 'skip'}
                                                onValueChange={val => updateColumnMapping(col.key, val)}
                                            >
                                                <SelectTrigger className="w-[100px] h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="skip">Skip</SelectItem>
                                                    {sheetColumns.map(letter => (
                                                        <SelectItem key={letter} value={letter}>{letter}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={config.includeDate}
                                onCheckedChange={checked => setConfig({ ...config, includeDate: checked })}
                            />
                            <Label>เพิ่มคอลัมน์วันที่อัตโนมัติ (Column A)</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={config.appendMode}
                                onCheckedChange={checked => setConfig({ ...config, appendMode: checked })}
                            />
                            <Label>ต่อท้ายข้อมูลเดิม (Append)</Label>
                        </div>
                    </div>

                    <div className="flex justify-between pt-4">
                        <Button variant="outline" onClick={() => setStep(1)}>ย้อนกลับ</Button>
                        <Button
                            onClick={() => setStep(3)}
                            disabled={!config.sheetName}
                        >
                            ถัดไป
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Schedule & Manual Export */}
            {step === 3 && (
                <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                        <div className="flex items-center gap-2">
                            <div className="h-10 w-10 bg-white rounded-full shadow-sm overflow-hidden flex items-center justify-center border">
                                {(session?.user?.image || googleStatus?.picture) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={session?.user?.image || googleStatus?.picture}
                                        alt="Profile"
                                        className="h-full w-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <Image src="/google-sheets-icon.png" alt="Google Sheets" width={24} height={24} />
                                )}
                            </div>
                            <div>
                                <h4 className="font-medium text-blue-900">ตั้งค่าการส่งออก</h4>
                                <p className="text-xs text-blue-700">
                                    {googleStatus?.isConnected
                                        ? `เชื่อมต่อกับ: ${googleStatus.email}`
                                        : 'กรุณาล็อกอิน Google เพื่อใช้งาน'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {googleStatus?.isConnected ? (
                        <Tabs defaultValue="manual" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="manual">ส่งออกเอง (Manual)</TabsTrigger>
                                <TabsTrigger value="auto">ตั้งเวลาอัตโนมัติ (Auto)</TabsTrigger>
                            </TabsList>

                            <TabsContent value="manual" className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>เลือกวันที่ของข้อมูล</Label>
                                    <div className="grid gap-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    id="date"
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !singleDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {singleDate ? (
                                                        format(singleDate, "dd/MM/yyyy")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    initialFocus
                                                    mode="single"
                                                    defaultMonth={singleDate}
                                                    selected={singleDate}
                                                    onSelect={setSingleDate}
                                                    numberOfMonths={1}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <p className="text-xs text-gray-500">
                                            * ข้อมูล Insights (Spend, Clicks, etc.) จะถูกดึงเฉพาะวันที่เลือกเท่านั้น
                                        </p>
                                    </div>

                                    <Button onClick={handleExportNow} disabled={isLoading} className="w-full mt-4">
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        ส่งออกข้อมูลทันที
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="auto" className="space-y-4 pt-4">
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            checked={config.autoExportEnabled}
                                            onCheckedChange={checked => setConfig({ ...config, autoExportEnabled: checked })}
                                        />
                                        <Label>เปิดใช้งานการส่งออกอัตโนมัติ</Label>
                                    </div>

                                    {config.autoExportEnabled && (
                                        <div className="space-y-4 border p-4 rounded bg-gray-50 animate-in fade-in">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>เวลาที่ส่งออก</Label>
                                                    <div className="flex gap-2 items-center">
                                                        <Select
                                                            value={String(config.exportHour)}
                                                            onValueChange={val => setConfig({ ...config, exportHour: parseInt(val) })}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {Array.from({ length: 24 }).map((_, i) => (
                                                                    <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <span className="text-gray-500 text-sm">น. (ทุกวัน)</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>ช่วงเวลาย้อนหลัง</Label>
                                                    <Select
                                                        value={String(config.exportInterval || 6)}
                                                        onValueChange={val => setConfig({ ...config, exportInterval: parseInt(val) })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1">1 ชั่วโมงล่าสุด</SelectItem>
                                                            <SelectItem value="6">6 ชั่วโมงล่าสุด</SelectItem>
                                                            <SelectItem value="12">12 ชั่วโมงล่าสุด</SelectItem>
                                                            <SelectItem value="24">24 ชั่วโมงล่าสุด (เมื่อวาน)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    checked={config.useAdAccountTimezone}
                                                    onCheckedChange={checked => setConfig({ ...config, useAdAccountTimezone: checked })}
                                                />
                                                <Label>ใช้ Timezone ของบัญชีโฆษณา</Label>
                                            </div>
                                        </div>
                                    )}

                                    <Button onClick={handleSaveConfig} disabled={isLoading} className="w-full">
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        บันทึกการตั้งค่า
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-md text-sm">
                                คุณยังไม่ได้เชื่อมต่อ Google Account ไม่สามารถใช้ฟีเจอร์ส่งออกอัตโนมัติ หรือส่งตรงเข้า Sheets ได้
                            </div>

                            {data.length > 0 ? (
                                <Button onClick={handleExportNow} disabled={isLoading} className="w-full">
                                    คัดลอกข้อมูลลง Clipboard (Copy)
                                </Button>
                            ) : (
                                <div className="text-center text-sm text-gray-400 p-2">
                                    ไม่มีข้อมูลแสดงผลสำหรับการคัดลอก (ไปที่หน้าตารางเพื่อคัดลอก)
                                </div>
                            )}

                            <Button onClick={handleSaveConfig} variant="outline" disabled={isLoading} className="w-full">
                                บันทึกการตั้งค่าไว้เฉยๆ
                            </Button>
                        </div>
                    )}

                    <div className="flex justify-between pt-4">
                        <Button variant="outline" onClick={() => setStep(2)}>ย้อนกลับ</Button>
                    </div>
                </div>
            )}
        </div>
    )
}
