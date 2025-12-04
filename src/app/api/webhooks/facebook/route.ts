import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';

// Verify Token - Should match what you set in Facebook App Dashboard
const VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'my_secure_verify_token';
const APP_SECRET = process.env.FACEBOOK_CLIENT_SECRET;

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            return new NextResponse(challenge, { status: 200 });
        } else {
            return new NextResponse('Forbidden', { status: 403 });
        }
    }

    return new NextResponse('Bad Request', { status: 400 });
}

export async function POST(req: NextRequest) {
    try {
        // 1. Get raw body for signature verification
        const rawBody = await req.text();

        // 2. Verify Signature
        if (APP_SECRET) {
            const signature = req.headers.get('x-hub-signature-256');
            if (!signature) {
                console.warn('Missing X-Hub-Signature-256 header');
                return new NextResponse('Unauthorized', { status: 401 });
            }

            const expectedSignature = 'sha256=' + crypto
                .createHmac('sha256', APP_SECRET)
                .update(rawBody)
                .digest('hex');

            const sigBuffer = Buffer.from(signature, 'utf8');
            const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

            if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
                console.warn('Invalid X-Hub-Signature-256');
                return new NextResponse('Unauthorized', { status: 401 });
            }
        }

        const body = JSON.parse(rawBody);
        console.log('[Webhook] Received:', JSON.stringify(body, null, 2));

        if (body.object === 'page') {
            for (const entry of body.entry) {
                const pageId = entry.id;
                console.log(`[Webhook] Processing entry for page: ${pageId}`);

                if (entry.messaging) {
                    for (const event of entry.messaging) {
                        if (event.message) {
                            await handleMessage(pageId, event);
                        }
                    }
                }
            }

            return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        return new NextResponse('Not Found', { status: 404 });
    } catch (error) {
        console.error('Error processing webhook:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

async function handleMessage(pageId: string, event: any) {
    const senderId = event.sender.id;
    const message = event.message;
    const timestamp = event.timestamp;

    console.log(`[Webhook] New message from ${senderId}: ${message?.text || '[attachment]'}`);

    try {
        // Update or create conversation
        const existingConv = await prisma.conversation.findFirst({
            where: {
                pageId: pageId,
                participantId: senderId
            }
        });

        if (existingConv) {
            // Update existing conversation
            await prisma.conversation.update({
                where: { id: existingConv.id },
                data: {
                    snippet: message?.text || '[Attachment]',
                    updatedTime: new Date(timestamp),
                    unreadCount: { increment: 1 }
                }
            });

            // Create message record
            await prisma.message.create({
                data: {
                    conversationId: existingConv.id,
                    from: senderId,
                    text: message?.text,
                    attachments: message?.attachments ? JSON.stringify(message.attachments) : null,
                    stickerUrl: message?.sticker_id ? `https://graph.facebook.com/${message.sticker_id}/picture` : null,
                    isFromPage: false,
                    createdTime: new Date(timestamp)
                }
            });
        } else {
            // Create new conversation
            const newConv = await prisma.conversation.create({
                data: {
                    pageId: pageId,
                    participantId: senderId,
                    participantName: 'Facebook User',
                    snippet: message?.text || '[Attachment]',
                    updatedTime: new Date(timestamp),
                    unreadCount: 1
                }
            });

            // Create message record
            await prisma.message.create({
                data: {
                    conversationId: newConv.id,
                    from: senderId,
                    text: message?.text,
                    attachments: message?.attachments ? JSON.stringify(message.attachments) : null,
                    stickerUrl: message?.sticker_id ? `https://graph.facebook.com/${message.sticker_id}/picture` : null,
                    isFromPage: false,
                    createdTime: new Date(timestamp)
                }
            });
        }

        console.log(`[Webhook] Message saved for conversation with ${senderId}`);
    } catch (error) {
        console.error('[Webhook] Error saving message:', error);
    }
}

