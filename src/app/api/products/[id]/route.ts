import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const productId = parseInt(id);

    // Find product by ID
    const existingProduct = await db.select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (existingProduct.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = existingProduct[0];

    // Check if user is the seller or Admin
    if (product.sellerId !== user.id && user.role !== 'Admin') {
      return NextResponse.json({ 
        error: 'Forbidden: You can only update your own products or must be Admin',
        code: "FORBIDDEN" 
      }, { status: 403 });
    }

    const requestBody = await request.json();

    // Security check: reject if sellerId provided in body
    if ('sellerId' in requestBody || 'seller_id' in requestBody) {
      return NextResponse.json({ 
        error: "Seller ID cannot be provided in request body",
        code: "SELLER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { name, price, stock, imageUrl, description } = requestBody;

    // Validate fields if provided
    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return NextResponse.json({ 
        error: "Price must be a non-negative number",
        code: "INVALID_PRICE" 
      }, { status: 400 });
    }

    if (stock !== undefined && (typeof stock !== 'number' || stock < 0 || !Number.isInteger(stock))) {
      return NextResponse.json({ 
        error: "Stock must be a non-negative integer",
        code: "INVALID_STOCK" 
      }, { status: 400 });
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json({ 
        error: "Name must be a non-empty string",
        code: "INVALID_NAME" 
      }, { status: 400 });
    }

    if (imageUrl !== undefined && typeof imageUrl !== 'string') {
      return NextResponse.json({ 
        error: "Image URL must be a string",
        code: "INVALID_IMAGE_URL" 
      }, { status: 400 });
    }

    if (description !== undefined && typeof description !== 'string') {
      return NextResponse.json({ 
        error: "Description must be a string",
        code: "INVALID_DESCRIPTION" 
      }, { status: 400 });
    }

    // Build update object with only provided fields
    const updates: any = {};
    
    if (name !== undefined) updates.name = name.trim();
    if (price !== undefined) updates.price = price;
    if (stock !== undefined) updates.stock = stock;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl.trim();
    if (description !== undefined) updates.description = description.trim();

    // remove automatic updatedAt field since it doesn't exist in schema
    // updates.updatedAt = new Date().toISOString();

    const updatedProduct = await db.update(products)
      .set(updates)
      .where(eq(products.id, productId))
      .returning();

    if (updatedProduct.length === 0) {
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedProduct[0] 
    }, { status: 200 });

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const productId = parseInt(id);

    // Find product by ID
    const existingProduct = await db.select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (existingProduct.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = existingProduct[0];

    // Check if user is the seller or Admin
    if (product.sellerId !== user.id && user.role !== 'Admin') {
      return NextResponse.json({ 
        error: 'Forbidden: You can only delete your own products or must be Admin',
        code: "FORBIDDEN" 
      }, { status: 403 });
    }

    // Delete product from database
    const deleted = await db.delete(products)
      .where(eq(products.id, productId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: { message: 'Product deleted' }
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}