import { db } from '@/db';
import { products } from '@/db/schema';

async function main() {
    const sampleProducts = [
        {
            name: 'Sony WH-1000XM5 Wireless Headphones',
            price: 99.99,
            stock: 25,
            sellerId: 2,
            imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
            description: 'Premium wireless noise-canceling headphones with 30-hour battery life and crystal-clear audio quality.',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
            price: 45.00,
            stock: 15,
            sellerId: 2,
            imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&h=500&fit=crop',
            description: 'Essential programming book that teaches best practices for writing maintainable, readable code. A must-read for developers.',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Modern Ceramic Plant Pot with Drainage',
            price: 25.50,
            stock: 40,
            sellerId: 2,
            imageUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=500&h=500&fit=crop',
            description: 'Beautiful white ceramic pot perfect for indoor plants. Features proper drainage holes and includes matching saucer.',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Clear Protective iPhone Case',
            price: 19.99,
            stock: 50,
            sellerId: 2,
            imageUrl: 'https://images.unsplash.com/photo-1601944177325-f8867652837f?w=500&h=500&fit=crop',
            description: 'Crystal clear protective case with reinforced corners. Compatible with wireless charging and provides excellent drop protection.',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'The Complete Mediterranean Cookbook',
            price: 32.95,
            stock: 20,
            sellerId: 2,
            imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&h=500&fit=crop',
            description: 'Over 200 authentic Mediterranean recipes with step-by-step instructions and beautiful photography. Perfect for healthy cooking.',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Professional 5-Piece Garden Tool Set',
            price: 78.00,
            stock: 12,
            sellerId: 2,
            imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=500&h=500&fit=crop',
            description: 'Complete garden tool set including spade, rake, hoe, trowel, and pruning shears. Made from durable stainless steel with ergonomic handles.',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'OnePlus Nord Buds 2',
            price: 2999,
            stock: 35,
            sellerId: 2,
            imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&h=500&fit=crop',
            description: 'True wireless earbuds with AI noise cancellation and up to 36 hours of playback.',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'boAt Airdopes 141',
            price: 1499,
            stock: 60,
            sellerId: 2,
            imageUrl: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500&h=500&fit=crop',
            description: 'Wireless earbuds with low latency gaming mode and ASAP fast charge support.',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Mi Power Bank 10000mAh',
            price: 1299,
            stock: 80,
            sellerId: 2,
            imageUrl: 'https://images.unsplash.com/photo-1585386959984-a4155223165f?w=500&h=500&fit=crop',
            description: 'Compact 10,000mAh lithium polymer power bank with 18W fast charging.',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Lenovo 400 Wireless Mouse',
            price: 699,
            stock: 70,
            sellerId: 2,
            imageUrl: 'https://images.unsplash.com/photo-1587825140400-1c51fcdf3d48?w=500&h=500&fit=crop',
            description: 'Ergonomic wireless mouse with 2.4GHz dongle and 1200 DPI precision.',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Prestige Omega Non-Stick Fry Pan (24cm)',
            price: 899,
            stock: 45,
            sellerId: 2,
            imageUrl: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=500&h=500&fit=crop',
            description: 'Durable non-stick fry pan compatible with gas and induction cooktops.',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Fastrack Analog Watch for Men',
            price: 1999,
            stock: 22,
            sellerId: 2,
            imageUrl: 'https://images.unsplash.com/photo-1524594227085-4f7f8d2d6a6f?w=500&h=500&fit=crop',
            description: 'Stylish analog wrist watch with leather strap and water resistance.',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'U.S. Polo Assn. Cotton Polo T-Shirt',
            price: 799,
            stock: 55,
            sellerId: 2,
            imageUrl: 'https://images.unsplash.com/photo-1520975922215-230f6c0a0e52?w=500&h=500&fit=crop',
            description: 'Classic fit cotton polo t-shirt, breathable and perfect for daily wear.',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'realme Smartwatch S',
            price: 3499,
            stock: 30,
            sellerId: 2,
            imageUrl: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=500&h=500&fit=crop',
            description: 'Smartwatch with SpO2 monitor, heart rate tracking, and 15-day battery.',
            createdAt: new Date().toISOString(),
        }
    ];

    await db.insert(products).values(sampleProducts);
    
    console.log('✅ Products seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});