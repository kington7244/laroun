import { SignJWT, jwtVerify } from "jose"

const ADMIN_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "admin-secret-key"
)

// Create admin JWT token
export async function createAdminToken() {
  return await new SignJWT({ role: "admin", isAdmin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(ADMIN_SECRET)
}

// Verify admin JWT token
export async function verifyAdminToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, ADMIN_SECRET)
    return payload.isAdmin === true
  } catch {
    return false
  }
}
