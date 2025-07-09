// ../database/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 👤 Create a user
    const user = await prisma.user.create({
        data: {
            email: 'john@example.com',
            username: 'john_doe',
            password: 'hashedpassword123', // In real world, hash it!
            wallets: {
                create: {
                    balance: 5000,
                    currency: 'NGN',
                },
            },
            notifications: {
                create: {
                    title: 'Welcome!',
                    body: 'Thanks for signing up.',
                    type: 'info',
                },
            },

        },
    });

    console.log(`👤 Seeded user: ${user.username}`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
        console.log('✅ Seed complete');
    })
    .catch(async (e) => {
        console.error('❌ Error seeding:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
