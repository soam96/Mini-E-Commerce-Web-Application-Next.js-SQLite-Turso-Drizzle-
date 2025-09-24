import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products, users } from '@/db/schema';
import { eq, like, and, or, desc, gte, lte } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sellerId = searchParams.get('sellerId');

    let query = db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        stock: products.stock,
        sellerId: products.sellerId,
        imageUrl: products.imageUrl,
        description: products.description,
        createdAt: products.createdAt,
        seller: {
          id: users.id,
          username: users.username,
          email: users.email,
          role: users.role
        }
      })
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id));

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.description, `%${search}%`)
        )
      );
    }

    if (minPrice) {
      const minPriceNum = parseFloat(minPrice);
      if (!isNaN(minPriceNum)) {
        conditions.push(gte(products.price, minPriceNum));
      }
    }

    if (maxPrice) {
      const maxPriceNum = parseFloat(maxPrice);
      if (!isNaN(maxPriceNum)) {
        conditions.push(lte(products.price, maxPriceNum));
      }
    }

    if (sellerId) {
      const sellerIdNum = parseInt(sellerId);
      if (!isNaN(sellerIdNum)) {
        conditions.push(eq(products.sellerId, sellerIdNum));
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('GET products error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required' 
      }, { status: 401 });
    }

    if (user.role !== 'Seller' && user.role !== 'Admin') {
      return NextResponse.json({ 
        success: false,
        error: 'Seller or Admin role required',
        code: 'INSUFFICIENT_PERMISSIONS'
      }, { status: 403 });
    }

    const requestBody = await request.json();
    const { name, price, stock, imageUrl, description, sellerId } = requestBody;

    // Security check: prevent unauthorized sellerId manipulation
    if ('sellerId' in requestBody && user.role !== 'Admin') {
      return NextResponse.json({ 
        success: false,
        error: "Only Admin can specify sellerId",
        code: "SELLER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json({ 
        success: false,
        error: "Product name is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return NextResponse.json({ 
        success: false,
        error: "Valid price is required",
        code: "INVALID_PRICE" 
      }, { status: 400 });
    }

    // Determine sellerId based on user role
    let finalSellerId = user.id;
    if (user.role === 'Admin' && sellerId) {
      const sellerIdNum = parseInt(sellerId);
      if (isNaN(sellerIdNum)) {
        return NextResponse.json({ 
          success: false,
          error: "Valid sellerId is required",
          code: "INVALID_SELLER_ID" 
        }, { status: 400 });
      }
      
      // Verify seller exists and has Seller role
      const seller = await db.select()
        .from(users)
        .where(eq(users.id, sellerIdNum))
        .limit(1);
      
      if (seller.length === 0 || (seller[0].role !== 'Seller' && seller[0].role !== 'Admin')) {
        return NextResponse.json({ 
          success: false,
          error: "Invalid seller",
          code: "INVALID_SELLER" 
        }, { status: 400 });
      }
      
      finalSellerId = sellerIdNum;
    }

    // Sanitize and prepare data
    const insertData = {
      name: name.trim(),
      price: parseFloat(price),
      stock: stock ? parseInt(stock) : 0,
      sellerId: finalSellerId,
      imageUrl: imageUrl ? imageUrl.trim() : null,
      description: description ? description.trim() : null,
      createdAt: new Date().toISOString()
    };

    const newProduct = await db.insert(products)
      .values(insertData)
      .returning();

    return NextResponse.json({
      success: true,
      data: newProduct[0]
    }, { status: 201 });

  } catch (error) {
    console.error('POST products error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}