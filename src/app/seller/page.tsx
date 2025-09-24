"use client"

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

type Role = "Customer" | "Seller" | "Admin";

type User = { id: number; username: string; email: string; role: Role };

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  description?: string | null;
  sellerId?: number;
};

export default function SellerDashboardPage() {
  const [me, setMe] = useState<User | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");

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

  const loadProducts = async (sellerId?: number) => {
    if (!sellerId) return;
    try {
      const res = await fetch(`/api/products?sellerId=${sellerId}`);
      const data = await res.json();
      if (data?.success) setProducts(data.data as Product[]);
    } catch {}
  };

  useEffect(() => {
    if (me?.id) loadProducts(me.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  const resetForm = () => {
    setName(""); setPrice(""); setStock(""); setImageUrl(""); setDescription("");
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          price: parseFloat(price),
          stock: stock ? parseInt(stock) : 0,
          imageUrl: imageUrl || undefined,
          description: description || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create product");
      setMessage("Product created");
      resetForm();
      loadProducts(me.id);
    } catch (e: any) {
      setError(e.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete");
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      alert((e as any).message || "Failed to delete");
    }
  };

  const onUpdate = async (p: Product, fields: Partial<Product>) => {
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update");
      setProducts((prev) => prev.map((it) => (it.id === p.id ? data.data : it)));
    } catch (e) {
      alert((e as any).message || "Failed to update");
    }
  };

  if (loadingMe) return <div className="px-4 py-8">Loading...</div>;
  if (!me) return <div className="px-4 py-8">Please <a href="/login" className="text-primary underline">sign in</a> to continue.</div>;
  if (me.role !== "Seller" && me.role !== "Admin") return <div className="px-4 py-8">Access denied. Seller or Admin role required.</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Seller Dashboard</h1>
        <p className="text-sm text-muted-foreground">Create and manage your products.</p>
      </header>

      {message ? (
        <div className="rounded border bg-secondary text-secondary-foreground px-3 py-2 text-sm">{message}</div>
      ) : null}
      {error ? (
        <div className="rounded border border-destructive/50 bg-destructive/10 text-destructive px-3 py-2 text-sm">{error}</div>
      ) : null}

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Add new product</CardTitle>
            <CardDescription>Provide product details and submit to publish.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input id="stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://images.unsplash.com/..." />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create product"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your products</h2>
          <div className="text-sm text-muted-foreground">{products.length} items</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <CardHeader className="p-0">
                <img src={p.imageUrl || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop&auto=format"} alt={p.name} className="h-40 w-full object-cover rounded-t-md" />
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                <div className="font-medium leading-tight">{p.name}</div>
                <div className="text-sm text-muted-foreground">${p.price.toFixed(2)} • Stock: {p.stock}</div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" onClick={() => onUpdate(p, { stock: p.stock + 1 })}>+1 stock</Button>
                <Button variant="outline" onClick={() => onUpdate(p, { stock: Math.max(0, p.stock - 1) })}>-1 stock</Button>
                <Button variant="outline" onClick={() => onUpdate(p, { price: Math.max(0, p.price - 1) })}>- $1</Button>
                <Button variant="destructive" onClick={() => onDelete(p.id)}>Delete</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}