
import { PrismaClient } from '@prisma/client';
// import fetch from 'node-fetch'; // Native fetch is available in Node 18+

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Debug Script for Ad ID Extraction...");

    // 1. Get a valid access token (Admin/Host)
    // First try user.facebookAdToken
    let user = await prisma.user.findFirst({
        where: { 
            role: { in: ['admin', 'host'] },
            facebookAdToken: { not: null }
        }
    });

    let accessToken = user?.facebookAdToken;

    // If not found, try Account table (NextAuth)
    if (!accessToken) {
        console.log("No user.facebookAdToken found, checking Account table...");
        const account = await prisma.account.findFirst({
            where: { 
                provider: 'facebook',
                access_token: { not: null }
            },
            include: { user: true }
        });

        if (account && account.access_token) {
            accessToken = account.access_token;
            console.log(`Using Access Token from Account for user: ${account.user.email} (${account.user.role})`);
        }
    }

    if (!accessToken) {
        console.error("No access token found in User or Account table.");
        return;
    }

    console.log(`Using Access Token: ${accessToken.substring(0, 10)}...`);

    // 2. Get a conversation to test
    // We prefer one that HAS a facebookConversationId
    const conversation = await prisma.conversation.findFirst({
        where: { 
            facebookConversationId: { not: null }
        },
        orderBy: { updatedAt: 'desc' }
    });

    if (!conversation) {
        console.error("No conversations with facebookConversationId found in DB.");
        return;
    }

    console.log(`Testing Conversation: ${conversation.id}`);
    console.log(`Facebook Conversation ID: ${conversation.facebookConversationId}`);
    console.log(`Page ID: ${conversation.pageId}`);

    const convId = conversation.facebookConversationId || conversation.id;
    const pageId = conversation.pageId;
    console.log(`Target Page ID: ${pageId}`);

    // Strategy: Try ALL available tokens to find one that works for this page
    const allAccounts = await prisma.account.findMany({
        where: { 
            provider: 'facebook',
            access_token: { not: null }
        },
        include: { user: true }
    });

    console.log(`Found ${allAccounts.length} Facebook accounts to try.`);

    let workingToken = null;

    for (const account of allAccounts) {
        if (!account.access_token) continue;
        console.log(`\nChecking token for user: ${account.user.email}...`);
        
        try {
            // Check if this token has access to the page
            const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${account.access_token}&limit=100`;
            const pagesRes = await fetch(pagesUrl);
            const pagesData = await pagesRes.json();

            if (pagesData.data) {
                const page = pagesData.data.find((p: any) => p.id === pageId);
                if (page && page.access_token) {
                    console.log(`SUCCESS! User ${account.user.email} has admin access to Page ${pageId}.`);
                    workingToken = page.access_token;
                    break;
                } else {
                    console.log(`  - User has access to ${pagesData.data.length} pages, but not target page.`);
                }
            } else {
                console.log(`  - Error fetching pages: ${JSON.stringify(pagesData.error)}`);
            }
        } catch (e) {
            console.error(`  - Exception checking token:`, e);
        }
    }

    if (!workingToken) {
        console.error("\n❌ CRITICAL: No user in the database has access to this Page ID. Cannot fetch data.");
        console.log("Please login with the Facebook account that owns this page.");
        return;
    }

    console.log(`\n✅ Using Valid Page Access Token (starts with): ${workingToken.substring(0, 10)}...`);
    const tokenToUse = workingToken;

    // 3. Test Method 1: Conversation Fields
    console.log("\n--- Test 1: Conversation Fields (minimal) ---");
    try {
        const url = `https://graph.facebook.com/v21.0/${convId}?fields=id,updated_time,link,snippet,can_reply,is_subscribed,participants&metadata=1&access_token=${tokenToUse}`;
        const res = await fetch(url);
        const data = await res.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error Test 1:", e);
    }

    // 4. Test Method 1.5: Custom Labels Edge
    console.log("\n--- Test 2: Custom Labels Edge (/custom_labels) ---");
    try {
        const url = `https://graph.facebook.com/v21.0/${convId}/custom_labels?fields=id,name&access_token=${tokenToUse}`;
        const res = await fetch(url);
        const data = await res.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error Test 2:", e);
    }

    // 5. Test Method 3: Labels Edge
    console.log("\n--- Test 3: Labels Edge (/labels) ---");
    try {
        const url = `https://graph.facebook.com/v21.0/${convId}/labels?fields=id,name&access_token=${tokenToUse}`;
        const res = await fetch(url);
        const data = await res.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error Test 3:", e);
    }

    // 6. Test Method 4: Messages (First 5 - Attachments)
    console.log("\n--- Test 4: Messages (First 5 - Attachments) ---");
    try {
        const url = `https://graph.facebook.com/v21.0/${convId}/messages?fields=id,message,attachments{id,mime_type,name,size,file_url}&limit=5&access_token=${tokenToUse}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.data) {
            data.data.forEach((m: any, i: number) => {
                console.log(`Msg ${i}: ID=${m.id}`);
                if (m.attachments) console.log(`  - attachments:`, JSON.stringify(m.attachments));
            });
        } else {
            console.log("No messages data or error:", JSON.stringify(data));
        }
    } catch (e) {
        console.error("Error Test 4:", e);
    }

    // 7. Test Method 5: Reverse Lookup (Page Custom Labels)
    console.log("\n--- Test 5: Reverse Lookup (Page Custom Labels) ---");
    try {
        // Try without fields first to see defaults, or try different field names
        console.log("Fetching custom_labels without fields...");
        const labelsUrl = `https://graph.facebook.com/v21.0/${pageId}/custom_labels?limit=500&access_token=${tokenToUse}`;
        const labelsRes = await fetch(labelsUrl);
        const labelsData = await labelsRes.json();
        
        if (labelsData.data) {
            console.log(`Found ${labelsData.data.length} labels on the page.`);
            if (labelsData.data.length > 0) {
                const firstLabelId = labelsData.data[0].id;
                console.log(`Inspecting first label ID: ${firstLabelId}`);
                
                // Try to fetch details of this label to find the name field
                try {
                    console.log("Fetching label name directly (v19.0)...");
                    const labelUrl = `https://graph.facebook.com/v19.0/${firstLabelId}?fields=id,name&access_token=${tokenToUse}`;
                    const labelRes = await fetch(labelUrl);
                    const labelData = await labelRes.json();
                    console.log("Label Fields (v19.0):", JSON.stringify(labelData, null, 2));
                } catch (e) {
                    console.error("Error fetching label details:", e);
                }
            }
            
            // Filter for ad-related labels (checking whatever name field exists)
            const adLabels = labelsData.data.filter((l: any) => {
                const name = l.name || l.label_name || l.message || "";
                return name && (name.includes('ad_id') || name.includes('messenger_ads'));
            });
            
            console.log(`Found ${adLabels.length} ad-related labels.`);
            
            // Check assignment for each ad label
            for (const label of adLabels) {
                const name = label.name || label.label_name || label.message || "Unknown";
                console.log(`Checking assignment for label: ${name} (${label.id})...`);
                
                const labelConvsUrl = `https://graph.facebook.com/v21.0/${label.id}/conversations?fields=id&limit=100&access_token=${tokenToUse}`;
                const labelConvsRes = await fetch(labelConvsUrl);
                const labelConvsData = await labelConvsRes.json();
                
                if (labelConvsData.data) {
                    const searchId = convId.replace(/^t_/, '');
                    const isAssigned = labelConvsData.data.some((c: any) => {
                        const cId = c.id.replace(/^t_/, '');
                        return cId === searchId;
                    });
                    
                    if (isAssigned) {
                        console.log(`✅ MATCH! Conversation is assigned to label: ${name}`);
                    }
                }
            }
        } else {
            console.log("Error fetching page labels:", JSON.stringify(labelsData));
        }
    } catch (e) {
        console.error("Error Test 5:", e);
    }

    // 8. Test Method 6: Page Labels (Deprecated endpoint?)
    console.log("\n--- Test 6: Page Labels (Deprecated endpoint?) ---");
    try {
        const labelsUrl = `https://graph.facebook.com/v21.0/${pageId}/labels?fields=id,name&limit=500&access_token=${tokenToUse}`;
        const labelsRes = await fetch(labelsUrl);
        const labelsData = await labelsRes.json();
        
        if (labelsData.data) {
            console.log(`Found ${labelsData.data.length} labels via /labels endpoint.`);
            console.log("Sample:", JSON.stringify(labelsData.data[0]));
        } else {
            console.log("Error fetching /labels:", JSON.stringify(labelsData));
        }
    } catch (e) {
        console.error("Error Test 6:", e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
