import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Poll database for new messages (Webhook saves them)
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

        const sinceDate = since ? new Date(since) : new Date(Date.now() - 60000); // Default: last 1 minute

        // Find new messages from database
        const newMessages = await prisma.message.findMany({
            where: {
                conversation: {
                    pageId: { in: pageIds }
                },
                createdTime: { gte: sinceDate }
            },
            include: {
                conversation: true
            },
            orderBy: { createdTime: 'desc' },
            take: 50
        });

        // Get updated conversations
        const updatedConversations = await prisma.conversation.findMany({
            where: {
                pageId: { in: pageIds },
                updatedTime: { gte: sinceDate }
            },
            orderBy: { updatedTime: 'desc' },
            take: 50
        });

        return NextResponse.json({
            newMessages: newMessages.map((m: any) => ({
                id: m.id,
                conversationId: m.conversationId,
                senderId: m.from,
                content: m.text,
                createdAt: m.createdTime instanceof Date ? m.createdTime.toISOString() : m.createdTime,
                pageId: m.conversation?.pageId
            })),
            updatedConversations: updatedConversations.map((c: any) => ({
                id: c.id,
                pageId: c.pageId,
                snippet: c.snippet,
                unread_count: c.unreadCount,
                updated_time: c.updatedTime instanceof Date ? c.updatedTime.toISOString() : c.updatedTime,
                adId: c.adId || null,
                facebookLink: c.facebookLink || null,
                participants: {
                    data: [{ id: c.participantId, name: c.participantName }]
                }
            })),
            synced: true,
            source: 'database'
        });
    } catch (error) {
        console.error('Error syncing messages:', error);
        return NextResponse.json({ newMessages: [], synced: false, error: 'Failed to sync' });
    }
}

