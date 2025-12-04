'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST - Assign conversation to staff
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const body = await req.json();
        const { action, conversationId, assignToId } = body;

        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (user?.role !== 'admin') {
            return NextResponse.json({ error: 'Only admins can assign conversations' }, { status: 403 });
        }

        if (action === 'assign') {
            // Assign conversation to specific staff
            await prisma.conversation.update({
                where: { id: conversationId },
                data: {
                    assignedToId: assignToId,
                    assignedAt: new Date()
                }
            });

            return NextResponse.json({ success: true });
        }

        if (action === 'unassign') {
            // Remove assignment
            await prisma.conversation.update({
                where: { id: conversationId },
                data: {
                    assignedToId: null,
                    assignedAt: null
                }
            });

            return NextResponse.json({ success: true });
        }

        if (action === 'autoAssignAll') {
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
                return NextResponse.json({ error: 'No active team members' }, { status: 400 });
            }

            // Get all unassigned conversations
            const unassignedConversations = await prisma.conversation.findMany({
                where: { assignedToId: null },
                orderBy: { updatedTime: 'desc' }
            });

            if (unassignedConversations.length === 0) {
                return NextResponse.json({ success: true, assigned: 0 });
            }

            // Round-robin assignment
            let memberIndex = team.lastAssignedIndex || 0;
            const assignments = [];

            for (const conv of unassignedConversations) {
                const member = team.members[memberIndex % team.members.length];
                assignments.push({
                    id: conv.id,
                    assignedToId: member.userId,
                    assignedAt: new Date()
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
                            assignedAt: a.assignedAt
                        }
                    })
                )
            );

            // Update team's last assigned index
            await prisma.team.update({
                where: { id: team.id },
                data: { lastAssignedIndex: memberIndex % team.members.length }
            });

            return NextResponse.json({ success: true, assigned: assignments.length });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Error assigning conversation:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Auto-assign new conversation (called when new conversation comes in)
export async function autoAssignConversation(conversationId: string, ownerId: string) {
    try {
        // Get team with auto-assign enabled
        const team = await prisma.team.findFirst({
            where: { 
                ownerId,
                autoAssignEnabled: true
            },
            include: {
                members: {
                    where: { isActive: true },
                    include: { user: true }
                }
            }
        });

        if (!team || team.members.length === 0) {
            return null; // No team or no active members
        }

        // Get next member in rotation
        const memberIndex = team.lastAssignedIndex % team.members.length;
        const member = team.members[memberIndex];

        // Assign conversation
        await prisma.conversation.update({
            where: { id: conversationId },
            data: {
                assignedToId: member.userId,
                assignedAt: new Date()
            }
        });

        // Update rotation index
        await prisma.team.update({
            where: { id: team.id },
            data: { lastAssignedIndex: (memberIndex + 1) % team.members.length }
        });

        return member.userId;
    } catch (error) {
        console.error('Error auto-assigning conversation:', error);
        return null;
    }
}
