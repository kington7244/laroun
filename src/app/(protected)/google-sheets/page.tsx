import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import GoogleSheetsConfigContent from "@/components/GoogleSheetsConfigContent"
import { FileSpreadsheet } from "lucide-react"

export default function GoogleSheetsPage() {
    return (
        <div className="h-full">
            <Card className="h-full flex flex-col border-0 shadow-none md:border md:shadow-sm rounded-none md:rounded-2xl">
                <CardHeader className="px-6 py-4 border-b flex flex-row items-center gap-2 space-y-0">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-xl">Google Sheets Export</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-0">
                    <GoogleSheetsConfigContent
                        dataType="ads"
                        standalone={false}
                        className="p-6 max-w-5xl mx-auto"
                    />
                </CardContent>
            </Card>
        </div>
    )
}
