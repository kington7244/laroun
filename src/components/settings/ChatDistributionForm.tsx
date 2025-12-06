'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Loader2, RefreshCw,
    AlertCircle, ToggleLeft, ToggleRight, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from "@/contexts/LanguageContext"

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

interface CurrentUser {
    id: string;
    role: string;
    name: string | null;
    email: string;
}

export function ChatDistributionForm() {
    const { t } = useLanguage()
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [team, setTeam] = useState<Team | null>(null);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [canManage, setCanManage] = useState(false);
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
            setCurrentUser(data.user);
            setCanManage(data.canManage);
        } catch (error) {
            console.error('Error loading team:', error);
            toast.error(t.settings.team.toast.distributionLoadError);
        } finally {
            setLoading(false);
        }
    };

    const toggleAutoAssign = async (enabled: boolean) => {
        if (!team) return;

        try {
            setSaving(true);
            const res = await fetch('/api/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggleAutoAssign', autoAssignEnabled: enabled })
            });

            if (res.ok) {
                toast.success(enabled ? t.settings.team.toast.autoAssignOn : t.settings.team.toast.autoAssignOff);
                loadTeam();
            }
        } catch (error) {
            toast.error(t.settings.team.toast.settingError);
        } finally {
            setSaving(false);
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
                toast.success(`${t.settings.team.toast.assignSuccess} (${data.assigned})`);
            } else {
                toast.error(data.error || t.settings.team.toast.assignError);
            }
        } catch (error) {
            toast.error(t.settings.team.toast.assignError);
        } finally {
            setAutoAssigning(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (!canManage) {
        return (
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                    <p className="font-medium">{t.settings.team.distribution.noAccess}</p>
                    <p className="text-sm text-muted-foreground">
                        {t.settings.team.distribution.noAccessDesc}
                    </p>
                </div>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t.settings.team.distribution.noTeam}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Auto-assign Settings */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                    {team.autoAssignEnabled ? (
                        <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                        <p className="font-medium">{t.settings.team.distribution.autoAssign}</p>
                        <p className="text-sm text-muted-foreground">
                            {t.settings.team.distribution.autoAssignDesc}
                        </p>
                    </div>
                </div>
                <Switch
                    checked={team.autoAssignEnabled}
                    onCheckedChange={toggleAutoAssign}
                    disabled={saving}
                />
            </div>

            {/* Manual assign all button */}
            <Button
                variant="outline"
                onClick={autoAssignAll}
                disabled={autoAssigning || team.members.length === 0}
                className="w-full"
            >
                {autoAssigning ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {t.settings.team.distribution.assignUnassigned}
            </Button>

            <Separator />

            {/* Team Members for Distribution */}
            <div className="space-y-2">
                <Label>{t.settings.team.distribution.assignableMembers} ({team.members.filter(m => m.isActive).length})</Label>

                {team.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                        {t.settings.team.distribution.noMembers}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {team.members.map((member) => (
                            <div
                                key={member.id}
                                className={`flex items-center gap-3 p-3 border rounded-lg ${!member.isActive ? 'opacity-50 bg-muted' : ''
                                    }`}
                            >
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback>
                                        {(member.user.facebookName || member.user.name || member.user.email)[0].toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                            {member.user.facebookName || member.user.name || member.user.email}
                                        </span>
                                        <Badge variant="secondary" className="text-xs">
                                            {member.user.role === 'admin' ? t.settings.team.manage.roles.admin : t.settings.team.manage.roles.staff}
                                        </Badge>
                                        {!member.isActive && (
                                            <Badge variant="outline" className="text-xs">
                                                {t.settings.team.manage.inactive}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {member.user.email}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    {member.isActive ? (
                                        <Badge className="bg-green-500">{t.settings.team.distribution.readyForChat}</Badge>
                                    ) : (
                                        <Badge variant="secondary">{t.settings.team.distribution.notReady}</Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
