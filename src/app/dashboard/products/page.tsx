"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Package, Plus, Loader2, Search } from "lucide-react";
import Link from "next/link";
import type { AuthUser, Product } from "@/types";
import ProductForm from "@/components/products/ProductForm";

export default function ProductsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchUser();
    fetchProducts();
  }, []);

  async function fetchUser() {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      if (data.user) setUser(data.user);
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  }

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.products) setProducts(data.products);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
    setLoading(false);
  }

  function handleCreateClick() {
    if (!user || user.username !== "berkay") {
      alert(
        "Unauthorized. Please leave a message with the product you want to create in the message section."
      );
      return;
    }
    setShowCreate(true);
  }

  function handleProductCreated() {
    setShowCreate(false);
    fetchProducts();
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (showCreate && user?.username === "berkay") {
    return (
      <ProductForm
        onBack={() => setShowCreate(false)}
        onCreated={handleProductCreated}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-hub-primary">Products</h1>
          <p className="text-sm text-hub-secondary mt-0.5">
            {products.length} product{products.length !== 1 ? "s" : ""} in catalog
          </p>
        </div>
        <button
          onClick={handleCreateClick}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Product
        </button>
      </div>

      {/* Search */}
      {products.length > 0 && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-hub-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-11"
            placeholder="Search products..."
          />
        </div>
      )}

      {/* Product List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-hub-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-10 h-10 text-hub-muted/40 mx-auto mb-3" />
          <p className="text-hub-secondary">
            {search
              ? "No products match your search"
              : "No products yet. Start building your catalog!"}
          </p>
          {!search && (
            <button
              onClick={handleCreateClick}
              className="text-sm text-hub-accent hover:text-hub-accent-hover mt-2 font-medium"
            >
              Create your first product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => (
            <Link
              key={product.id}
              href={`/dashboard/products/${product.id}`}
              className="card p-4 hover:shadow-hub-md transition-all duration-300 group cursor-pointer hover:border-hub-accent/30"
            >
              {/* Image */}
              <div className="w-full aspect-square rounded-xl bg-hub-bg mb-3 overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-8 h-8 text-hub-muted/30" />
                  </div>
                )}
              </div>

              {/* Info */}
              <h3 className="text-sm font-semibold text-hub-primary truncate">
                {product.name}
              </h3>

              <div className="flex items-center gap-2 mt-1">
                {product.brand && (
                  <span className="text-[10px] font-medium text-hub-accent bg-hub-accent/10 px-2 py-0.5 rounded-full">
                    {product.brand.name}
                  </span>
                )}
                {product.netsis_code && (
                  <span className="text-[10px] text-hub-muted">
                    {product.netsis_code}
                  </span>
                )}
              </div>

              {/* Price */}
<div className="mt-2 pt-2 border-t border-hub-border/30">
  {(() => {
    const { price, currency, symbol, hasVariationPrices } =
      calculateSalePrice(product);

    if (hasVariationPrices && price === 0) {
      return (
        <div className="flex items-center justify-between">
          <span className="text-xs text-hub-secondary">Pricing</span>
          <span className="text-[11px] font-medium text-hub-accent">
            Per variation
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between">
        <span className="text-xs text-hub-secondary">Sale Price</span>
        <div className="text-right">
          <span className="text-sm font-semibold text-hub-primary">
            {symbol}{price.toFixed(2)}
          </span>
          {currency !== "TRY" && (
            <span className="text-[10px] text-hub-muted block">
              {currency}
            </span>
          )}
        </div>
      </div>
    );
  })()}
</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Pricing helper — used for display in product cards
function calculateSalePrice(product: Product): {
  price: number;
  currency: string;
  symbol: string;
  hasVariationPrices: boolean;
} {
  const lp = Number(product.list_price) || 0;
  const disc = Number(product.discount_percent) || 0;
  const profit = Number(product.profit_percent) || 0;
  const kdv = Number(product.kdv_percent) || 0;

  const buyPrice = lp * (1 - disc / 100);
  const withProfit = buyPrice * (1 + profit / 100);
  const withKdv = withProfit * (1 + kdv / 100);

  const symbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

  // Check if product has variations (from the joined data)
  const hasVariationPrices =
    Array.isArray(product.variations) &&
    product.variations.some((v) => v.has_custom_price);

  return {
    price: withKdv,
    currency: product.currency,
    symbol: symbols[product.currency] || "₺",
    hasVariationPrices,
  };
}