"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    Eye, 
    MousePointerClick, 
    Users,
    BarChart3,
    Target,
    Activity,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react"

// Mock data - ในอนาคตจะดึงจาก API
const stats = [
    {
        title: "Total Spend",
        value: "$12,450.00",
        change: "+12.5%",
        trend: "up",
        icon: DollarSign,
        color: "text-green-500",
        bgColor: "bg-green-50"
    },
    {
        title: "Impressions",
        value: "1.2M",
        change: "+8.2%",
        trend: "up",
        icon: Eye,
        color: "text-blue-500",
        bgColor: "bg-blue-50"
    },
    {
        title: "Clicks",
        value: "45,678",
        change: "-2.4%",
        trend: "down",
        icon: MousePointerClick,
        color: "text-purple-500",
        bgColor: "bg-purple-50"
    },
    {
        title: "Reach",
        value: "892K",
        change: "+15.3%",
        trend: "up",
        icon: Users,
        color: "text-orange-500",
        bgColor: "bg-orange-50"
    },
]

const recentCampaigns = [
    { name: "Summer Sale 2025", status: "Active", spend: "$2,450", results: "1,234", cpr: "$1.99" },
    { name: "Brand Awareness", status: "Active", spend: "$1,890", results: "45,678", cpr: "$0.04" },
    { name: "Lead Generation", status: "Paused", spend: "$3,200", results: "456", cpr: "$7.02" },
    { name: "Retargeting Campaign", status: "Active", spend: "$980", results: "234", cpr: "$4.19" },
    { name: "New Product Launch", status: "Learning", spend: "$5,430", results: "2,345", cpr: "$2.32" },
]

export default function DashboardPage() {
    return (
        <div className="h-full">
            <Card className="h-full flex flex-col">
                <CardContent className="flex-1 overflow-auto p-6">
                    <div className="space-y-6">
                        {/* Header */}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                            <p className="text-muted-foreground">Overview of your advertising performance</p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {stats.map((stat, index) => (
                                <Card key={index} className="relative overflow-hidden">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">{stat.title}</p>
                                                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                                <div className={`flex items-center gap-1 mt-2 text-sm ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                                    <span>{stat.change}</span>
                                                    <span className="text-muted-foreground">vs last month</span>
                                                </div>
                                            </div>
                                            <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Performance Chart */}
                            <Card className="lg:col-span-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-primary" />
                                        Performance Overview
                                    </CardTitle>
                                    <CardDescription>Daily spend and results for the last 7 days</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div className="text-center">
                                            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                                            <p className="text-muted-foreground">Chart will be displayed here</p>
                                            <p className="text-xs text-muted-foreground mt-1">Connect to view real-time data</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Quick Stats */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Target className="w-5 h-5 text-primary" />
                                        Quick Stats
                                    </CardTitle>
                                    <CardDescription>Key performance indicators</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <span className="text-sm text-muted-foreground">CTR</span>
                                        <span className="font-semibold">3.8%</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <span className="text-sm text-muted-foreground">CPM</span>
                                        <span className="font-semibold">$10.37</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <span className="text-sm text-muted-foreground">CPC</span>
                                        <span className="font-semibold">$0.27</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <span className="text-sm text-muted-foreground">ROAS</span>
                                        <span className="font-semibold text-green-600">4.2x</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <span className="text-sm text-muted-foreground">Frequency</span>
                                        <span className="font-semibold">1.34</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Recent Campaigns Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Campaigns</CardTitle>
                                <CardDescription>Your most recent advertising campaigns</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Campaign Name</th>
                                                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                                                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Spend</th>
                                                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Results</th>
                                                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Cost/Result</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentCampaigns.map((campaign, index) => (
                                                <tr key={index} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                    <td className="py-3 px-4 font-medium">{campaign.name}</td>
                                                    <td className="py-3 px-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            campaign.status === 'Active' ? 'bg-green-100 text-green-700' :
                                                            campaign.status === 'Paused' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>
                                                            {campaign.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right">{campaign.spend}</td>
                                                    <td className="py-3 px-4 text-right">{campaign.results}</td>
                                                    <td className="py-3 px-4 text-right">{campaign.cpr}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
