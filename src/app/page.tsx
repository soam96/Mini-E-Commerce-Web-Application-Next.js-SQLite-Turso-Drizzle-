"use client"

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// Types
type Role = "Customer" | "Seller" | "Admin";

type User = {
  id: number;
  username: string;
  email: string;
  role: Role;
};

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  description?: string | null;
  seller?: { id: number; username: string } | null;
};

type CartItem = {
  product: Product;
  quantity: number;
};

export default function HomePage() {
  const [me, setMe] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Login/Register dialog state
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  // Forms
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<Role>("Customer");

  // Load current user
  useEffect(() => {
    const loadMe = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) return setMe(null);
        const data = await res.json();
        if (data?.success && data?.data) setMe(data.data as User);
      } catch (_) {
        setMe(null);
      }
    };
    loadMe();
  }, []);

  // Load products
  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (minPrice.trim()) params.set("minPrice", minPrice.trim());
      if (maxPrice.trim()) params.set("maxPrice", maxPrice.trim());
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (data?.success) setProducts(data.data as Product[]);
      else setError(data?.error || "Failed to load products");
    } catch (e) {
      setError("Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotal = useMemo(
    () => cart.reduce((sum, ci) => sum + ci.product.price * ci.quantity, 0),
    [cart]
  );

  // Auth actions
  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg: string = data?.error || "Login failed";
        if (res.status === 404 || /not found|no account|register/i.test(msg)) {
          // If user doesn't exist, guide them to register and prefill email
          setError(null);
          setLoginOpen(false);
          setRegEmail(loginEmail);
          setRegisterOpen(true);
          setMessage("No account found. Please register to continue.");
          return;
        }
        throw new Error(msg);
      }
      // Immediately verify session from server to ensure cookie is recognized
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData?.success && meData?.data) setMe(meData.data as User);
      } else {
        setMe(data.data as User);
      }
      setLoginOpen(false);
      setMessage("Logged in successfully");
    } catch (e: any) {
      setError(e.message || "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          password: regPassword,
          role: regRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Registration failed");
      // Immediately verify session from server to ensure cookie is recognized
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData?.success && meData?.data) setMe(meData.data as User);
      } else {
        setMe(data.data as User);
      }
      setRegisterOpen(false);
      setMessage("Registered successfully");
    } catch (e: any) {
      setError(e.message || "Registration failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const onLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    setMe(null);
    setMessage("Logged out");
  };

  // Cart actions
  const addToCart = (product: Product) => {
    setCartOpen(true);
    setCart((prev) => {
      const idx = prev.findIndex((ci) => ci.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        const existing = next[idx];
        const newQty = Math.min((existing.quantity || 0) + 1, product.stock);
        next[idx] = { ...existing, quantity: newQty };
        return next;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: number, qty: number) => {
    setCart((prev) =>
      prev
        .map((ci) =>
          ci.product.id === productId
            ? { ...ci, quantity: Math.max(1, Math.min(qty, ci.product.stock)) }
            : ci
        )
        .filter((ci) => ci.quantity > 0)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((ci) => ci.product.id !== productId));
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setPlacingOrder(true);
    setError(null);
    setMessage(null);
    try {
      const items = cart.map((ci) => ({ product_id: ci.product.id, quantity: ci.quantity }));
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setLoginOpen(true);
          setCartOpen(true);
          throw new Error("Please login to place order");
        }
        throw new Error(data?.error || "Order failed");
      }
      setCart([]);
      setCartOpen(false);
      setMessage("Order placed successfully");
      // Refresh products to update stock
      fetchProducts();
    } catch (e: any) {
      setError(e.message || "Order failed");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1557821552-17105176677c?w=64&h=64&fit=crop&auto=format"
              alt="Logo"
              className="size-8 rounded"
            />
            <span className="font-semibold text-lg">Mini E‑Commerce</span>
          </div>

          <div className="ml-6 hidden md:flex items-center gap-2 flex-1">
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Input
              placeholder="Min ₹"
              inputMode="decimal"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-28"
            />
            <Input
              placeholder="Max ₹"
              inputMode="decimal"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-28"
            />
            <Button onClick={fetchProducts} variant="secondary">Filter</Button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {me ? (
              <div className="hidden sm:flex items-center gap-2 mr-2">
                <span className="text-sm text-muted-foreground">Hello,</span>
                <span className="text-sm font-medium">{me.username}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{me.role}</span>
              </div>
            ) : null}

            {/* Cart */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline">
                  Cart ({cart.reduce((n, ci) => n + ci.quantity, 0)})
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Your Cart</SheetTitle>
                  <SheetDescription>Review items and place your order.</SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-3 max-h-[70vh] overflow-auto pr-1">
                  {cart.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Your cart is empty.</p>
                  ) : (
                    cart.map((ci) => (
                      <Card key={ci.product.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <img
                              src={
                                ci.product.imageUrl ||
                                "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop&auto=format"
                              }
                              alt={ci.product.name}
                              className="size-16 rounded object-cover"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-medium leading-tight">{ci.product.name}</div>
                                  <div className="text-xs text-muted-foreground">₹{ci.product.price.toFixed(2)}</div>
                                </div>
                                <Button variant="ghost" onClick={() => removeFromCart(ci.product.id)}>Remove</Button>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <Label htmlFor={`qty-${ci.product.id}`} className="text-xs">Qty</Label>
                                <Input
                                  id={`qty-${ci.product.id}`}
                                  type="number"
                                  min={1}
                                  max={ci.product.stock}
                                  value={ci.quantity}
                                  onChange={(e) => updateQty(ci.product.id, Number(e.target.value || 1))}
                                  className="w-24 h-8"
                                />
                                <div className="ml-auto text-sm font-medium">₹{(ci.product.price * ci.quantity).toFixed(2)}</div>
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">In stock: {ci.product.stock}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="text-lg font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                <Button 
                  className="mt-4 w-full" 
                  disabled={cart.length === 0 || placingOrder}
                  onClick={() => {
                    if (placingOrder || cart.length === 0) return;
                    if (me) {
                      placeOrder();
                    } else {
                      setLoginOpen(true);
                    }
                  }}
                >
                  {placingOrder ? "Placing order..." : me ? "Place Order" : "Login to order"}
                </Button>
              </SheetContent>
            </Sheet>

            {/* Auth controls */}
            {me ? (
              <Button variant="outline" onClick={onLogout}>Logout</Button>
            ) : (
              <div className="flex items-center gap-2">
                <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Login</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Login</DialogTitle>
                      <DialogDescription>Access your account to place orders and manage products.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onLogin} className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input id="login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                      </div>
                      <DialogFooter className="gap-2">
                        <DialogClose asChild>
                          <Button type="button" variant="ghost">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={authLoading}>{authLoading ? "Signing in..." : "Sign in"}</Button>
                      </DialogFooter>
                    </form>
                    <div className="mt-2 text-sm text-muted-foreground">
                      No account?
                      <button
                        type="button"
                        onClick={() => {
                          setLoginOpen(false);
                          setRegEmail(loginEmail);
                          setRegisterOpen(true);
                        }}
                        className="ml-1 text-primary underline"
                      >
                        Register
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
                  <DialogTrigger asChild>
                    <Button>Register</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create account</DialogTitle>
                      <DialogDescription>Register as Customer, Seller, or Admin (for demo).</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onRegister} className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="reg-username">Username</Label>
                        <Input id="reg-username" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-email">Email</Label>
                        <Input id="reg-email" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-password">Password</Label>
                        <Input id="reg-password" type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={regRole} onValueChange={(v) => setRegRole(v as Role)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Customer">Customer</SelectItem>
                            <SelectItem value="Seller">Seller</SelectItem>
                            <SelectItem value="Admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter className="gap-2">
                        <DialogClose asChild>
                          <Button type="button" variant="ghost">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={authLoading}>{authLoading ? "Creating..." : "Create account"}</Button>
                      </DialogFooter>
                    </form>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Already have an account?
                      <button
                        type="button"
                        onClick={() => {
                          setRegisterOpen(false);
                          setLoginEmail(regEmail);
                          setLoginOpen(true);
                        }}
                        className="ml-1 text-primary underline"
                      >
                        Login
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>
        {/* Compact filters on small screens */}
        <div className="md:hidden px-4 pb-3 grid grid-cols-2 gap-2">
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex gap-2">
            <Input placeholder="Min ₹" inputMode="decimal" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
            <Input placeholder="Max ₹" inputMode="decimal" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={fetchProducts} className="col-span-2">Filter</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Flash messages */}
        {message ? (
          <div className="mb-4 rounded-md border bg-secondary text-secondary-foreground px-4 py-2 text-sm">{message}</div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 text-destructive px-4 py-2 text-sm">{error}</div>
        ) : null}

        {/* Role-based shortcuts */}
        {me ? (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Shortcuts:</span>
            {me.role === "Customer" && (
              <Button variant="outline" onClick={() => setCartOpen(true)}>View Cart</Button>
            )}
            {me.role === "Seller" && (
              <Button variant="outline" disabled title="Coming soon">Seller Dashboard</Button>
            )}
            {me.role === "Admin" && (
              <>
                <Button variant="outline" disabled title="Coming soon">Admin Panel</Button>
                <Button variant="outline" disabled title="Coming soon">Manage Orders</Button>
              </>
            )}
          </div>
        ) : null}

        {/* Products grid */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold">Products</h2>
              <p className="text-sm text-muted-foreground">Browse and add items to your cart.</p>
            </div>
            <div className="text-sm text-muted-foreground">
              {productsLoading ? "Loading..." : `${products.length} items`}
            </div>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="h-64 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <Card key={p.id} className="flex flex-col">
                  <CardHeader className="p-0">
                    <img
                      src={
                        p.imageUrl ||
                        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop&auto=format"
                      }
                      alt={p.name}
                      className="h-40 w-full object-cover rounded-t-md"
                    />
                  </CardHeader>
                  <CardContent className="flex-1 pt-4">
                    <CardTitle className="text-base leading-tight line-clamp-2">{p.name}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1 min-h-9">
                      {p.description || "No description provided."}
                    </CardDescription>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-lg font-semibold">₹{p.price.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Stock: {p.stock}</div>
                    </div>
                    {p.seller?.username ? (
                      <div className="mt-1 text-xs text-muted-foreground">Seller: {p.seller.username}</div>
                    ) : null}
                  </CardContent>
                  <CardFooter className="flex items-center gap-2">
                    <Button className="w-full" onClick={() => addToCart(p)} disabled={p.stock <= 0}>
                      {p.stock > 0 ? "Add to Cart" : "Out of Stock"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="mt-10 border-t">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground flex items-center justify-between">
          <p>© {new Date().getFullYear()} Mini E‑Commerce</p>
          <p>Built with Next.js + shadcn/ui</p>
        </div>
      </footer>
    </div>
  );
}