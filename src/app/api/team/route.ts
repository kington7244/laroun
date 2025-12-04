'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Helper: Check if user can manage team (host or admin)
function canManageTeam(role: string): boolean {
    return role === 'host' || role === 'admin';
}

// Helper: Check if user is host
function isHost(role: string): boolean {
    return role === 'host';
}

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

        console.log('[API/team] User:', user?.email, 'Role:', user?.role, 'canManage:', user ? canManageTeam(user.role) : false);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get team owned by this user (host/admin) or team the user is member of
        let team = await prisma.team.findFirst({
            where: { ownerId: userId },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, facebookName: true, role: true }
                        }
                    }
                },
                owner: {
                    select: { id: true, name: true, email: true, role: true }
                }
            }
        });

        // If user is staff or admin without team, find the team they belong to
        if (!team && (user.role === 'staff' || user.role === 'admin')) {
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
                            },
                            owner: {
                                select: { id: true, name: true, email: true, role: true }
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
            isHost: user.role === 'host',
            isAdmin: user.role === 'admin',
            canManage: canManageTeam(user.role)
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
        const { action, teamName, memberEmail, memberId, memberRole, autoAssignEnabled } = body;

        // Check if user can manage
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (!user || !canManageTeam(user.role)) {
            return NextResponse.json({ error: 'ไม่มีสิทธิ์จัดการทีม' }, { status: 403 });
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

            // Determine role for new member (default to staff, admin can add admins, only host can add admins)
            let newMemberRole = memberRole || 'staff';
            
            // Only host can create admins
            if (newMemberRole === 'admin' && user.role !== 'host') {
                newMemberRole = 'staff';
            }
            
            // Cannot create host
            if (newMemberRole === 'host') {
                newMemberRole = 'staff';
            }

            if (!memberUser) {
                // Create new user
                memberUser = await prisma.user.create({
                    data: {
                        email: memberEmail,
                        name: memberEmail.split('@')[0],
                        role: newMemberRole
                    }
                });
            } else {
                // Update role only if current user has permission
                // Host can change any role, admin cannot change host
                if (memberUser.role !== 'host') {
                    if (user.role === 'host' || (user.role === 'admin' && memberUser.role !== 'admin')) {
                        await prisma.user.update({
                            where: { id: memberUser.id },
                            data: { role: newMemberRole }
                        });
                    }
                }
            }

            // Get user's team
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

        if (action === 'updateMemberRole') {
            // Get target member
            const targetUser = await prisma.user.findUnique({
                where: { id: memberId },
                select: { role: true }
            });

            if (!targetUser) {
                return NextResponse.json({ error: 'Member not found' }, { status: 404 });
            }

            // Cannot change host role
            if (targetUser.role === 'host') {
                return NextResponse.json({ error: 'ไม่สามารถเปลี่ยน role ของ Host ได้' }, { status: 403 });
            }

            // Only host can set admin role
            let newRole = memberRole;
            if (newRole === 'admin' && user.role !== 'host') {
                return NextResponse.json({ error: 'เฉพาะ Host เท่านั้นที่สามารถตั้ง Admin ได้' }, { status: 403 });
            }

            // Cannot set host role
            if (newRole === 'host') {
                return NextResponse.json({ error: 'ไม่สามารถตั้ง role เป็น Host ได้' }, { status: 403 });
            }

            await prisma.user.update({
                where: { id: memberId },
                data: { role: newRole }
            });

            return NextResponse.json({ success: true });
        }

        if (action === 'removeMember') {
            // Get target member
            const targetUser = await prisma.user.findUnique({
                where: { id: memberId },
                select: { role: true }
            });

            // Cannot remove host
            if (targetUser?.role === 'host') {
                return NextResponse.json({ error: 'ไม่สามารถลบ Host ได้' }, { status: 403 });
            }

            // Admin can only remove staff, host can remove anyone
            if (user.role === 'admin' && targetUser?.role === 'admin') {
                return NextResponse.json({ error: 'Admin ไม่สามารถลบ Admin อื่นได้' }, { status: 403 });
            }

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
