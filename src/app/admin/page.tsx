"use client"

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

 type Role = "Customer" | "Seller" | "Admin";
 type User = { id: number; username: string; email: string; role: Role };
 type OrderItem = { id: number; productId: number; quantity: number; unitPrice: number; productName?: string; productImageUrl?: string };
 type Order = { id: number; userId: number; total: number; createdAt: string; items: OrderItem[]; customerUsername?: string; customerEmail?: string };

export default function AdminPage() {
  const [me, setMe] = useState<User | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) return setMe(null);
        const data = await res.json();
        if (data?.success && data?.data) setMe(data.data as User);
      } catch {}
      finally { setLoadingMe(false); }
    };
    loadMe();
  }, []);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const res = await fetch("/api/orders", { credentials: "include" });
        const data = await res.json();
        if (data?.success) setOrders(data.data as Order[]);
      } catch {}
    };
    if (me?.role === "Admin") loadOrders();
  }, [me?.role]);

  if (loadingMe) return <div className="px-4 py-8">Loading...</div>;
  if (!me) return <div className="px-4 py-8">Please <a href="/login" className="text-primary underline">sign in</a> to continue.</div>;
  if (me.role !== "Admin") return <div className="px-4 py-8">Access denied. Admin role required.</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">View all orders. Product and user management can be done via Seller dashboard and API.</p>
      </header>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>All orders across the store</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-sm text-muted-foreground">No orders yet.</div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="rounded border p-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-medium">Order #{o.id}</div>
                    <div>${o.total.toFixed(2)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Customer: {o.customerUsername || o.userId} • {new Date(o.createdAt).toLocaleString()}</div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {o.items?.map((it) => (
                      <div key={it.id} className="flex items-center gap-2 text-sm">
                        {it.productImageUrl ? (
                          <img src={it.productImageUrl} alt={it.productName || String(it.productId)} className="size-10 rounded object-cover" />
                        ) : null}
                        <div className="flex-1">
                          <div className="font-medium leading-tight line-clamp-1">{it.productName || `Product ${it.productId}`}</div>
                          <div className="text-xs text-muted-foreground">Qty {it.quantity} • ${it.unitPrice.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}