import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';

// Extract ad_id from incoming message payload
// Tries multiple fallback methods to find ad_id from Click-to-Messenger ads
function extractAdId(event: any): string | null {
  if (!event) return null;
  
  const msg = event.message;
  const referral = event.referral || event.postback?.referral || msg?.referral;

  // Method 1: Direct ad_id field in message
  if (msg?.ad_id) {
    console.log(`[extractAdId] Method 1 - Direct ad_id field: ${msg.ad_id}`);
    return msg.ad_id;
  }
  
  // Method 2: referral.ad_id field (in event or message)
  if (referral?.ad_id) {
    console.log(`[extractAdId] Method 2 - referral.ad_id field: ${referral.ad_id}`);
    return referral.ad_id;
  }
  
  // Method 3: Parse ad_id from referral.ref string (format: "ref::ad::adid::")
  const ref = referral?.ref;
  if (typeof ref === 'string') {
    const match = ref.match(/ad::(\d+)/);
    if (match && match[1]) {
      console.log(`[extractAdId] Method 3 - Parsed from referral.ref: ${match[1]}`);
      return match[1];
    }
  }
  
  // Method 4: Try message_tags if present (alternative structure)
  if (msg?.message_tags && Array.isArray(msg.message_tags)) {
    const adTag = msg.message_tags.find((tag: any) => tag && tag.name && tag.name.includes('ad_'));
    if (adTag) {
      console.log(`[extractAdId] Method 4 - From message_tags: ${adTag.name}`);
      return adTag.name;
    }
  }
  
  return null;
}

// Verify Token - Should match what you set in Facebook App Dashboard
const VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'my_secure_verify_token';
const APP_SECRET = process.env.FACEBOOK_APP_SECRET;

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
                        // Handle messages AND postbacks (which may contain referral data)
                        if (event.message || event.postback || event.referral) {
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
    const postback = event.postback;
    const timestamp = event.timestamp;

    // Log the full event structure to debug where ad_id is hiding
    console.log(`[Webhook] Processing event from ${senderId}`);
    console.log(`[Webhook] Full Event Payload:`, JSON.stringify(event, null, 2));

    try {
        // Extract ad_id from incoming event (Click-to-Messenger ads)
        // Now passing the FULL event object, not just message
        const extractedAdId = extractAdId(event);
        if (extractedAdId) {
            console.log(`[Webhook] ✅ Successfully extracted ad_id: ${extractedAdId}`);
        } else {
            console.log(`[Webhook] ℹ️ No ad_id found in event payload`);
        }

        // Update or create conversation
        const existingConv = await prisma.conversation.findFirst({
            where: {
                pageId: pageId,
                participantId: senderId
            }
        });

        // Determine snippet text
        let snippet = '[Attachment]';
        if (message?.text) snippet = message.text;
        else if (postback?.title) snippet = postback.title;
        else if (event.referral) snippet = '[Referral Action]';

        if (existingConv) {
            // Update existing conversation
            const updateData: any = {
                snippet: snippet,
                updatedTime: new Date(timestamp),
                unreadCount: { increment: 1 }
            };

            // Update ad_id if extracted and not already set
            if (extractedAdId && !existingConv.adId) {
                updateData.adId = extractedAdId;
                console.log(`[Webhook] Storing ad_id in conversation: ${extractedAdId}`);
            } else if (extractedAdId && existingConv.adId !== extractedAdId) {
                console.log(`[Webhook] ⚠️ Conversation already has ad_id: ${existingConv.adId}, new ad_id: ${extractedAdId}`);
            }

            await prisma.conversation.update({
                where: { id: existingConv.id },
                data: updateData
            });

            // Create message record ONLY if it's a message or postback (not just a referral event)
            if (message || postback) {
                await prisma.message.create({
                    data: {
                        conversationId: existingConv.id,
                        from: senderId,
                        text: message?.text || postback?.title || postback?.payload,
                        attachments: message?.attachments ? JSON.stringify(message.attachments) : null,
                        stickerUrl: message?.sticker_id ? `https://graph.facebook.com/${message.sticker_id}/picture` : null,
                        isFromPage: false,
                        createdTime: new Date(timestamp)
                    }
                });
            }
        } else {
            // Create new conversation
            const newConv = await prisma.conversation.create({
                data: {
                    pageId: pageId,
                    participantId: senderId,
                    participantName: 'Facebook User',
                    snippet: snippet,
                    updatedTime: new Date(timestamp),
                    unreadCount: 1,
                    adId: extractedAdId || undefined  // Store ad_id if extracted
                }
            });

            if (extractedAdId) {
                console.log(`[Webhook] Stored ad_id in new conversation: ${extractedAdId}`);
            }

            // Create message record
            if (message || postback) {
                await prisma.message.create({
                    data: {
                        conversationId: newConv.id,
                        from: senderId,
                        text: message?.text || postback?.title || postback?.payload,
                        attachments: message?.attachments ? JSON.stringify(message.attachments) : null,
                        stickerUrl: message?.sticker_id ? `https://graph.facebook.com/${message.sticker_id}/picture` : null,
                        isFromPage: false,
                        createdTime: new Date(timestamp)
                    }
                });
            }
        }

        console.log(`[Webhook] Event processed for conversation with ${senderId}`);
    } catch (error) {
        console.error('[Webhook] Error processing event:', error);
    }
}

