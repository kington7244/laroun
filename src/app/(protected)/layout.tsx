import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import DashboardLayout from "@/components/DashboardLayout"

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
        redirect("/login")
    }

    return (
        <DashboardLayout user={session.user as any}>
            {children}
        </DashboardLayout>
    )
}
