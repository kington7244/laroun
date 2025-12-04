import { Server as SocketServer } from 'socket.io';
import { cache } from './redis';

let io: SocketServer | null = null;

export const rooms = { user: (userId: string) => 'user:' + userId, page: (pageId: string) => 'page:' + pageId, conversation: (conversationId: string) => 'conversation:' + conversationId };
export const events = { NEW_MESSAGE: 'new_message', CONVERSATION_UPDATE: 'conversation_update', TYPING_START: 'typing_start', TYPING_STOP: 'typing_stop' };

export function getIO(): SocketServer | null { return io; }

export async function emitToRoom(room: string, event: string, data: any) { if (io) io.to(room).emit(event, data); await cache.publish('socket:' + room, { event, data }); }

export async function emitNewMessage(pageId: string, conversationId: string, message: any) { await emitToRoom(rooms.page(pageId), events.NEW_MESSAGE, { conversationId, message }); }

export async function emitConversationUpdate(pageId: string, conversation: any) { await emitToRoom(rooms.page(pageId), events.CONVERSATION_UPDATE, { conversation }); }

export default io;
