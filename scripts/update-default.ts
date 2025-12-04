import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Update database default value for role column
    await prisma.$executeRaw`ALTER TABLE User ALTER COLUMN role SET DEFAULT 'host'`;
    console.log('Updated default value for role column to host');
    
    // Verify by checking existing users
    const users = await prisma.user.findMany({
        select: { email: true, role: true }
    });
    console.log('Current users:', users);
}

main()
    .catch(e => console.log('Error:', e.message))
    .finally(() => prisma.$disconnect());
