import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// API to check for new messages (for polling)
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const pageIds = searchParams.get('pageIds')?.split(',') || [];
        const since = searchParams.get('since'); // ISO timestamp

        if (pageIds.length === 0) {
            return NextResponse.json({ conversations: [], newCount: 0 });
        }

        const whereClause: any = {
            pageId: { in: pageIds }
        };

        // If since timestamp provided, only get newer conversations
        if (since) {
            whereClause.updatedAt = {
                gt: new Date(since)
            };
        }

        const conversations = await prisma.conversation.findMany({
            where: whereClause,
            orderBy: { updatedTime: 'desc' },
            include: {
                messages: {
                    orderBy: { createdTime: 'desc' },
                    take: 1
                }
            }
        });

        // Count total unread
        const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

        // Transform data for frontend
        const formattedConversations = conversations.map(conv => ({
            id: conv.id,
            pageId: conv.pageId,
            participant_id: conv.participantId,
            participant_name: conv.participantName,
            snippet: conv.snippet,
            updated_time: conv.updatedTime?.toISOString(),
            unread_count: conv.unreadCount,
            last_message: conv.messages[0] ? {
                text: conv.messages[0].text,
                created_time: conv.messages[0].createdTime.toISOString(),
                is_from_page: conv.messages[0].isFromPage
            } : null
        }));

        return NextResponse.json({
            conversations: formattedConversations,
            newCount: conversations.length,
            totalUnread
        });

    } catch (error) {
        console.error('Error checking new messages:', error);
        return NextResponse.json({ error: 'Failed to check messages' }, { status: 500 });
    }
}
