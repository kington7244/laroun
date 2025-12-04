'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export const events = { NEW_MESSAGE: 'new_message', CONVERSATION_UPDATE: 'conversation_update', TYPING_START: 'typing_start', TYPING_STOP: 'typing_stop' };

interface UseSocketOptions { userId?: string; pageIds?: string[]; conversationId?: string; onNewMessage?: (data: any) => void; onConversationUpdate?: (data: any) => void; onTypingStart?: (data: any) => void; onTypingStop?: (data: any) => void; }

export function useSocket(options: UseSocketOptions) {
  const { userId, pageIds, conversationId, onNewMessage, onConversationUpdate, onTypingStart, onTypingStop } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
    try {
      socketRef.current = io(socketUrl, { transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: 5, timeout: 10000 });
      const socket = socketRef.current;
      socket.on('connect', () => { setIsConnected(true); setError(null); reconnectAttempts.current = 0;
        if (userId) socket.emit('join_user', userId);
        if (pageIds?.length) socket.emit('join_pages', pageIds);
        if (conversationId) socket.emit('join_conversation', conversationId);
      });
      socket.on('disconnect', () => { setIsConnected(false); });
      socket.on('connect_error', () => { reconnectAttempts.current++; if (reconnectAttempts.current >= 5) setError('Cannot connect'); });
      socket.on(events.NEW_MESSAGE, (data) => { onNewMessage?.(data); });
      socket.on(events.CONVERSATION_UPDATE, (data) => { onConversationUpdate?.(data); });
      socket.on(events.TYPING_START, (data) => { onTypingStart?.(data); });
      socket.on(events.TYPING_STOP, (data) => { onTypingStop?.(data); });
    } catch (err) { setError('Failed to init'); }
    return () => { if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; } };
  }, [userId]);

  useEffect(() => { if (socketRef.current?.connected && pageIds?.length) socketRef.current.emit('join_pages', pageIds); }, [pageIds]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    if (conversationId) socket.emit('join_conversation', conversationId);
    return () => { if (conversationId) socket.emit('leave_conversation', conversationId); };
  }, [conversationId]);

  const sendTypingStart = useCallback((convId: string, userName: string) => { if (socketRef.current?.connected && userId) socketRef.current.emit('typing_start', { conversationId: convId, userId, userName }); }, [userId]);
  const sendTypingStop = useCallback((convId: string) => { if (socketRef.current?.connected && userId) socketRef.current.emit('typing_stop', { conversationId: convId, userId }); }, [userId]);

  return { isConnected, error, sendTypingStart, sendTypingStop, socket: socketRef.current };
}

export default useSocket;
