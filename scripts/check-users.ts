import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking Users...");
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            facebookAdToken: true
        }
    });

    console.log(`Found ${users.length} users.`);
    users.forEach(u => {
        console.log(`User: ${u.email}, Role: ${u.role}, Has Token: ${!!u.facebookAdToken}`);
        if (u.facebookAdToken) {
            console.log(`  Token length: ${u.facebookAdToken.length}`);
            console.log(`  Token start: ${u.facebookAdToken.substring(0, 10)}...`);
        }
    });

    const accounts = await prisma.account.findMany({
        where: { provider: 'facebook' },
        select: {
            userId: true,
            access_token: true
        }
    });
    console.log(`Found ${accounts.length} Facebook accounts.`);
    accounts.forEach(a => {
        console.log(`Account for UserID: ${a.userId}, Has Token: ${!!a.access_token}`);
    });
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
