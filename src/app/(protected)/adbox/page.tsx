'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
    Search, MessageCircle, RefreshCw, Loader2, Settings, Send, 
    ExternalLink, ChevronRight 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    fetchPages,
    fetchConversations,
    fetchMessages,
    sendReply,
    markConversationRead
} from '@/app/actions';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdBoxPage() {
    const { data: session } = useSession();
    const { t } = useLanguage();

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
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Filter State
    const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Load pages on mount
    useEffect(() => {
        loadPages();
    }, []);

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
            const convs = await fetchConversations(selectedPages);
            setConversations(convs);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoadingChat(false);
        }
    };

    const loadMessages = async (conv: any) => {
        try {
            setLoadingMessages(true);
            const page = pages.find(p => p.id === conv.pageId);
            const msgs = await fetchMessages(conv.id, conv.pageId, page?.access_token);
            setMessages(msgs.reverse()); // Oldest first
            
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
            // Scroll to bottom
            setTimeout(() => {
                scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedConversation) return;
        
        const participantId = selectedConversation.participants?.data?.[0]?.id;
        if (!participantId) return;

        try {
            setSending(true);
            const result = await sendReply(
                selectedConversation.pageId,
                participantId,
                replyText,
                selectedConversation.id
            );

            if (result.success) {
                // Add message to local state
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    message: replyText,
                    from: { id: selectedConversation.pageId, name: 'Me' },
                    created_time: new Date().toISOString()
                }]);
                setReplyText('');
                
                // Scroll to bottom
                setTimeout(() => {
                    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    const selectConversation = (conv: any) => {
        setSelectedConversation(conv);
        loadMessages(conv);
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

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;
        return date.toLocaleDateString();
    };

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
            <Card className="w-96 flex flex-col">
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
                <ScrollArea className="flex-1">
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
                                        className={`p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
                                            isSelected 
                                                ? 'bg-primary/10' 
                                                : 'hover:bg-muted'
                                        }`}
                                        onClick={() => selectConversation(conv)}
                                    >
                                        <div className="flex gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarFallback>
                                                    {(participant?.name || 'U')[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className={`font-medium truncate ${
                                                        conv.unread_count > 0 ? 'text-foreground' : 'text-muted-foreground'
                                                    }`}>
                                                        {participant?.name || 'Facebook User'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatTime(conv.updated_time)}
                                                    </span>
                                                </div>
                                                <p className={`text-sm truncate ${
                                                    conv.unread_count > 0 
                                                        ? 'text-foreground font-medium' 
                                                        : 'text-muted-foreground'
                                                }`}>
                                                    {conv.snippet || 'No message preview'}
                                                </p>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-xs text-muted-foreground truncate">
                                                        {getPageName(conv.pageId)}
                                                    </span>
                                                    {conv.unread_count > 0 && (
                                                        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
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
                </ScrollArea>
            </Card>

            {/* Chat Area */}
            <Card className="flex-1 flex flex-col">
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
                                </div>
                            </div>
                            {selectedConversation.facebookLink && (
                                <a
                                    href={selectedConversation.facebookLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Button variant="ghost" size="sm">
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Open in Facebook
                                    </Button>
                                </a>
                            )}
                        </div>

                        {/* Messages */}
                        <ScrollArea className="flex-1 p-4">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {messages.map(msg => {
                                        const isFromPage = msg.from?.id === selectedConversation.pageId;
                                        
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex ${isFromPage ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                                    isFromPage 
                                                        ? 'bg-primary text-primary-foreground' 
                                                        : 'bg-muted'
                                                }`}>
                                                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                                    <p className={`text-xs mt-1 ${
                                                        isFromPage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                                    }`}>
                                                        {new Date(msg.created_time).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={scrollRef} />
                                </div>
                            )}
                        </ScrollArea>

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

