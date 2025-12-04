import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'kington7244@gmail.com';
    
    try {
        // Delete related records first
        await prisma.account.deleteMany({
            where: { user: { email } }
        });
        
        await prisma.session.deleteMany({
            where: { user: { email } }
        });
        
        // Delete user
        const deleted = await prisma.user.delete({
            where: { email }
        });
        
        console.log('Deleted user:', deleted.email);
    } catch (e: any) {
        console.log('User not found or already deleted');
    }
}

main()
    .finally(() => prisma.$disconnect());
