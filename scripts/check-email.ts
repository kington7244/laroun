import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Check user
    const user = await prisma.user.findUnique({
        where: { email: 'nprxth@gmail.com' }
    });
    
    if (user) {
        console.log('User found:');
        console.log('  Email:', user.email);
        console.log('  Role:', user.role);
        console.log('  Created:', user.createdAt);
    } else {
        console.log('User not found - not logged in yet');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
