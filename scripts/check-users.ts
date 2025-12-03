import { db } from "@/lib/db"

async function main() {
    const users = await db.user.findMany({
        include: {
            accounts: true,
        },
    })
    console.log(JSON.stringify(users, null, 2))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await db.$disconnect()
    })
