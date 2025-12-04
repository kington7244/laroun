'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
    Users, UserPlus, Trash2, Loader2, RefreshCw, 
    Shield, User, ToggleLeft, ToggleRight, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
    id: string;
    isActive: boolean;
    user: {
        id: string;
        name: string | null;
        email: string;
        facebookName: string | null;
        role: string;
    };
}

interface Team {
    id: string;
    name: string;
    autoAssignEnabled: boolean;
    members: TeamMember[];
}

export default function TeamPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [team, setTeam] = useState<Team | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [autoAssigning, setAutoAssigning] = useState(false);

    useEffect(() => {
        loadTeam();
    }, []);

    const loadTeam = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/team');
            const data = await res.json();
            
            setTeam(data.team);
            setIsAdmin(data.isAdmin);
        } catch (error) {
            console.error('Error loading team:', error);
            toast.error('ไม่สามารถโหลดข้อมูลทีมได้');
        } finally {
            setLoading(false);
        }
    };

    const createTeam = async () => {
        try {
            setSaving(true);
            const res = await fetch('/api/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'createTeam', teamName: 'My Team' })
            });
            
            if (res.ok) {
                toast.success('สร้างทีมสำเร็จ');
                loadTeam();
            }
        } catch (error) {
            toast.error('ไม่สามารถสร้างทีมได้');
        } finally {
            setSaving(false);
        }
    };

    const addMember = async () => {
        if (!newMemberEmail.trim()) {
            toast.error('กรุณากรอกอีเมล');
            return;
        }

        try {
            setSaving(true);
            const res = await fetch('/api/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'addMember', memberEmail: newMemberEmail.trim() })
            });
            
            if (res.ok) {
                toast.success('เพิ่มสมาชิกสำเร็จ');
                setNewMemberEmail('');
                loadTeam();
            } else {
                const data = await res.json();
                toast.error(data.error || 'ไม่สามารถเพิ่มสมาชิกได้');
            }
        } catch (error) {
            toast.error('ไม่สามารถเพิ่มสมาชิกได้');
        } finally {
            setSaving(false);
        }
    };

    const removeMember = async (memberId: string) => {
        if (!confirm('ต้องการลบสมาชิกคนนี้?')) return;

        try {
            setSaving(true);
            const res = await fetch('/api/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'removeMember', memberId })
            });
            
            if (res.ok) {
                toast.success('ลบสมาชิกสำเร็จ');
                loadTeam();
            }
        } catch (error) {
            toast.error('ไม่สามารถลบสมาชิกได้');
        } finally {
            setSaving(false);
        }
    };

    const toggleMemberActive = async (memberId: string, isActive: boolean) => {
        try {
            const res = await fetch('/api/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggleMemberActive', memberId, isActive })
            });
            
            if (res.ok) {
                toast.success(isActive ? 'เปิดใช้งานสมาชิก' : 'ปิดใช้งานสมาชิก');
                loadTeam();
            }
        } catch (error) {
            toast.error('ไม่สามารถเปลี่ยนสถานะได้');
        }
    };

    const toggleAutoAssign = async (enabled: boolean) => {
        try {
            const res = await fetch('/api/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggleAutoAssign', autoAssignEnabled: enabled })
            });
            
            if (res.ok) {
                toast.success(enabled ? 'เปิดการแบ่งแชทอัตโนมัติ' : 'ปิดการแบ่งแชทอัตโนมัติ');
                loadTeam();
            }
        } catch (error) {
            toast.error('ไม่สามารถเปลี่ยนการตั้งค่าได้');
        }
    };

    const autoAssignAll = async () => {
        try {
            setAutoAssigning(true);
            const res = await fetch('/api/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'autoAssignAll' })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                toast.success(`แบ่งแชทสำเร็จ ${data.assigned} รายการ`);
            } else {
                toast.error(data.error || 'ไม่สามารถแบ่งแชทได้');
            }
        } catch (error) {
            toast.error('ไม่สามารถแบ่งแชทได้');
        } finally {
            setAutoAssigning(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                        ไม่มีสิทธิ์เข้าถึง
                    </CardTitle>
                    <CardDescription>
                        เฉพาะ Admin เท่านั้นที่สามารถจัดการทีมได้
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        จัดการทีม
                    </CardTitle>
                    <CardDescription>
                        เพิ่มพนักงานและแบ่งแชทลูกค้าให้แต่ละคนดูแล
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {!team ? (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground mb-4">ยังไม่มีทีม</p>
                            <Button onClick={createTeam} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                                สร้างทีม
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Auto-assign Settings */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    {team.autoAssignEnabled ? (
                                        <ToggleRight className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                                    )}
                                    <div>
                                        <p className="font-medium">แบ่งแชทอัตโนมัติ</p>
                                        <p className="text-sm text-muted-foreground">
                                            แบ่งแชทใหม่ให้พนักงานอัตโนมัติแบบ Round-Robin
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    checked={team.autoAssignEnabled}
                                    onCheckedChange={toggleAutoAssign}
                                />
                            </div>

                            {/* Manual assign all button */}
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    onClick={autoAssignAll}
                                    disabled={autoAssigning || team.members.length === 0}
                                >
                                    {autoAssigning ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                    )}
                                    แบ่งแชทที่ยังไม่ได้มอบหมาย
                                </Button>
                            </div>

                            <Separator />

                            {/* Add Member */}
                            <div className="space-y-2">
                                <Label>เพิ่มพนักงาน</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="email"
                                        placeholder="อีเมลพนักงาน"
                                        value={newMemberEmail}
                                        onChange={(e) => setNewMemberEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addMember()}
                                    />
                                    <Button onClick={addMember} disabled={saving}>
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    ถ้าอีเมลนี้ยังไม่มีในระบบ จะสร้างบัญชีใหม่ให้อัตโนมัติ
                                </p>
                            </div>

                            <Separator />

                            {/* Members List */}
                            <div className="space-y-2">
                                <Label>สมาชิกในทีม ({team.members.length} คน)</Label>
                                
                                {team.members.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-4 text-center">
                                        ยังไม่มีสมาชิก เพิ่มพนักงานด้านบน
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {team.members.map((member) => (
                                            <div
                                                key={member.id}
                                                className={`flex items-center justify-between p-3 border rounded-lg ${
                                                    !member.isActive ? 'opacity-50 bg-muted' : ''
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarFallback>
                                                            {(member.user.facebookName || member.user.name || member.user.email)[0].toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">
                                                                {member.user.facebookName || member.user.name || member.user.email}
                                                            </span>
                                                            {member.user.role === 'admin' ? (
                                                                <Badge variant="default" className="text-xs">
                                                                    <Shield className="h-3 w-3 mr-1" />
                                                                    Admin
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    <User className="h-3 w-3 mr-1" />
                                                                    Staff
                                                                </Badge>
                                                            )}
                                                            {!member.isActive && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    ปิดใช้งาน
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {member.user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={member.isActive}
                                                        onCheckedChange={(checked) => toggleMemberActive(member.user.id, checked)}
                                                        title={member.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => removeMember(member.user.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
