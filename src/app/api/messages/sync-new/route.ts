import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¸ˆà¸²à¸ polling Facebook API à¹€à¸›à¹‡à¸™à¸”à¸¶à¸‡à¸ˆà¸²à¸ Database à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™
// Webhook à¸ˆà¸°à¹€à¸›à¹‡à¸™à¸„à¸™à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¹ƒà¸«à¸¡à¹ˆà¸¥à¸‡ DB à¹à¸¥à¹‰à¸§
// à¸¥à¸” API calls à¸ˆà¸²à¸ 100+ à¸•à¹ˆà¸­à¸§à¸±à¸™ à¹€à¸«à¸¥à¸·à¸­ 0!

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const pageIds = searchParams.get('pageIds')?.split(',').filter(Boolean) || [];
    const since = searchParams.get('since'); // ISO timestamp

    if (pageIds.length === 0) {
        return NextResponse.json({ newMessages: [], synced: false });
    }

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ newMessages: [], synced: false, reason: 'not_authenticated' });
        }

        // à¸”à¸¶à¸‡à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¹ƒà¸«à¸¡à¹ˆà¸ˆà¸²à¸ Database (à¸—à¸µà¹ˆ Webhook à¸šà¸±à¸™à¸—à¸¶à¸à¹„à¸§à¹‰)
        const sinceDate = since ? new Date(since) : new Date(Date.now() - 60000); // Default: last 1 minute

        const newMessages = await db.findNewMessagesForPages(pageIds, sinceDate);

        // Get updated conversations (based on lastMessageAt - à¹€à¸§à¸¥à¸²à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¸¥à¹ˆà¸²à¸ªà¸¸à¸”)
        const updatedConversations = await db.findUpdatedConversations(pageIds, sinceDate);

        return NextResponse.json({
            newMessages: newMessages.map((m: any) => ({
                id: m.id,
                conversationId: m.conversationId,
                senderId: m.senderId,
                senderName: m.senderName,
                content: m.content,
                createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
                pageId: m.conversation?.pageId || m.pageId
            })),
            updatedConversations: updatedConversations.map((c: any) => ({
                id: c.id,
                pageId: c.pageId,
                snippet: c.snippet,
                unread_count: c.unreadCount,
                updated_time: c.lastMessageAt instanceof Date ? c.lastMessageAt.toISOString() : (c.lastMessageAt || new Date().toISOString()),
                adId: c.adId || null,
                facebookLink: c.facebookLink || null,
                participants: {
                    data: [{ id: c.participantId, name: c.participantName }]
                }
            })),
            synced: true,
            source: 'database' // à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¹€à¸£à¸µà¸¢à¸ Facebook API!
        });
    } catch (error) {
        console.error('[sync-new] Error:', error);
        return NextResponse.json({ newMessages: [], synced: false, error: 'internal_error' });
    }
}

