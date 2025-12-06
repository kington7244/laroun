'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamForm } from './TeamForm';
import { ChatDistributionForm } from './ChatDistributionForm';
import { useLanguage } from "@/contexts/LanguageContext"

export function TeamTabs() {
    const { t } = useLanguage()
    const [activeTab, setActiveTab] = useState('manage');

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manage">{t.settings.team.tabs.manage}</TabsTrigger>
                <TabsTrigger value="distribution">{t.settings.team.tabs.distribution}</TabsTrigger>
            </TabsList>

            <TabsContent value="manage" className="space-y-4">
                <TeamForm />
            </TabsContent>

            <TabsContent value="distribution" className="space-y-4">
                <ChatDistributionForm />
            </TabsContent>
        </Tabs>
    );
}
