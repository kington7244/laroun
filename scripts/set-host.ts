import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Set nprxth@gmail.com as host
    const host = await prisma.user.update({
        where: { email: 'nprxth@gmail.com' },
        data: { role: 'host' }
    });
    console.log('Updated:', host.email, 'to role:', host.role);

}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
