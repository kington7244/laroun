'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
    Search, MessageCircle, RefreshCw, Loader2, Settings, Send, 
    ExternalLink, ChevronRight, X, Ban, Bookmark, Bell, BellOff,
    Image, FileText, Link2, Calendar, AlertCircle, User, Phone,
    Mail, MapPin, Tag, Clock, ShoppingBag, CreditCard, Hash, Eye, Users
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    fetchPages,
    fetchConversations,
    fetchConversationsFromDB,
    fetchMessages,
    sendReply,
    markConversationRead,
    getCurrentUser,
    assignConversation,
    autoAssignAllConversations,
    getTeamInfo
} from '@/app/actions';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

export default function AdBoxPage() {
    const { data: session } = useSession();
    const { t, formatMessageTime, formatConversationTime } = useLanguage();

    const [pages, setPages] = useState<any[]>([]);
    const [selectedPageIds, setSelectedPageIds] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('selectedPageIds');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });
    const [tempSelectedPageIds, setTempSelectedPageIds] = useState<string[]>([]);
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingChat, setLoadingChat] = useState(false);
    const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Message State
    const [messages, setMessages] = useState<any[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [allMessagesCache, setAllMessagesCache] = useState<any[]>([]);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Filter State
    const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Info Panel State - Conversation Info (toggle with user icon)
    const [showConversationInfo, setShowConversationInfo] = useState(false);

    // User and Team State
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [teamInfo, setTeamInfo] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // Notification settings
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [browserNotificationEnabled, setBrowserNotificationEnabled] = useState(true);
    const [inAppNotificationEnabled, setInAppNotificationEnabled] = useState(true);
    const lastConversationCountRef = useRef(0);
    const lastUnreadCountRef = useRef(0);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Load notification settings from API
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const data = await res.json();
                    setSoundEnabled(data.adboxSoundEnabled ?? true);
                    setBrowserNotificationEnabled(data.adboxBrowserNotification ?? true);
                    setInAppNotificationEnabled(data.adboxInAppNotification ?? true);
                }
            } catch (e) {
                console.error('Failed to load notification settings:', e);
            }
        };
        loadSettings();
    }, []);

    // Play notification sound (Ding-Dong)
    const playNotificationSound = () => {
        if (!soundEnabled) return;
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            const now = ctx.currentTime;
            
            // Ding (high note)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.frequency.value = 830;
            osc1.type = 'sine';
            gain1.gain.setValueAtTime(0.3, now);
            gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc1.start(now);
            osc1.stop(now + 0.3);
            
            // Dong (lower note)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.value = 622;
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.3, now + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc2.start(now + 0.15);
            osc2.stop(now + 0.5);
        } catch (e) {
            console.error('Error playing sound:', e);
        }
    };

    // Polling for real-time updates
    useEffect(() => {
        if (selectedPageIds.length === 0 || pages.length === 0) return;

        const pollInterval = setInterval(async () => {
            try {
                const cachedConvs = await fetchConversationsFromDB(selectedPageIds);
                
                // Check for new messages
                const currentUnreadCount = cachedConvs.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);
                const hasNewMessages = currentUnreadCount > lastUnreadCountRef.current || 
                    cachedConvs.length > lastConversationCountRef.current;
                
                if (hasNewMessages && lastUnreadCountRef.current > 0) {
                    // Find the new/updated conversation
                    const newConv = cachedConvs.find((c: any) => c.unread_count > 0);
                    const participantName = newConv?.participants?.data?.[0]?.name || 'New message';
                    const messageSnippet = newConv?.snippet || '';
                    
                    playNotificationSound();
                    
                    // Browser notification
                    if (browserNotificationEnabled && 'Notification' in window && Notification.permission === 'granted') {
                        new Notification(`💬 ${participantName}`, {
                            body: messageSnippet,
                            icon: '/logo.png'
                        });
                    }
                    
                    // In-app toast
                    if (inAppNotificationEnabled && newConv) {
                        toast.message(`💬 ${participantName}`, {
                            description: messageSnippet,
                            position: 'top-right',
                            duration: 5000,
                        });
                    }
                }

                lastConversationCountRef.current = cachedConvs.length;
                lastUnreadCountRef.current = currentUnreadCount;
                
                // Update conversations list
                if (cachedConvs.length > 0) {
                    setConversations(cachedConvs);
                }

                // Refresh current conversation messages if selected
                if (selectedConversation) {
                    const page = pages.find(p => p.id === selectedConversation.pageId);
                    const freshMsgs = await fetchMessages(selectedConversation.id, selectedConversation.pageId, page?.access_token, selectedConversation.facebookConversationId);
                    
                    // Sort messages oldest first
                    const sortedMsgs = freshMsgs.sort((a: any, b: any) => 
                        new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
                    );
                    
                    // Merge new messages instead of replacing - use functional update to get latest state
                    setMessages(prev => {
                        if (sortedMsgs.length === 0) return prev;
                        
                        // Create map of existing messages to preserve repliedByName
                        const existingMap = new Map(prev.map((m: any) => [m.id, m]));
                        
                        // Merge: keep repliedByName from existing messages or from fresh data
                        const mergedMsgs = sortedMsgs.map((freshMsg: any) => {
                            const existing = existingMap.get(freshMsg.id);
                            // Preserve repliedByName from existing or use from fresh
                            return {
                                ...freshMsg,
                                repliedByName: existing?.repliedByName || freshMsg.repliedByName
                            };
                        });
                        
                        // Also keep temp messages that haven't been replaced yet
                        const tempMsgs = prev.filter((m: any) => 
                            m.id.startsWith('temp_') && 
                            !sortedMsgs.some((sm: any) => sm.message === m.message)
                        );
                        
                        const allMsgs = [...mergedMsgs, ...tempMsgs];
                        const sorted = allMsgs.sort((a: any, b: any) => 
                            new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
                        );
                        
                        // Only scroll if there are new messages
                        const hasNewMsgs = sortedMsgs.some((sm: any) => !existingMap.has(sm.id));
                        if (hasNewMsgs) {
                            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                        }
                        
                        return sorted;
                    });
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [selectedPageIds, pages, selectedConversation, soundEnabled, browserNotificationEnabled, inAppNotificationEnabled]);

    // Request notification permission
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default' && browserNotificationEnabled) {
                Notification.requestPermission();
            }
        }
    }, [browserNotificationEnabled]);

    // Load pages on mount
    useEffect(() => {
        loadPages();
        loadUserAndTeam();
    }, []);

    const loadUserAndTeam = async () => {
        try {
            const [user, team] = await Promise.all([
                getCurrentUser(),
                getTeamInfo()
            ]);
            setCurrentUser(user);
            setTeamInfo(team);
            setIsAdmin(user?.role === 'admin');
        } catch (e) {
            console.error('Failed to load user/team:', e);
        }
    };

    // Save selectedPageIds to localStorage
    useEffect(() => {
        localStorage.setItem('selectedPageIds', JSON.stringify(selectedPageIds));
    }, [selectedPageIds]);

    // Load conversations when pages are selected
    useEffect(() => {
        if (selectedPageIds.length > 0 && pages.length > 0) {
            loadConversations();
        }
    }, [selectedPageIds, pages]);

    const loadPages = async () => {
        try {
            setLoading(true);
            const pagesData = await fetchPages();
            setPages(pagesData);
            
            // Auto-select all if none selected
            if (selectedPageIds.length === 0 && pagesData.length > 0) {
                setSelectedPageIds(pagesData.map((p: any) => p.id));
            }
        } catch (error: any) {
            console.error('Error loading pages:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadConversations = async () => {
        try {
            setLoadingChat(true);
            const selectedPages = pages.filter(p => selectedPageIds.includes(p.id));
            
            // First, try to load from cache (database) for instant display
            const cachedConvs = await fetchConversationsFromDB(selectedPageIds);
            if (cachedConvs.length > 0) {
                setConversations(cachedConvs);
                setLoadingChat(false);
                
                // Then sync from Facebook in background
                fetchConversations(selectedPages).then(freshConvs => {
                    if (freshConvs.length > 0) {
                        setConversations(freshConvs);
                    }
                }).catch(e => console.error('Background sync error:', e));
            } else {
                // No cache, load from Facebook directly
                const convs = await fetchConversations(selectedPages);
                setConversations(convs);
                setLoadingChat(false);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            setLoadingChat(false);
        }
    };

    const loadMessages = async (conv: any) => {
        try {
            setLoadingMessages(true);
            setHasMoreMessages(true);
            const page = pages.find(p => p.id === conv.pageId);
            const allMsgs = await fetchMessages(conv.id, conv.pageId, page?.access_token, conv.facebookConversationId);
            
            // Sort messages oldest first
            const sortedMsgs = allMsgs.sort((a: any, b: any) => 
                new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
            );
            
            // Cache all messages
            setAllMessagesCache(sortedMsgs);
            
            // Show only last 50 messages initially
            const recentMsgs = sortedMsgs.slice(-50);
            setMessages(recentMsgs);
            setHasMoreMessages(sortedMsgs.length > 50);
            
            // Mark as read
            await markConversationRead(conv.id);
            
            // Update local state
            setConversations(prev => prev.map(c => 
                c.id === conv.id ? { ...c, unread_count: 0 } : c
            ));
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setLoadingMessages(false);
            // Scroll to bottom immediately
            setTimeout(() => {
                scrollRef.current?.scrollIntoView({ behavior: 'auto' });
            }, 50);
        }
    };

    // Load older messages when scrolling to top
    const loadOlderMessages = () => {
        if (loadingOlderMessages || !hasMoreMessages || allMessagesCache.length === 0) return;
        
        setLoadingOlderMessages(true);
        
        // Get current scroll position
        const container = chatContainerRef.current;
        const oldScrollHeight = container?.scrollHeight || 0;
        
        // Find current oldest displayed message
        const currentOldestId = messages[0]?.id;
        const currentOldestIndex = allMessagesCache.findIndex((m: any) => m.id === currentOldestId);
        
        if (currentOldestIndex > 0) {
            // Get 30 more older messages
            const startIndex = Math.max(0, currentOldestIndex - 30);
            const olderMsgs = allMessagesCache.slice(startIndex, currentOldestIndex);
            
            setMessages(prev => [...olderMsgs, ...prev]);
            setHasMoreMessages(startIndex > 0);
            
            // Restore scroll position after render
            setTimeout(() => {
                if (container) {
                    const newScrollHeight = container.scrollHeight;
                    container.scrollTop = newScrollHeight - oldScrollHeight;
                }
                setLoadingOlderMessages(false);
            }, 50);
        } else {
            setHasMoreMessages(false);
            setLoadingOlderMessages(false);
        }
    };

    // Handle scroll to detect when user scrolls near top
    const handleChatScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        if (target.scrollTop < 100 && hasMoreMessages && !loadingOlderMessages) {
            loadOlderMessages();
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedConversation) return;
        
        const participantId = selectedConversation.participants?.data?.[0]?.id;
        if (!participantId) return;

        const messageToSend = replyText;
        const now = new Date().toISOString();
        const tempId = `temp_${Date.now()}`;

        try {
            setSending(true);
            setReplyText(''); // Clear immediately for better UX
            
            // Get current user's name for display
            const senderName = currentUser?.facebookName || currentUser?.name || currentUser?.email || session?.user?.name || 'Me';
            
            // Optimistic update - add message immediately with replier info
            setMessages(prev => [...prev, {
                id: tempId,
                message: messageToSend,
                from: { id: selectedConversation.pageId, name: 'Me' },
                created_time: now,
                isFromPage: true,
                repliedByName: senderName
            }]);
            
            // Scroll to bottom immediately
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
            
            const result = await sendReply(
                selectedConversation.pageId,
                participantId,
                messageToSend,
                selectedConversation.id
            );

            if (result.success) {
                // Update conversation's updated_time
                setConversations(prev => prev.map(c => 
                    c.id === selectedConversation.id 
                        ? { ...c, updated_time: now, snippet: messageToSend.substring(0, 50) } 
                        : c
                ));
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setReplyText(messageToSend); // Restore the message
        } finally {
            setSending(false);
        }
    };

    const selectConversation = (conv: any) => {
        // Clear messages immediately when switching conversations
        setMessages([]);
        setAllMessagesCache([]);
        setSelectedConversation(conv);
        loadMessages(conv);
    };

    // Handle assign conversation
    const handleAssignConversation = async (conversationId: string, assignToId: string | null) => {
        if (!isAdmin) return;
        
        try {
            await assignConversation(conversationId, assignToId);
            
            // Update local state
            setConversations(prev => prev.map(c => 
                c.id === conversationId 
                    ? { 
                        ...c, 
                        assignedTo: assignToId ? teamInfo?.team?.members?.find((m: any) => m.user.id === assignToId)?.user : null,
                        assignedAt: assignToId ? new Date().toISOString() : null
                    } 
                    : c
            ));
            
            if (selectedConversation?.id === conversationId) {
                setSelectedConversation((prev: any) => prev ? {
                    ...prev,
                    assignedTo: assignToId ? teamInfo?.team?.members?.find((m: any) => m.user.id === assignToId)?.user : null,
                    assignedAt: assignToId ? new Date().toISOString() : null
                } : null);
            }
            
            toast.success(assignToId ? 'มอบหมายแชทสำเร็จ' : 'ยกเลิกการมอบหมาย');
        } catch (error) {
            toast.error('ไม่สามารถมอบหมายแชทได้');
        }
    };

    // Handle auto-assign all
    const handleAutoAssignAll = async () => {
        if (!isAdmin) return;
        
        try {
            const result = await autoAssignAllConversations();
            toast.success(`แบ่งแชทสำเร็จ ${result.assigned} รายการ`);
            // Reload conversations
            loadConversations();
        } catch (error: any) {
            toast.error(error.message || 'ไม่สามารถแบ่งแชทได้');
        }
    };

    const filteredConversations = conversations.filter(conv => {
        // Filter by status
        if (filterStatus === 'unread' && conv.unread_count === 0) return false;
        if (filterStatus === 'read' && conv.unread_count > 0) return false;
        
        // Filter by search
        if (searchQuery) {
            const name = conv.participants?.data?.[0]?.name || '';
            const snippet = conv.snippet || '';
            const search = searchQuery.toLowerCase();
            if (!name.toLowerCase().includes(search) && !snippet.toLowerCase().includes(search)) {
                return false;
            }
        }
        
        return true;
    });

    const getPageName = (pageId: string) => {
        const page = pages.find(p => p.id === pageId);
        return page?.name || 'Unknown Page';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (pages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
                <MessageCircle className="h-16 w-16 text-muted-foreground" />
                <h2 className="text-xl font-semibold">No Facebook Pages Connected</h2>
                <p className="text-muted-foreground text-center max-w-md">
                    Connect your Facebook account to manage messages from your pages.
                </p>
                <Link href="/settings/connect">
                    <Button>
                        <Settings className="h-4 w-4 mr-2" />
                        Connect Facebook
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-120px)] gap-4">
            {/* Conversations List */}
            <Card className="w-80 flex flex-col overflow-hidden shrink-0">
                {/* Header */}
                <div className="p-4 border-b space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold">Messages</h2>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsDialogOpen(true)}
                                title="Select Pages"
                            >
                                <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={loadConversations}
                                disabled={loadingChat}
                                title="Refresh"
                            >
                                <RefreshCw className={`h-4 w-4 ${loadingChat ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>
                    
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search conversations..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-1">
                        {(['all', 'unread', 'read'] as const).map(status => (
                            <Button
                                key={status}
                                variant={filterStatus === status ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setFilterStatus(status)}
                                className="flex-1"
                            >
                                {status === 'all' ? 'All' : status === 'unread' ? 'Unread' : 'Read'}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Conversations */}
                <div className="flex-1 overflow-hidden min-h-0">
                    <div className="h-full overflow-y-auto">
                        {loadingChat ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                <MessageCircle className="h-8 w-8 mb-2" />
                                <p>No conversations found</p>
                            </div>
                        ) : (
                            <div className="p-2">
                                {filteredConversations.map(conv => {
                                    const participant = conv.participants?.data?.[0];
                                    const isSelected = selectedConversation?.id === conv.id;
                                    
                                    return (
                                        <div
                                            key={conv.id}
                                            className={`p-2 rounded-lg cursor-pointer transition-colors mb-1 ${
                                                isSelected 
                                                    ? 'bg-primary/10 ring-1 ring-primary/30' 
                                                    : 'hover:bg-muted'
                                            }`}
                                            onClick={() => selectConversation(conv)}
                                        >
                                            <div className="flex gap-2">
                                                <Avatar className="h-9 w-9 shrink-0">
                                                    <AvatarFallback className="text-sm">
                                                        {(participant?.name || 'U')[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <span className={`font-medium truncate text-sm flex-1 ${
                                                            conv.unread_count > 0 ? 'text-foreground' : 'text-muted-foreground'
                                                        }`}>
                                                            {participant?.name || 'Facebook User'}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground shrink-0">
                                                            {formatConversationTime(conv.updated_time)}
                                                        </span>
                                                    </div>
                                                    <p className={`text-xs truncate ${
                                                        conv.unread_count > 0 
                                                            ? 'text-foreground font-medium' 
                                                            : 'text-muted-foreground'
                                                    }`}>
                                                        {conv.snippet || 'No message preview'}
                                                    </p>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className="text-xs text-muted-foreground truncate flex-1">
                                                            {getPageName(conv.pageId)}
                                                        </span>
                                                        {conv.lastViewedBy && (
                                                            <div className="flex items-center gap-0.5 shrink-0" title={`ตอบโดย ${conv.lastViewedBy}`}>
                                                                <Avatar className="h-4 w-4">
                                                                    <AvatarFallback className="text-[8px] bg-blue-100 text-blue-600">
                                                                        {conv.lastViewedBy.charAt(0).toUpperCase()}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-xs text-blue-500 max-w-[60px] truncate">
                                                                    {conv.lastViewedBy.split(' ')[0]}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {conv.assignedTo && (
                                                            <span className="text-xs text-green-500 shrink-0" title={`มอบหมายให้: ${conv.assignedTo.name}`}>
                                                                📋 {conv.assignedTo.name?.split(' ')[0]}
                                                            </span>
                                                        )}
                                                        {conv.unread_count > 0 && (
                                                            <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full shrink-0">
                                                                {conv.unread_count}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Chat Area */}
            <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
                {selectedConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarFallback>
                                        {(selectedConversation.participants?.data?.[0]?.name || 'U')[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-semibold">
                                        {selectedConversation.participants?.data?.[0]?.name || 'Facebook User'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {getPageName(selectedConversation.pageId)}
                                    </p>
                                    {selectedConversation.lastViewedBy && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Eye className="h-3 w-3" />
                                            อ่านโดย {selectedConversation.lastViewedBy}
                                            {selectedConversation.lastViewedAt && (
                                                <span>• {formatConversationTime(new Date(selectedConversation.lastViewedAt))}</span>
                                            )}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant={showConversationInfo ? "secondary" : "ghost"}
                                    size="icon"
                                    onClick={() => setShowConversationInfo(!showConversationInfo)}
                                    title="ข้อมูลการสนทนา"
                                >
                                    <User className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-hidden min-h-0">
                            <div 
                                ref={chatContainerRef}
                                className="h-full overflow-y-auto p-4"
                                onScroll={handleChatScroll}
                            >
                                {loadingMessages ? (
                                    <div className="flex items-center justify-center h-32">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Load older messages indicator */}
                                        {loadingOlderMessages && (
                                            <div className="flex items-center justify-center py-2">
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                <span className="text-sm text-muted-foreground">กำลังโหลดข้อความเก่า...</span>
                                            </div>
                                        )}
                                        {hasMoreMessages && !loadingOlderMessages && messages.length > 0 && (
                                            <div className="flex items-center justify-center py-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={loadOlderMessages}
                                                    className="text-xs text-muted-foreground"
                                                >
                                                    ⬆️ โหลดข้อความเก่า
                                                </Button>
                                            </div>
                                        )}
                                        
                                        {messages.map(msg => {
                                            const isFromPage = msg.from?.id === selectedConversation.pageId || msg.isFromPage;
                                            const hasAttachments = msg.attachments?.data?.length > 0 || (Array.isArray(msg.attachments) && msg.attachments.length > 0);
                                            const hasSticker = msg.sticker?.url || msg.stickerUrl;
                                            const hasText = msg.message && msg.message.trim();
                                            const attachments = msg.attachments?.data || msg.attachments || [];
                                            
                                            // Get customer info for avatar
                                            const participant = selectedConversation.participants?.data?.[0];
                                            const customerName = participant?.name || 'Customer';
                                            const customerId = participant?.id;
                                            
                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`flex gap-2 ${isFromPage ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    {/* Customer Avatar */}
                                                    {!isFromPage && (
                                                        <div className="flex-shrink-0">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage 
                                                                    src={`https://graph.facebook.com/${customerId}/picture?type=small`} 
                                                                    alt={customerName}
                                                                />
                                                                <AvatarFallback className="text-xs">
                                                                    {customerName.charAt(0).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="max-w-[70%] space-y-1">
                                                        {/* Sticker */}
                                                        {hasSticker && (
                                                            <div className={`flex ${isFromPage ? 'justify-end' : 'justify-start'}`}>
                                                                <img 
                                                                    src={msg.sticker?.url || msg.stickerUrl} 
                                                                    alt="Sticker" 
                                                                    className="w-32 h-32 object-contain"
                                                                />
                                                            </div>
                                                        )}
                                                        
                                                        {/* Attachments */}
                                                        {hasAttachments && attachments.map((att: any, idx: number) => {
                                                            const imageUrl = att.image_data?.url || att.payload?.url || att.url;
                                                            const type = att.type || att.mime_type || 'file';
                                                            
                                                            if (type === 'image' || type?.startsWith('image/') || imageUrl?.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
                                                                return (
                                                                    <div key={idx} className={`flex ${isFromPage ? 'justify-end' : 'justify-start'}`}>
                                                                        <img 
                                                                            src={imageUrl}
                                                                            alt="Image"
                                                                            className="max-w-full rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90"
                                                                            onClick={() => window.open(imageUrl, '_blank')}
                                                                        />
                                                                    </div>
                                                                );
                                                            }
                                                            
                                                            if (type === 'video' || type?.startsWith('video/')) {
                                                                return (
                                                                    <div key={idx} className={`flex ${isFromPage ? 'justify-end' : 'justify-start'}`}>
                                                                        <video 
                                                                            src={imageUrl}
                                                                            controls
                                                                            className="max-w-full rounded-lg max-h-64"
                                                                        />
                                                                    </div>
                                                                );
                                                            }
                                                            
                                                            return (
                                                                <div key={idx} className={`flex ${isFromPage ? 'justify-end' : 'justify-start'}`}>
                                                                    <a 
                                                                        href={imageUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                                                                            isFromPage ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                                                        }`}
                                                                    >
                                                                        <FileText className="h-4 w-4" />
                                                                        <span className="text-sm">{att.name || 'File'}</span>
                                                                    </a>
                                                                </div>
                                                            );
                                                        })}
                                                        
                                                        {/* Text Message */}
                                                        {hasText && (
                                                            <div className={`flex ${isFromPage ? 'justify-end' : 'justify-start'}`}>
                                                                <div className={`rounded-2xl px-4 py-2 ${
                                                                    isFromPage 
                                                                        ? 'bg-primary text-primary-foreground' 
                                                                        : 'bg-muted'
                                                                }`}>
                                                                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Time and Replier with Avatar */}
                                                        <div className={`flex items-center gap-1.5 ${isFromPage ? 'justify-end' : 'justify-start'}`}>
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatMessageTime(msg.created_time)}
                                                            </span>
                                                            {isFromPage && msg.repliedByName && (
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-xs text-muted-foreground">•</span>
                                                                    <Avatar className="h-4 w-4">
                                                                        <AvatarFallback className="text-[8px] bg-blue-100 text-blue-600">
                                                                            {msg.repliedByName.charAt(0).toUpperCase()}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="text-xs text-blue-500 font-medium">
                                                                        {msg.repliedByName}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={scrollRef} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Reply Input */}
                        <div className="p-4 border-t">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Type a message..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendReply();
                                        }
                                    }}
                                    disabled={sending}
                                />
                                <Button 
                                    onClick={handleSendReply}
                                    disabled={sending || !replyText.trim()}
                                >
                                    {sending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                        <MessageCircle className="h-16 w-16 mb-4" />
                        <h3 className="text-lg font-medium">Select a conversation</h3>
                        <p className="text-sm">Choose a conversation from the list to start messaging</p>
                    </div>
                )}
            </Card>

            {/* Right Panel - Customer Info / Conversation Info */}
            {selectedConversation && (
                <Card className="w-72 flex flex-col overflow-hidden shrink-0">
                    <div className="h-full overflow-y-auto flex flex-col">
                        {/* Tab Headers */}
                        <div className="flex border-b">
                            <button 
                                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                                    !showConversationInfo 
                                        ? 'text-primary border-b-2 border-primary' 
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                onClick={() => setShowConversationInfo(false)}
                            >
                                ข้อมูลลูกค้า
                            </button>
                            <button 
                                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                                    showConversationInfo 
                                        ? 'text-primary border-b-2 border-primary' 
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                onClick={() => setShowConversationInfo(true)}
                            >
                                การสนทนา
                            </button>
                        </div>

                        {showConversationInfo ? (
                            <>
                                {/* Profile Summary */}
                                <div className="p-4 flex items-center gap-3 border-b">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback>
                                            {(selectedConversation.participants?.data?.[0]?.name || 'U')[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-sm truncate">
                                            {selectedConversation.participants?.data?.[0]?.name || 'Facebook User'}
                                        </h3>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {getPageName(selectedConversation.pageId)}
                                        </p>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="p-4">
                                    <div className="grid grid-cols-4 gap-2">
                                        {selectedConversation.facebookLink && (
                                            <a
                                                href={selectedConversation.facebookLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary p-2 rounded-lg hover:bg-muted"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                <span className="text-[10px]">Facebook</span>
                                            </a>
                                        )}
                                        <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary p-2 rounded-lg hover:bg-muted">
                                            <Ban className="h-4 w-4" />
                                            <span className="text-[10px]">บล็อก</span>
                                        </button>
                                        <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary p-2 rounded-lg hover:bg-muted">
                                            <Search className="h-4 w-4" />
                                            <span className="text-[10px]">ค้นหา</span>
                                        </button>
                                        <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary p-2 rounded-lg hover:bg-muted">
                                            <Bookmark className="h-4 w-4" />
                                            <span className="text-[10px]">ปักหมุด</span>
                                        </button>
                                    </div>
                                </div>

                                <Separator />

                                {/* Assignment Section - Admin Only */}
                                {isAdmin && teamInfo?.team?.members && (
                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium text-sm">มอบหมายให้</span>
                                        </div>
                                        <div className="space-y-2">
                                            {/* Current assignment */}
                                            {selectedConversation.assignedTo && (
                                                <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarFallback className="text-xs">
                                                                {(selectedConversation.assignedTo.name || 'U')[0]}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm">{selectedConversation.assignedTo.name}</span>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        onClick={() => handleAssignConversation(selectedConversation.id, null)}
                                                    >
                                                        ยกเลิก
                                                    </Button>
                                                </div>
                                            )}
                                            
                                            {/* Member list to assign */}
                                            {teamInfo.team.members
                                                .filter((m: any) => m.isActive && m.user.id !== selectedConversation.assignedTo?.id)
                                                .map((member: any) => (
                                                    <button
                                                        key={member.id}
                                                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-left"
                                                        onClick={() => handleAssignConversation(selectedConversation.id, member.user.id)}
                                                    >
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarFallback className="text-xs">
                                                                {(member.user.facebookName || member.user.name || member.user.email)[0].toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm">
                                                            {member.user.facebookName || member.user.name || member.user.email}
                                                        </span>
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}

                                <Separator />

                                {/* Options List */}
                                <div className="py-2">
                                    <button className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-muted text-left">
                                        <BellOff className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">ปิดการแจ้งเตือน</span>
                                    </button>
                                    <button className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-muted text-left">
                                        <Image className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">ไฟล์รูปภาพ/วิดีโอ</span>
                                    </button>
                                    <button className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-muted text-left">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">ไฟล์</span>
                                    </button>
                                    <button className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-muted text-left">
                                        <Link2 className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">ลิงก์</span>
                                    </button>
                                </div>

                                <Separator />

                                <div className="py-2">
                                    <button className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-muted text-left text-destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <span className="text-sm">รายงานว่าเป็นสแปม</span>
                                    </button>
                                </div>

                                {/* Viewed By Section */}
                                {selectedConversation.viewedBy && selectedConversation.viewedBy.length > 0 && (
                                    <>
                                        <Separator />
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium text-sm">ผู้ดูแลที่อ่านแชทนี้</span>
                                            </div>
                                            <div className="space-y-2">
                                                {selectedConversation.viewedBy.map((viewer: any, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                                                        <Avatar className="h-7 w-7">
                                                            <AvatarFallback className="text-xs">
                                                                {(viewer.name || viewer.email || 'U').charAt(0).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">
                                                                {viewer.name || viewer.email || 'Unknown'}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {viewer.viewedAt ? formatConversationTime(viewer.viewedAt) : '-'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Profile */}
                                <div className="p-4 flex flex-col items-center border-b">
                                    <Avatar className="h-16 w-16 mb-3">
                                        <AvatarFallback className="text-xl">
                                            {(selectedConversation.participants?.data?.[0]?.name || 'U')[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <h3 className="font-semibold text-center">
                                        {selectedConversation.participants?.data?.[0]?.name || 'Facebook User'}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {getPageName(selectedConversation.pageId)}
                                    </p>
                                </div>

                                {/* Customer Details */}
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">Facebook ID</p>
                                            <p className="text-sm truncate">{selectedConversation.participants?.data?.[0]?.id || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">เบอร์โทรศัพท์</p>
                                            <p className="text-sm">-</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">อีเมล</p>
                                            <p className="text-sm">-</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">ที่อยู่</p>
                                            <p className="text-sm">-</p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Tags */}
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Tag className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">แท็ก</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        <span className="text-xs text-muted-foreground">ยังไม่มีแท็ก</span>
                                    </div>
                                </div>

                                <Separator />

                                {/* Stats */}
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">สนทนาล่าสุด</p>
                                            <p className="text-sm">{selectedConversation.updated_time ? new Date(selectedConversation.updated_time).toLocaleDateString('th-TH') : '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <ShoppingBag className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">ออเดอร์</p>
                                            <p className="text-sm">0 รายการ</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">ยอดซื้อสะสม</p>
                                            <p className="text-sm">฿0</p>
                                        </div>
                                    </div>
                                </div>

                                {/* View on Facebook */}
                                {selectedConversation.facebookLink && (
                                    <>
                                        <Separator />
                                        <div className="p-4">
                                            <a
                                                href={selectedConversation.facebookLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg border hover:bg-muted transition-colors"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                <span className="text-sm">ดูโปรไฟล์บน Facebook</span>
                                            </a>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </Card>
            )}

            {/* Page Selection Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select Pages</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {pages.map(page => (
                            <div key={page.id} className="flex items-center space-x-3">
                                <Checkbox
                                    id={page.id}
                                    checked={tempSelectedPageIds.length > 0 
                                        ? tempSelectedPageIds.includes(page.id)
                                        : selectedPageIds.includes(page.id)
                                    }
                                    onCheckedChange={(checked) => {
                                        const ids = tempSelectedPageIds.length > 0 
                                            ? tempSelectedPageIds 
                                            : selectedPageIds;
                                        
                                        if (checked) {
                                            setTempSelectedPageIds([...ids, page.id]);
                                        } else {
                                            setTempSelectedPageIds(ids.filter(id => id !== page.id));
                                        }
                                    }}
                                />
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={page.picture?.data?.url} />
                                    <AvatarFallback>{page.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <label htmlFor={page.id} className="cursor-pointer">
                                    {page.name}
                                </label>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => {
                            if (tempSelectedPageIds.length > 0) {
                                setSelectedPageIds(tempSelectedPageIds);
                            }
                            setTempSelectedPageIds([]);
                            setIsDialogOpen(false);
                        }}>
                            Apply
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

