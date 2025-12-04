const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking Facebook accounts...');
    
    const accounts = await prisma.account.findMany({
        where: { provider: 'facebook' }
    });
    
    console.log('Facebook accounts:', accounts.length);
    accounts.forEach(a => {
        console.log({
            userId: a.userId,
            provider: a.provider,
            providerAccountId: a.providerAccountId,
            hasAccessToken: !!a.access_token,
            tokenLength: a.access_token?.length || 0,
            scope: a.scope
        });
    });
    
    // Check User table for facebookAdToken
    const users = await prisma.user.findMany({
        where: { facebookAdToken: { not: null } }
    });
    
    console.log('\nUsers with facebookAdToken:', users.length);
    users.forEach(u => {
        console.log({
            id: u.id,
            email: u.email,
            hasToken: !!u.facebookAdToken,
            tokenLength: u.facebookAdToken?.length || 0
        });
    });
    
    // Check all users
    console.log('\nAll users:');
    const allUsers = await prisma.user.findMany();
    allUsers.forEach(u => {
        console.log({
            id: u.id,
            email: u.email,
            name: u.name
        });
    });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
