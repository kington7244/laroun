import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { db } from "@/lib/db"
import { compare } from "bcryptjs"
import { logActivity } from "@/lib/activity-log"
import { Adapter, AdapterUser } from "next-auth/adapters"

// Custom adapter that sets role to 'host' for new users
function CustomPrismaAdapter(): Adapter {
    const prismaAdapter = PrismaAdapter(db)

    return {
        ...prismaAdapter,
        createUser: async (data: Omit<AdapterUser, "id">) => {
            // Check if user already exists (was pre-created by host adding to team)
            const existingUser = await db.user.findUnique({
                where: { email: data.email! }
            })

            if (existingUser) {
                // User was pre-created (appointed by host), keep their role
                return existingUser
            }

            // New user - create with role 'host'
            const user = await db.user.create({
                data: {
                    ...data,
                    role: 'host', // New users who sign up are always host
                }
            })
            return user
        }
    }
}

export const authOptions: NextAuthOptions = {
    debug: true,
    adapter: CustomPrismaAdapter(),
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                    scope: "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
                },
            },
        }),
        FacebookProvider({
            clientId: process.env.FACEBOOK_APP_ID!,
            clientSecret: process.env.FACEBOOK_APP_SECRET!,
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    scope: "email,public_profile,ads_read,ads_management,pages_read_engagement,pages_show_list,pages_messaging,pages_manage_metadata",
                },
            },
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const user = await db.user.findUnique({
                    where: {
                        email: credentials.email,
                    },
                })

                if (!user || !user.password) {
                    return null
                }

                const isPasswordValid = await compare(
                    credentials.password,
                    user.password
                )

                if (!isPasswordValid) {
                    return null
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                }
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            return {
                ...session,
                user: {
                    ...session.user,
                    id: token.id as string,
                    name: token.name as string | undefined,
                    role: token.role as string,
                    image: token.picture as string | undefined,
                },
            }
        },
        async jwt({ token, user, account, profile, trigger, session }) {
            // Handle session update (when user updates profile)
            if (trigger === 'update' && session) {
                // Update token with new data from session
                if (session.name) token.name = session.name
                if (session.image) token.picture = session.image
                return token
            }

            if (user) {
                token.id = user.id
                // Fetch role from database
                const dbUser = await db.user.findUnique({
                    where: { id: user.id },
                    select: { role: true, email: true, name: true, image: true }
                })
                // New users (OAuth) are host by default
                // If user was appointed by a host (admin/staff), keep that role
                token.role = dbUser?.role || 'host'
                token.name = dbUser?.name || user.name

                // Log login activity
                logActivity({
                    userId: user.id,
                    userEmail: dbUser?.email || user.email || '',
                    userName: dbUser?.name || user.name,
                    action: 'login',
                    details: { provider: account?.provider || 'credentials' }
                });

                // Get image from user object (from DB or OAuth)
                if (user.image) {
                    token.picture = user.image
                }
            }
            // Get image from Google profile on sign in
            if (account?.provider === "google" && profile) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                token.picture = (profile as any).picture

                // FORCE UPDATE: Save the new tokens to the database
                // NextAuth doesn't always update the Account table on re-login, so we do it manually
                // to ensure we capture the new Refresh Token and Scopes.
                if (user) {
                    try {
                        await db.account.updateMany({
                            where: {
                                userId: user.id,
                                provider: 'google'
                            },
                            data: {
                                access_token: account.access_token,
                                expires_at: account.expires_at,
                                refresh_token: account.refresh_token, // Only present if prompt="consent" was used
                                scope: account.scope,
                                id_token: account.id_token,
                                token_type: account.token_type
                            }
                        })
                    } catch (e) {
                        console.error("Failed to update Google tokens in DB:", e)
                    }
                }
            }
            // Get image from Facebook profile on sign in
            if (account?.provider === "facebook" && profile) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fbProfile = profile as any
                token.picture = fbProfile.picture?.data?.url || fbProfile.picture

                // Also update Facebook tokens if needed
                if (user) {
                    try {
                        await db.account.updateMany({
                            where: {
                                userId: user.id,
                                provider: 'facebook'
                            },
                            data: {
                                access_token: account.access_token,
                                expires_at: account.expires_at,
                                // Facebook doesn't usually give refresh_token here in the same way, but good to sync
                            }
                        })
                    } catch (e) {
                        console.error("Failed to update Facebook tokens in DB:", e)
                    }
                }
            }
            return token
        },
    },
}
