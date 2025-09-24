import { db } from '@/db';
import { users } from '@/db/schema';
import bcrypt from 'bcrypt';

async function main() {
    const saltRounds = 12;
    const plainPassword = 'password123';
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    const currentDate = new Date().toISOString();

    const sampleUsers = [
        {
            username: 'admin',
            email: 'admin@example.com',
            passwordHash: hashedPassword,
            role: 'Admin' as const,
            createdAt: currentDate,
        },
        {
            username: 'seller',
            email: 'seller@example.com',
            passwordHash: hashedPassword,
            role: 'Seller' as const,
            createdAt: currentDate,
        },
        {
            username: 'john',
            email: 'john@example.com',
            passwordHash: hashedPassword,
            role: 'Customer' as const,
            createdAt: currentDate,
        },
        {
            username: 'jane',
            email: 'jane@example.com',
            passwordHash: hashedPassword,
            role: 'Customer' as const,
            createdAt: currentDate,
        }
    ];

    await db.insert(users).values(sampleUsers);
    
    console.log('✅ Users seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});