import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, orderItems, products, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const { id } = params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        success: false,
        error: "Valid order ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const orderId = parseInt(id);

    // First, get the order
    const orderResult = await db.select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (orderResult.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Order not found' 
      }, { status: 404 });
    }

    const order = orderResult[0];

    // Access control check
    let hasAccess = false;

    if (user.role === 'Admin') {
      // Admin can view any order
      hasAccess = true;
    } else if (user.role === 'Customer') {
      // Customer can only view their own orders
      hasAccess = order.userId === user.id;
    } else if (user.role === 'Seller') {
      // Seller can view orders containing their products
      // Check if any order items contain products from this seller
      const sellerOrderItems = await db.select()
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(
          and(
            eq(orderItems.orderId, orderId),
            eq(products.sellerId, user.id)
          )
        )
        .limit(1);

      hasAccess = sellerOrderItems.length > 0;
    }

    if (!hasAccess) {
      return NextResponse.json({ 
        success: false,
        error: 'Access forbidden: You do not have permission to view this order' 
      }, { status: 403 });
    }

    // Get order items with product details
    const orderItemsWithProducts = await db.select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      productName: products.name,
      productDescription: products.description,
      productImageUrl: products.imageUrl,
      sellerId: products.sellerId,
      sellerUsername: users.username
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .innerJoin(users, eq(products.sellerId, users.id))
    .where(eq(orderItems.orderId, orderId));

    // Get customer details
    const customerResult = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role
    })
    .from(users)
    .where(eq(users.id, order.userId))
    .limit(1);

    const customer = customerResult[0];

    // Construct the complete order object
    const orderWithItems = {
      id: order.id,
      userId: order.userId,
      total: order.total,
      createdAt: order.createdAt,
      customer: customer,
      items: orderItemsWithProducts.map(item => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        product: {
          id: item.productId,
          name: item.productName,
          description: item.productDescription,
          imageUrl: item.productImageUrl,
          seller: {
            id: item.sellerId,
            username: item.sellerUsername
          }
        }
      }))
    };

    return NextResponse.json({ 
      success: true, 
      data: orderWithItems 
    }, { status: 200 });

  } catch (error) {
    console.error('GET order error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}