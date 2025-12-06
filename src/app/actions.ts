'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, upsertConversation, markConversationAsViewed } from "@/lib/db";
import { 
    getAdAccounts, 
    getPages, 
    getPageConversations, 
    getAllConversationMessages, 
    sendMessage, 
    getConversationTags,
    getFreshPageAccessToken
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
    let facebookName: string | null = null;
    
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
    
    // Get Facebook user name from /me endpoint
    try {
        const meResponse = await fetch(`https://graph.facebook.com/v21.0/me?fields=name&access_token=${longLivedToken}`);
        const meData = await meResponse.json();
        if (meData.name) {
            facebookName = meData.name;
            console.log('[Token Exchange] Got Facebook name:', facebookName);
        }
    } catch (err) {
        console.error('[Token Exchange] Error getting Facebook name:', err);
    }

    // Save token and Facebook name to user
    await prisma.user.update({
        where: { id: userId },
        data: { 
            facebookAdToken: longLivedToken,
            facebookName: facebookName
        }
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

// ===== Helper: Get User's Facebook Token =====

async function getUserFacebookToken(userId: string): Promise<string | null> {
    // Get user's own token only (no sharing)
    const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { facebookAdToken: true }
    });

    // If user has their own token, use it
    if (user?.facebookAdToken) {
        return user.facebookAdToken;
    }
    
    // Try OAuth token from Account table
    const account = await prisma.account.findFirst({
        where: { userId, provider: "facebook" },
        select: { access_token: true }
    });
    
    if (account?.access_token) {
        return account.access_token;
    }
    
    return null;
}

// ===== AdBox Functions =====

export async function fetchPages() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        console.log('[fetchPages] No session');
        return []; // Return empty array if not authenticated
    }

    const userId = (session.user as any).id;
    console.log('[fetchPages] userId:', userId);
    
    // Get user's own token (each user must connect Facebook)
    const accessToken = await getUserFacebookToken(userId);
    console.log('[fetchPages] Token found:', !!accessToken);

    if (!accessToken) {
        console.log('[fetchPages] No Facebook token found for user');
        return []; // Return empty array if no token
    }

    try {
        console.log('[fetchPages] Fetching pages with token...');
        const pages = await getPages(accessToken);
        console.log('[fetchPages] Found pages:', pages.length);
        return JSON.parse(JSON.stringify(pages));
    } catch (error: any) {
        console.error('[fetchPages] Failed to fetch pages:', error.message);
        return []; // Return empty array on error
    }
}

export async function fetchConversations(pages: { id: string, access_token?: string }[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Not authenticated");
    }

    const userId = (session.user as any).id;
    
    // Get user role to check if they can see all chats
    const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });
    const canSeeAllChats = userRecord?.role === 'host' || userRecord?.role === 'admin';
    
    // Get user's own token (each user must connect Facebook)
    const accessToken = await getUserFacebookToken(userId);

    if (!accessToken) {
        console.log('[fetchConversations] No Facebook token found for user');
        return [];
    }

    try {
        // Fetch all pages in parallel
        const pageResults = await Promise.all(
            pages.map(async (page) => {
                try {
                    const convs = await getPageConversations(accessToken!, page.id, page.access_token);
                    return convs.map((conv: any) => {
                        let participantId: string | null = null;
                        let participantName = 'Facebook User';

                        if (conv.participants?.data) {
                            const userParticipant = conv.participants.data.find((p: any) => p.id !== page.id);
                            if (userParticipant) {
                                participantId = userParticipant.id;
                                participantName = userParticipant.name || 'Facebook User';
                            }
                        }

                        return {
                            id: conv.id,
                            pageId: page.id,
                            snippet: conv.snippet,
                            updated_time: conv.updated_time,
                            unread_count: conv.unread_count || 0,
                            facebookLink: conv.link,
                            participantId: participantId || conv.id,
                            participantName,
                            participants: {
                                data: [{
                                    id: participantId || conv.id,
                                    name: participantName
                                }]
                            }
                        };
                    });
                } catch (e) {
                    console.error(`Failed to fetch for page ${page.id}`, e);
                    return [];
                }
            })
        );

        // Flatten results
        const allConversations = pageResults.flat();

        // Sort by updated time
        allConversations.sort((a, b) => 
            new Date(b.updated_time).getTime() - new Date(a.updated_time).getTime()
        );

        // Save to database and get corrected unread counts
        const savedConversations = await Promise.all(
            allConversations.map(async conv => {
                try {
                    const saved = await upsertConversation({
                        pageId: conv.pageId,
                        participantId: conv.participantId,
                        participantName: conv.participantName,
                        snippet: conv.snippet,
                        updatedTime: new Date(conv.updated_time),
                        unreadCount: conv.unread_count || 0,
                        facebookLink: conv.facebookLink,
                        facebookConversationId: conv.id
                    });
                    // Return conv with corrected unread_count from DB and assignedToId
                    return {
                        ...conv,
                        unread_count: saved.unreadCount,
                        adId: saved.adId,
                        lastViewedBy: saved.lastViewedBy,
                        lastViewedAt: saved.lastViewedAt?.toISOString(),
                        assignedToId: saved.assignedToId
                    };
                } catch (e) {
                    console.error('Failed to save conversation:', e);
                    return conv;
                }
            })
        );

        return JSON.parse(JSON.stringify(savedConversations));
    } catch (error: any) {
        console.error('Failed to fetch conversations:', error);
        return [];
    }
}

export async function fetchMessages(conversationId: string, pageId: string, pageAccessToken?: string, facebookConversationId?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Not authenticated");
    }

    const userId = (session.user as any).id;
    
    // First, try to get messages from database (instant display)
    const dbMessages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdTime: 'asc' }
    });
    
    // Format DB messages
    const formattedDbMessages = dbMessages.map(m => ({
        id: m.id,
        message: m.text,
        from: { id: m.from },
        created_time: m.createdTime.toISOString(),
        attachments: m.attachments ? JSON.parse(m.attachments) : undefined,
        sticker: m.stickerUrl ? { url: m.stickerUrl } : undefined,
        isFromPage: m.isFromPage,
        repliedById: m.repliedById,
        repliedByName: m.repliedByName
    }));

    // Determine which ID to use for Facebook API
    const fbConvId = facebookConversationId || conversationId;

    // If we have cached messages, return them first
    if (formattedDbMessages.length > 0) {
        // Try to sync from Facebook in background (don't wait)
        syncMessagesFromFacebook(conversationId, pageId, userId, pageAccessToken, fbConvId).catch(e => 
            console.error('[fetchMessages] Background sync error:', e)
        );
        return formattedDbMessages;
    }
    
    // No cache, try to fetch from Facebook
    // Get user's own token (each user must connect Facebook)
    const accessToken = await getUserFacebookToken(userId);

    if (!accessToken) {
        console.log('[fetchMessages] No Facebook token found for user');
        return formattedDbMessages;
    }

    try {
        // Use Facebook conversation ID for API call
        const messages = await getAllConversationMessages(accessToken, fbConvId, pageId, pageAccessToken, 500);
        
        // Save messages to DB for future cache
        if (messages.length > 0) {
            const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
            if (conversation) {
                await Promise.all(messages.map(async (msg: any) => {
                    // Facebook sends sticker as string URL, not { url: ... }
                    const stickerUrl = typeof msg.sticker === 'string' ? msg.sticker : msg.sticker?.url;
                    await prisma.message.upsert({
                        where: { id: msg.id },
                        create: {
                            id: msg.id,
                            conversationId,
                            from: msg.from?.id || 'unknown',
                            text: msg.message,
                            attachments: msg.attachments ? JSON.stringify(msg.attachments) : null,
                            stickerUrl: stickerUrl,
                            isFromPage: msg.from?.id === pageId,
                            createdTime: new Date(msg.created_time)
                        },
                        update: {
                            stickerUrl: stickerUrl,
                            attachments: msg.attachments ? JSON.stringify(msg.attachments) : null
                        }
                    });
                }));
            }
        }
        
        // Normalize sticker format for frontend (convert string to { url: ... })
        const normalizedMessages = messages.map((msg: any) => ({
            ...msg,
            sticker: msg.sticker ? { url: typeof msg.sticker === 'string' ? msg.sticker : msg.sticker.url } : undefined,
            stickerUrl: typeof msg.sticker === 'string' ? msg.sticker : msg.sticker?.url
        }));
        
        return JSON.parse(JSON.stringify(normalizedMessages));
    } catch (error: any) {
        console.error('Failed to fetch messages:', error);
        return formattedDbMessages;
    }
}

// Fetch conversation tags from Facebook Page Inbox labels
export async function fetchConversationTags(conversationId: string, pageId: string, facebookConversationId?: string, pageAccessToken?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Not authenticated");
    }

    const userId = (session.user as any).id;

    const accessToken = await getUserFacebookToken(userId);
    if (!accessToken) {
        console.log('[fetchConversationTags] No Facebook token found for user');
        return [];
    }

    const fbConvId = facebookConversationId || conversationId;

    // Try to get page access token; refresh user token if needed; also capture app token
    let pageTokenToUse: string | undefined = pageAccessToken;
    let refreshedUserToken: string | null = null;
    let appAccessToken: string | null = null;

    try {
        const pageSettings = await prisma.pageSettings.findUnique({
            where: { pageId },
            select: { pageAccessToken: true }
        });
        if (pageSettings?.pageAccessToken) {
            pageTokenToUse = pageSettings.pageAccessToken;
        }
    } catch (e) {
        console.error('[fetchConversationTags] Failed to read page token from DB:', e);
    }

    if (!pageTokenToUse) {
        try {
            const { pageAccessToken, refreshedUserToken: newUserToken, appAccessToken: bizToken } = await getFreshPageAccessToken(accessToken, pageId);
            if (pageAccessToken) pageTokenToUse = pageAccessToken;
            if (newUserToken) refreshedUserToken = newUserToken;
            if (bizToken) appAccessToken = bizToken;
        } catch (err) {
            console.error('[fetchConversationTags] getFreshPageAccessToken failed:', err);
        }
    }

    try {
        const userTokenForCall = pageTokenToUse ? accessToken : accessToken; // keep existing user token for Graph; page token is passed separately
        const tags = await getConversationTags(userTokenForCall, fbConvId, pageId, pageTokenToUse || undefined);
        if (!tags || tags.length === 0) {
            console.log('[fetchConversationTags] no tags', { conv: fbConvId, pageId, refreshed: !!refreshedUserToken, hasPage: !!pageTokenToUse, hasApp: !!appAccessToken });
        } else {
            console.log('[fetchConversationTags] tags found', { conv: fbConvId, pageId, tags, refreshed: !!refreshedUserToken, hasPage: !!pageTokenToUse, hasApp: !!appAccessToken });
        }
        return JSON.parse(JSON.stringify(tags));
    } catch (error) {
        console.error('Failed to fetch conversation tags:', error);
        return [];
    }
}

// Background sync helper
async function syncMessagesFromFacebook(conversationId: string, pageId: string, userId: string, pageAccessToken?: string, facebookConversationId?: string) {
    // Get user's own token (each user must connect Facebook)
    const accessToken = await getUserFacebookToken(userId);

    if (!accessToken) return;

    // Use Facebook conversation ID for API call
    const fbConvId = facebookConversationId || conversationId;

    try {
        const messages = await getAllConversationMessages(accessToken, fbConvId, pageId, pageAccessToken, 500);
        
        if (messages.length > 0) {
            await Promise.all(messages.map(async (msg: any) => {
                // Facebook sends sticker as string URL, not { url: ... }
                const stickerUrl = typeof msg.sticker === 'string' ? msg.sticker : msg.sticker?.url;
                
                // Check if message already exists
                const existing = await prisma.message.findUnique({
                    where: { id: msg.id }
                });
                
                if (existing) {
                    // Only update attachments/sticker, preserve repliedById/repliedByName
                    await prisma.message.update({
                        where: { id: msg.id },
                        data: {
                            stickerUrl: stickerUrl || existing.stickerUrl,
                            attachments: msg.attachments ? JSON.stringify(msg.attachments) : existing.attachments
                        }
                    });
                } else {
                    // Create new message
                    await prisma.message.create({
                        data: {
                            id: msg.id,
                            conversationId,
                            from: msg.from?.id || 'unknown',
                            text: msg.message,
                            attachments: msg.attachments ? JSON.stringify(msg.attachments) : null,
                            stickerUrl: stickerUrl,
                            isFromPage: msg.from?.id === pageId,
                            createdTime: new Date(msg.created_time)
                        }
                    });
                }
            }));
        }
    } catch (e) {
        console.error('[syncMessagesFromFacebook] Error:', e);
    }
}

export async function sendReply(pageId: string, recipientId: string, messageText: string, conversationId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Not authenticated");
    }

    const userId = (session.user as any).id;
    
    // Get user role to check if they can see all chats
    const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });
    const canSeeAllChats = userRecord?.role === 'host' || userRecord?.role === 'admin';
    
    // Get user's own token (each user must connect Facebook)
    const accessToken = await getUserFacebookToken(userId);

    if (!accessToken) {
        throw new Error("No Facebook token found");
    }
    
    // Get user's name for tracking who replied
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { facebookName: true, name: true, email: true }
    });
    const repliedByName = user?.facebookName || user?.name || user?.email || 'Unknown';

    try {
        const result = await sendMessage(accessToken, pageId, recipientId, messageText);
        
        // Update conversation updated_time and save message to DB
        const now = new Date();
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { 
                updatedTime: now,
                snippet: messageText.substring(0, 100)
            }
        });
        
        // Save sent message to DB with replier info
        await prisma.message.create({
            data: {
                id: result.message_id || `sent_${Date.now()}`,
                conversationId,
                from: pageId,
                text: messageText,
                isFromPage: true,
                repliedById: userId,
                repliedByName: repliedByName,
                createdTime: now
            }
        });
        
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
    const userEmail = session.user.email || '';
    const now = new Date();
    
    // Get Facebook name from user record
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { facebookName: true, name: true }
    });
    const userName = user?.facebookName || user?.name || session.user.email || 'Unknown';
    
    try {
        // Directly set unreadCount to 0 and track who viewed
        const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
        if (conversation) {
            // Parse existing viewers
            let viewedBy: Array<{id: string, name: string, email: string, viewedAt: string}> = [];
            try {
                viewedBy = conversation.viewedBy ? JSON.parse(conversation.viewedBy) : [];
            } catch (e) {
                viewedBy = [];
            }
            
            // Update or add current user's view record
            const existingIndex = viewedBy.findIndex(v => v.id === userId);
            const viewRecord = {
                id: userId,
                name: userName,
                email: userEmail,
                viewedAt: now.toISOString()
            };
            
            if (existingIndex >= 0) {
                viewedBy[existingIndex] = viewRecord;
            } else {
                viewedBy.push(viewRecord);
            }
            
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { 
                    unreadCount: 0,
                    viewedBy: JSON.stringify(viewedBy),
                    lastViewedBy: userName,
                    lastViewedAt: now
                }
            });
        }
        return { success: true };
    } catch (error) {
        console.error('Failed to mark conversation as read:', error);
        return { success: false };
    }
}

export async function fetchConversationsFromDB(pageIds: string[]) {
    if (pageIds.length === 0) return [];

    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return [];
    }

    const userId = (session.user as any).id;
    
    // Get user role
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });

    // Host and Admin can see all chats, Staff only sees assigned
    const canSeeAllChats = user?.role === 'admin';

    try {
        // Build where clause based on role
        const whereClause: any = {
            pageId: { in: pageIds }
        };

        // Staff can only see their assigned conversations
        if (!canSeeAllChats) {
            whereClause.assignedToId = userId;
        }

        const allConversations = await prisma.conversation.findMany({
            where: whereClause,
            orderBy: { updatedTime: 'desc' },
            take: 200, // Limit total
            include: {
                assignedTo: {
                    select: { id: true, name: true, facebookName: true, email: true }
                }
            }
        });

        return allConversations.map((c: any) => {
            // Parse viewedBy
            let viewedByList: Array<{id: string, name: string, email: string, viewedAt: string}> = [];
            try {
                viewedByList = c.viewedBy ? JSON.parse(c.viewedBy) : [];
            } catch (e) {
                viewedByList = [];
            }
            
            return {
                id: c.id,
                facebookConversationId: c.facebookConversationId,
                pageId: c.pageId,
                snippet: c.snippet,
                updated_time: c.updatedTime?.toISOString(),
                unread_count: c.unreadCount,
                adId: c.adId,
                facebookLink: c.facebookLink,
                participants: {
                    data: [{
                        id: c.participantId,
                        name: c.participantName || 'Facebook User'
                    }]
                },
                viewedBy: viewedByList,
                lastViewedBy: c.lastViewedBy,
                lastViewedAt: c.lastViewedAt?.toISOString(),
                assignedToId: c.assignedToId,
                assignedTo: c.assignedTo ? {
                    id: c.assignedTo.id,
                    name: c.assignedTo.facebookName || c.assignedTo.name || c.assignedTo.email
                } : null,
                assignedAt: c.assignedAt?.toISOString()
            };
        });
    } catch (error) {
        console.error('Failed to fetch conversations from DB:', error);
        return [];
    }
}

// Get current user info with role
export async function getCurrentUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return null;
    }

    const userId = (session.user as any).id;
    
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
            id: true, 
            name: true, 
            email: true, 
            facebookName: true, 
            role: true 
        }
    });

    return user;
}

// Assign conversation to staff member
export async function assignConversation(conversationId: string, assignToId: string | null) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Not authenticated");
    }

    const userId = (session.user as any).id;
    
    // Check if user is admin
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });

    if (user?.role !== 'admin') {
        throw new Error("Only admins can assign conversations");
    }

    await prisma.conversation.update({
        where: { id: conversationId },
        data: {
            assignedToId: assignToId,
            assignedAt: assignToId ? new Date() : null
        }
    });

    return { success: true };
}

// Auto-assign all unassigned conversations
export async function autoAssignAllConversations() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Not authenticated");
    }

    const userId = (session.user as any).id;
    
    // Check if user is admin
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });

    if (user?.role !== 'admin') {
        throw new Error("Only admins can auto-assign conversations");
    }

    // Get team and active members
    const team = await prisma.team.findFirst({
        where: { ownerId: userId },
        include: {
            members: {
                where: { isActive: true },
                include: { user: true }
            }
        }
    });

    if (!team || team.members.length === 0) {
        throw new Error("No active team members");
    }

    // Get all unassigned conversations
    const unassignedConversations = await prisma.conversation.findMany({
        where: { assignedToId: null },
        orderBy: { updatedTime: 'desc' }
    });

    if (unassignedConversations.length === 0) {
        return { success: true, assigned: 0 };
    }

    // Round-robin assignment
    let memberIndex = team.lastAssignedIndex || 0;
    const assignments = [];

    for (const conv of unassignedConversations) {
        const member = team.members[memberIndex % team.members.length];
        assignments.push({
            id: conv.id,
            assignedToId: member.userId
        });
        memberIndex++;
    }

    // Update all conversations
    await Promise.all(
        assignments.map(a =>
            prisma.conversation.update({
                where: { id: a.id },
                data: {
                    assignedToId: a.assignedToId,
                    assignedAt: new Date()
                }
            })
        )
    );

    // Update team's last assigned index
    await prisma.team.update({
        where: { id: team.id },
        data: { lastAssignedIndex: memberIndex % team.members.length }
    });

    return { success: true, assigned: assignments.length };
}

// Get team info
export async function getTeamInfo() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return null;
    }

    const userId = (session.user as any).id;
    
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true }
    });

    if (!user) return null;

    // Get team owned by this user (admin)
    let team = await prisma.team.findFirst({
        where: { ownerId: userId },
        include: {
            members: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true, facebookName: true, role: true }
                    }
                }
            }
        }
    });

    // If user is staff, find the team they belong to
    if (!team && user.role === 'staff') {
        const membership = await prisma.teamMember.findFirst({
            where: { userId },
            include: {
                team: {
                    include: {
                        members: {
                            include: {
                                user: {
                                    select: { id: true, name: true, email: true, facebookName: true, role: true }
                                }
                            }
                        }
                    }
                }
            }
        });
        team = membership?.team || null;
    }

    return {
        user,
        team,
        isAdmin: user.role === 'admin'
    };
}

// Sync Ad IDs for all conversations (Backfill)
export async function syncAllConversationAdIds() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Not authenticated");
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    // Only admin/host can run this
    if (user?.role !== 'admin' && user?.role !== 'host') {
        throw new Error("Unauthorized");
    }

    // Get user's Facebook token
    const accessToken = await getUserFacebookToken(userId);
    if (!accessToken) {
        throw new Error("No Facebook token found");
    }

    try {
        // Get all conversations that don't have an adId yet
        const conversations = await prisma.conversation.findMany({
            where: { adId: null },
            select: { id: true, pageId: true, facebookConversationId: true }
        });

        console.log(`[syncAllConversationAdIds] Found ${conversations.length} conversations to check`);

        let updatedCount = 0;
        
        // Process in batches to avoid rate limits
        const batchSize = 5;
        for (let i = 0; i < conversations.length; i += batchSize) {
            const batch = conversations.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (conv) => {
                try {
                    // Get page token if possible (better rate limits)
                    const page = await prisma.pageSettings.findUnique({
                        where: { pageId: conv.pageId },
                        select: { pageAccessToken: true }
                    });

                    const tags = await getConversationTags(
                        accessToken,
                        conv.facebookConversationId || conv.id,
                        conv.pageId,
                        page?.pageAccessToken || undefined
                    );

                    // Extract ad_id from tags array (format: "ad_id:12345" or "ad_id.12345")
                    const adIdTag = tags.find(t => t.match(/^ad_id[:.]\d+/));
                    if (adIdTag) {
                        const match = adIdTag.match(/^ad_id[:.](\d+)/);
                        if (match && match[1]) {
                            const adId = match[1];
                            await prisma.conversation.update({
                                where: { id: conv.id },
                                data: { adId }
                            });
                            updatedCount++;
                            console.log(`[syncAllConversationAdIds] Updated conversation ${conv.id} with adId ${adId}`);
                        }
                    }
                } catch (e) {
                    console.error(`[syncAllConversationAdIds] Error processing conv ${conv.id}:`, e);
                }
            }));
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return { success: true, updated: updatedCount, total: conversations.length };
    } catch (error) {
        console.error('[syncAllConversationAdIds] Error:', error);
        throw error;
    }
}
