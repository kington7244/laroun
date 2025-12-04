'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, upsertConversation, markConversationAsViewed } from "@/lib/db";
import { 
    getAdAccounts, 
    getPages, 
    getPageConversations, 
    getConversationMessages, 
    sendMessage 
} from '@/lib/facebook';

// ===== Token Management =====

export async function saveFacebookToken(shortLivedToken: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Not authenticated");
    }

    const userId = (session.user as any).id;

    // Exchange short-lived token for long-lived token
    let longLivedToken = shortLivedToken;
    try {
        const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?` +
            `grant_type=fb_exchange_token&` +
            `client_id=${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}&` +
            `client_secret=${process.env.FACEBOOK_APP_SECRET}&` +
            `fb_exchange_token=${shortLivedToken}`;

        const response = await fetch(exchangeUrl);
        const data = await response.json();

        if (data.access_token) {
            longLivedToken = data.access_token;
            console.log('[Token Exchange] Got long-lived token, expires in:', data.expires_in, 'seconds');
        }
    } catch (err) {
        console.error('[Token Exchange] Error:', err);
    }

    // Save token to user
    await prisma.user.update({
        where: { id: userId },
        data: { facebookAdToken: longLivedToken }
    });

    // Subscribe pages to webhook in background
    subscribeWebhooksInBackground(longLivedToken);

    return { success: true };
}

async function subscribeWebhooksInBackground(token: string) {
    try {
        const pages = await getPages(token);
        console.log(`[Auto-Subscribe] Found ${pages.length} pages`);

        await Promise.allSettled(pages.map(async (page: any) => {
            if (page.access_token) {
                try {
                    const response = await fetch(
                        `https://graph.facebook.com/v21.0/${page.id}/subscribed_apps`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({
                                subscribed_fields: 'messages,messaging_postbacks',
                                access_token: page.access_token
                            })
                        }
                    );
                    const result = await response.json();
                    console.log(`[Auto-Subscribe] Page ${page.name}: ${result.success ? 'OK' : 'Failed'}`);
                } catch (subErr) {
                    console.error(`[Auto-Subscribe] Failed for page ${page.id}:`, subErr);
                }
            }
        }));
    } catch (err) {
        console.error('[Auto-Subscribe] Error:', err);
    }
}

// ===== Ad Manager Functions =====

export async function fetchAdAccounts(accessToken: string) {
    try {
        const accounts = await getAdAccounts(accessToken);
        return JSON.parse(JSON.stringify(accounts));
    } catch (error: any) {
        console.error('Failed to fetch ad accounts:', error);
        throw new Error(error.message || 'Failed to fetch ad accounts');
    }
}

// ===== AdBox Functions =====

export async function fetchPages() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return []; // Return empty array if not authenticated
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { facebookAdToken: true }
    });

    const accessToken = user?.facebookAdToken;
    if (!accessToken) {
        return []; // Return empty array if no token
    }

    try {
        const pages = await getPages(accessToken);
        return JSON.parse(JSON.stringify(pages));
    } catch (error: any) {
        console.error('Failed to fetch pages:', error);
        return []; // Return empty array on error
    }
}

export async function fetchConversations(pages: { id: string, access_token?: string }[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Not authenticated");
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { facebookAdToken: true }
    });

    const accessToken = user?.facebookAdToken;
    if (!accessToken) {
        return [];
    }

    try {
        const allConversations: any[] = [];

        for (const page of pages) {
            try {
                const convs = await getPageConversations(accessToken, page.id, page.access_token);
                
                for (const conv of convs) {
                    let participantId: string | null = null;
                    let participantName = 'Facebook User';

                    if (conv.participants?.data) {
                        const userParticipant = conv.participants.data.find((p: any) => p.id !== page.id);
                        if (userParticipant) {
                            participantId = userParticipant.id;
                            participantName = userParticipant.name || 'Facebook User';
                        }
                    }

                    // Save to database
                    await upsertConversation({
                        pageId: page.id,
                        participantId: participantId || conv.id,
                        participantName,
                        snippet: conv.snippet,
                        updatedTime: new Date(conv.updated_time),
                        unreadCount: conv.unread_count || 0,
                        facebookLink: conv.link
                    });

                    allConversations.push({
                        id: conv.id,
                        pageId: page.id,
                        snippet: conv.snippet,
                        updated_time: conv.updated_time,
                        unread_count: conv.unread_count || 0,
                        facebookLink: conv.link,
                        participants: {
                            data: [{
                                id: participantId || conv.id,
                                name: participantName
                            }]
                        }
                    });
                }
            } catch (e) {
                console.error(`Failed to fetch for page ${page.id}`, e);
            }
        }

        // Sort by updated time
        allConversations.sort((a, b) => 
            new Date(b.updated_time).getTime() - new Date(a.updated_time).getTime()
        );

        return JSON.parse(JSON.stringify(allConversations));
    } catch (error: any) {
        console.error('Failed to fetch conversations:', error);
        return [];
    }
}

export async function fetchMessages(conversationId: string, pageId: string, pageAccessToken?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Not authenticated");
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { facebookAdToken: true }
    });

    const accessToken = user?.facebookAdToken;
    if (!accessToken) {
        return [];
    }

    try {
        const messages = await getConversationMessages(accessToken, conversationId, pageId, pageAccessToken);
        return JSON.parse(JSON.stringify(messages));
    } catch (error: any) {
        console.error('Failed to fetch messages:', error);
        return [];
    }
}

export async function sendReply(pageId: string, recipientId: string, messageText: string, conversationId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Not authenticated");
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { facebookAdToken: true }
    });

    const accessToken = user?.facebookAdToken;
    if (!accessToken) {
        throw new Error("No Facebook token found");
    }

    try {
        const result = await sendMessage(accessToken, pageId, recipientId, messageText);
        return { success: true, data: result };
    } catch (error: any) {
        console.error('Failed to send message:', error);
        return { success: false, error: error.message };
    }
}

export async function markConversationRead(conversationId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Not authenticated");
    }

    const userId = (session.user as any).id;
    
    try {
        await markConversationAsViewed(conversationId, userId);
        return { success: true };
    } catch (error) {
        console.error('Failed to mark conversation as read:', error);
        return { success: false };
    }
}

export async function fetchConversationsFromDB(pageIds: string[]) {
    if (pageIds.length === 0) return [];

    try {
        // Import getConversations from db
        const { getConversations } = await import('@/lib/db');
        
        const allConversations = [];
        for (const pageId of pageIds) {
            const convs = await getConversations(pageId);
            allConversations.push(...convs);
        }

        return allConversations.map((c: any) => ({
            id: c.id,
            pageId: c.pageId,
            snippet: c.snippet,
            updated_time: c.updatedTime?.toISOString(),
            unread_count: c.unreadCount,
            facebookLink: c.facebookLink,
            participants: {
                data: [{
                    id: c.participantId,
                    name: c.participantName || 'Facebook User'
                }]
            }
        }));
    } catch (error) {
        console.error('Failed to fetch conversations from DB:', error);
        return [];
    }
}
