import { Suspense } from "react"
import AdsTable from "@/components/AdsTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdManagerPage() {
    return (
        <div className="h-full">
            <Card className="h-full flex flex-col">
                <CardContent className="flex-1 overflow-hidden">
                    <Suspense fallback={<div>Loading ads...</div>}>
                        <AdsTable />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    )
}
