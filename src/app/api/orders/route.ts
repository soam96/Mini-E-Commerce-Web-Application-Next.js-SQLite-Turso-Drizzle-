import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, orderItems, products, users } from '@/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let ordersQuery;

    if (user.role === 'Admin') {
      // Admin can see all orders
      ordersQuery = db
        .select({
          id: orders.id,
          userId: orders.userId,
          total: orders.total,
          createdAt: orders.createdAt,
          items: {
            id: orderItems.id,
            productId: orderItems.productId,
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
            productName: products.name,
            productPrice: products.price,
            productImageUrl: products.imageUrl,
            sellerId: products.sellerId
          },
          customerUsername: users.username,
          customerEmail: users.email
        })
        .from(orders)
        .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
        .leftJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(users, eq(orders.userId, users.id))
        .orderBy(desc(orders.createdAt));
    } else if (user.role === 'Customer') {
      // Customer can only see their own orders
      ordersQuery = db
        .select({
          id: orders.id,
          userId: orders.userId,
          total: orders.total,
          createdAt: orders.createdAt,
          items: {
            id: orderItems.id,
            productId: orderItems.productId,
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
            productName: products.name,
            productPrice: products.price,
            productImageUrl: products.imageUrl,
            sellerId: products.sellerId
          }
        })
        .from(orders)
        .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
        .leftJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orders.userId, user.id))
        .orderBy(desc(orders.createdAt));
    } else if (user.role === 'Seller') {
      // Seller can see orders containing their products
      ordersQuery = db
        .select({
          id: orders.id,
          userId: orders.userId,
          total: orders.total,
          createdAt: orders.createdAt,
          items: {
            id: orderItems.id,
            productId: orderItems.productId,
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
            productName: products.name,
            productPrice: products.price,
            productImageUrl: products.imageUrl,
            sellerId: products.sellerId
          },
          customerUsername: users.username,
          customerEmail: users.email
        })
        .from(orders)
        .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
        .leftJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(users, eq(orders.userId, users.id))
        .where(eq(products.sellerId, user.id))
        .orderBy(desc(orders.createdAt));
    } else {
      return NextResponse.json({ error: 'Invalid user role' }, { status: 403 });
    }

    const results = await ordersQuery;

    // Group results by order
    const groupedOrders = results.reduce((acc, row) => {
      const orderId = row.id;
      if (!acc[orderId]) {
        acc[orderId] = {
          id: row.id,
          userId: row.userId,
          total: row.total,
          createdAt: row.createdAt,
          items: [],
          ...(user.role === 'Admin' || user.role === 'Seller' ? {
            customerUsername: row.customerUsername,
            customerEmail: row.customerEmail
          } : {})
        };
      }
      
      if (row.items.id) {
        acc[orderId].items.push(row.items);
      }
      
      return acc;
    }, {} as any);

    const ordersArray = Object.values(groupedOrders);

    return NextResponse.json({
      success: true,
      data: ordersArray
    });

  } catch (error) {
    console.error('GET orders error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check user role - only Customer and Admin can create orders
    if (user.role !== 'Customer' && user.role !== 'Admin') {
      return NextResponse.json({ 
        error: 'Only customers can create orders',
        code: 'INVALID_ROLE' 
      }, { status: 403 });
    }

    const requestBody = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { items } = requestBody;

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        error: 'Items array is required and must not be empty',
        code: 'MISSING_ITEMS' 
      }, { status: 400 });
    }

    // Validate item structure
    for (const item of items) {
      if (!item.product_id || typeof item.product_id !== 'number' || item.product_id <= 0) {
        return NextResponse.json({ 
          error: 'Each item must have a valid product_id',
          code: 'INVALID_PRODUCT_ID' 
        }, { status: 400 });
      }

      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return NextResponse.json({ 
          error: 'Each item must have a valid quantity greater than 0',
          code: 'INVALID_QUANTITY' 
        }, { status: 400 });
      }
    }

    // Get all product IDs
    const productIds = items.map(item => item.product_id);

    // Check all products exist and get their details
    const productsData = await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    if (productsData.length !== productIds.length) {
      return NextResponse.json({ 
        error: 'One or more products do not exist',
        code: 'PRODUCT_NOT_FOUND' 
      }, { status: 400 });
    }

    // Create product lookup map
    const productMap = productsData.reduce((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {} as Record<number, any>);

    // Check stock availability and calculate total
    let total = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = productMap[item.product_id];
      
      if (product.stock < item.quantity) {
        return NextResponse.json({ 
          error: `Insufficient stock for product "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
          code: 'INSUFFICIENT_STOCK' 
        }, { status: 400 });
      }

      const itemTotal = product.price * item.quantity;
      total += itemTotal;

      orderItemsData.push({
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice: product.price
      });
    }

    // Begin transaction - create order and order items atomically
    const currentTime = new Date().toISOString();

    // Create the order
    const newOrder = await db.insert(orders).values({
      userId: user.id,
      total: total,
      createdAt: currentTime
    }).returning();

    const orderId = newOrder[0].id;

    // Create order items
    const orderItemsToInsert = orderItemsData.map(item => ({
      orderId: orderId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    }));

    const createdOrderItems = await db.insert(orderItems)
      .values(orderItemsToInsert)
      .returning();

    // Update product stock
    for (const item of items) {
      await db.update(products)
        .set({
          stock: productMap[item.product_id].stock - item.quantity
        })
        .where(eq(products.id, item.product_id));
    }

    // Get complete order data with items and product details
    const completeOrder = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        total: orders.total,
        createdAt: orders.createdAt,
        items: {
          id: orderItems.id,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          productName: products.name,
          productPrice: products.price,
          productImageUrl: products.imageUrl
        }
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orders.id, orderId));

    // Group the results
    const orderWithItems = {
      id: completeOrder[0].id,
      userId: completeOrder[0].userId,
      total: completeOrder[0].total,
      createdAt: completeOrder[0].createdAt,
      items: completeOrder.map(row => row.items).filter(item => item.id)
    };

    return NextResponse.json({
      success: true,
      data: orderWithItems
    }, { status: 201 });

  } catch (error) {
    console.error('POST orders error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}