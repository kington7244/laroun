import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

export async function middleware(req: NextRequest) {
    const token = await getToken({ req })
    const isAuth = !!token
    const isLandingPage = req.nextUrl.pathname === "/"

    // 1. Rate Limiting for API routes
    if (req.nextUrl.pathname.startsWith("/api")) {
        const ip = req.headers.get("x-forwarded-for") || "127.0.0.1"

        // Limit: 100 requests per minute per IP
        const result = await rateLimit({
            ip,
            limit: 100,
            window: 60
        })

        if (!result.success) {
            return new NextResponse(JSON.stringify({
                error: "Too Many Requests",
                message: "Please try again later."
            }), {
                status: 429,
                headers: {
                    "Content-Type": "application/json",
                    "X-RateLimit-Limit": result.limit.toString(),
                    "X-RateLimit-Remaining": result.remaining.toString(),
                    "X-RateLimit-Reset": result.reset.toString()
                }
            })
        }
    }

    // 2. Auth Redirection
    if (isAuth && isLandingPage) {
        return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        "/",
        "/api/:path*" // Match all API routes for rate limiting
    ],
}
