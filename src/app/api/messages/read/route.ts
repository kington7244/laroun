import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Mark conversation as read (reset unread count)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { conversationId } = await req.json();

        if (!conversationId) {
            return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
        }

        // Update unread count to 0
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { unreadCount: 0 }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error marking as read:', error);
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
    }
}

