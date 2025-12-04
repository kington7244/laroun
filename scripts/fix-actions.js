const fs = require('fs');
let content = fs.readFileSync('src/app/actions.ts', 'utf8');

// Add filter before return in fetchConversations
const oldReturn = 'return JSON.parse(JSON.stringify(savedConversations));\n    } catch (error: any) {\n        console.error(';
const newReturn = '// Filter for staff - only show assigned conversations\n        let filteredConversations = savedConversations;\n        if (!canSeeAllChats) {\n            filteredConversations = savedConversations.filter(conv => conv.assignedToId === userId);\n        }\n\n        return JSON.parse(JSON.stringify(filteredConversations));\n    } catch (error: any) {\n        console.error(';

content = content.replace(oldReturn, newReturn);

// Fix fetchConversationsFromDB to include host
const oldAdmin = 'const isAdmin = user?.role === ';
const newAdmin = '// Host and Admin can see all chats, Staff only sees assigned\n    const canSeeAllChats = user?.role === ';

content = content.replace(oldAdmin, newAdmin);
content = content.replace('if (!isAdmin)', 'if (!canSeeAllChats)');

fs.writeFileSync('src/app/actions.ts', content);
console.log('Done!');
