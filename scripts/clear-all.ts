import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Delete in order to avoid foreign key constraints
    console.log('Deleting team members...');
    const tm = await prisma.teamMember.deleteMany();
    console.log('Deleted:', tm.count);

    console.log('Deleting teams...');
    const t = await prisma.team.deleteMany();
    console.log('Deleted:', t.count);

    console.log('Deleting messages...');
    const m = await prisma.message.deleteMany();
    console.log('Deleted:', m.count);

    console.log('Deleting conversations...');
    const c = await prisma.conversation.deleteMany();
    console.log('Deleted:', c.count);

    console.log('Deleting accounts...');
    const a = await prisma.account.deleteMany();
    console.log('Deleted:', a.count);

    console.log('Deleting sessions...');
    const s = await prisma.session.deleteMany();
    console.log('Deleted:', s.count);

    console.log('Deleting users...');
    const u = await prisma.user.deleteMany();
    console.log('Deleted:', u.count);

    console.log('Done!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
