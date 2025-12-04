'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Get user's team and members
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const userId = (session.user as any).id;

        // Get user with role
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, name: true, email: true, facebookName: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get team owned by this user (admin) or team the user is member of
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

        return NextResponse.json({
            user,
            team,
            isAdmin: user.role === 'admin'
        });
    } catch (error: any) {
        console.error('Error fetching team:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Create team or add member
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const body = await req.json();
        const { action, teamName, memberEmail, memberId, autoAssignEnabled } = body;

        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (user?.role !== 'admin') {
            return NextResponse.json({ error: 'Only admins can manage teams' }, { status: 403 });
        }

        if (action === 'createTeam') {
            // Create new team
            const team = await prisma.team.create({
                data: {
                    name: teamName || 'My Team',
                    ownerId: userId,
                    autoAssignEnabled: false
                }
            });
            return NextResponse.json({ success: true, team });
        }

        if (action === 'addMember') {
            // Find or create user by email
            let memberUser = await prisma.user.findUnique({
                where: { email: memberEmail }
            });

            if (!memberUser) {
                // Create new staff user
                memberUser = await prisma.user.create({
                    data: {
                        email: memberEmail,
                        name: memberEmail.split('@')[0],
                        role: 'staff'
                    }
                });
            } else {
                // Update role to staff if not admin
                if (memberUser.role !== 'admin') {
                    await prisma.user.update({
                        where: { id: memberUser.id },
                        data: { role: 'staff' }
                    });
                }
            }

            // Get admin's team
            let team = await prisma.team.findFirst({
                where: { ownerId: userId }
            });

            if (!team) {
                team = await prisma.team.create({
                    data: {
                        name: 'My Team',
                        ownerId: userId,
                        autoAssignEnabled: false
                    }
                });
            }

            // Add member to team
            const member = await prisma.teamMember.upsert({
                where: {
                    teamId_userId: {
                        teamId: team.id,
                        userId: memberUser.id
                    }
                },
                create: {
                    teamId: team.id,
                    userId: memberUser.id,
                    isActive: true
                },
                update: {
                    isActive: true
                }
            });

            return NextResponse.json({ success: true, member });
        }

        if (action === 'removeMember') {
            await prisma.teamMember.deleteMany({
                where: {
                    userId: memberId,
                    team: { ownerId: userId }
                }
            });

            // Unassign conversations from this member
            await prisma.conversation.updateMany({
                where: { assignedToId: memberId },
                data: { assignedToId: null, assignedAt: null }
            });

            return NextResponse.json({ success: true });
        }

        if (action === 'toggleAutoAssign') {
            const team = await prisma.team.findFirst({
                where: { ownerId: userId }
            });

            if (team) {
                await prisma.team.update({
                    where: { id: team.id },
                    data: { autoAssignEnabled: autoAssignEnabled }
                });
            }

            return NextResponse.json({ success: true });
        }

        if (action === 'toggleMemberActive') {
            await prisma.teamMember.updateMany({
                where: {
                    userId: memberId,
                    team: { ownerId: userId }
                },
                data: { isActive: body.isActive }
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Error managing team:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
