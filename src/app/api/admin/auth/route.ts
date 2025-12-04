import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminToken } from "@/lib/admin-auth"

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    const adminUsername = process.env.ADMIN_USERNAME
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminUsername || !adminPassword) {
      return NextResponse.json(
        { error: "Admin credentials not configured" },
        { status: 500 }
      )
    }

    if (username === adminUsername && password === adminPassword) {
      const token = await createAdminToken()
      
      const cookieStore = await cookies()
      cookieStore.set("admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    )
  } catch (error) {
    console.error("[Admin Auth Error]", error)
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}

// Logout
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete("admin_token")
  return NextResponse.json({ success: true })
}
