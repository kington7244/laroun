'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamForm } from '@/components/settings/TeamForm';
import { Users } from 'lucide-react';

export default function TeamPage() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        จัดการทีม
                    </CardTitle>
                    <CardDescription>
                        เพิ่มสมาชิกและแบ่งแชทลูกค้าให้แต่ละคนดูแล
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TeamForm />
                </CardContent>
            </Card>
        </div>
    );
}
