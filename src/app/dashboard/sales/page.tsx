"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Search,
  Package,
  Loader2,
  CreditCard,
  Banknote,
  CheckCircle2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePricing } from "@/hooks/usePricing";
import Cart from "@/components/sales/Cart";
import AddToCartModal from "@/components/sales/AddToCartModal";
import type { Product, CartItem, RetailSale } from "@/types";

export default function SalesPage() {
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Add to cart modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Checkout
  const [discountInput, setDiscountInput] = useState("");
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<RetailSale | null>(null);

  // Pricing
  const { calcSalePrice, getExchangeRate } = usePricing();

  // Search input ref
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Search ─────────────────────────────────────────────
  const doSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(
        `/api/products/search?q=${encodeURIComponent(query)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setSearchResults(data.products || []);
    } catch (err) {
      console.error("Search failed:", err);
    }
    setSearching(false);
  }, []);

  function handleSearchChange(val: string) {
    setSearchQuery(val);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      doSearch(val);
    }, 300);
  }

  // ── QR Scan URL handler ────────────────────────────────
  useEffect(() => {
    const url = new URL(window.location.href);
    const productId = url.searchParams.get("product_id");
    if (productId) {
      addByProductId(productId);
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/sales");
    }
  }, []);

  async function addByProductId(productId: string) {
    try {
      const res = await fetch(
        `/api/products/search?id=${productId}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data.products && data.products.length > 0) {
        setSelectedProduct(data.products[0]);
      }
    } catch (err) {
      console.error("Failed to load product by ID:", err);
    }
  }

  // ── Cart Operations ────────────────────────────────────
  function addToCart(item: CartItem) {
    setCart((prev) => [...prev, item]);
    // Refocus search
    setTimeout(() => searchRef.current?.focus(), 100);
  }

  function updateCartQuantity(itemId: string, quantity: number) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newLineTotal =
          Math.round(item.unit_price_try * quantity * 100) / 100;
        return { ...item, quantity, line_total: newLineTotal };
      })
    );
  }

  function removeCartItem(itemId: string) {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  }

  function clearCart() {
    setCart([]);
  }

  // ── Totals ─────────────────────────────────────────────
  const subtotal = cart.reduce((sum, item) => sum + item.line_total, 0);
  const discountAmount = parseFloat(discountInput) || 0;
  const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

  // ── Checkout ───────────────────────────────────────────
  async function handleCheckout(paymentMethod: "cash" | "card") {
    if (cart.length === 0) return;

    setProcessing(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            product_image: item.product_image,
            brand_name: item.brand_name,
            variation_label: item.variation_label,
            quantity: item.quantity,
            unit_price: item.unit_price,
            price_type: item.price_type,
            currency: item.currency,
            exchange_rate: item.exchange_rate,
            unit_price_try: item.unit_price_try,
          })),
          payment_method: paymentMethod,
          discount_amount: discountAmount,
          notes: checkoutNotes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to complete sale");
        setProcessing(false);
        return;
      }

      setCompletedSale(data.sale);
      setCart([]);
      setDiscountInput("");
      setCheckoutNotes("");
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      console.error("Checkout failed:", err);
      alert("Something went wrong");
    }
    setProcessing(false);
  }

  // ── Completed Sale Modal ───────────────────────────────
  if (completedSale) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-hub-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-hub-success" />
          </div>
          <h2 className="text-xl font-semibold text-hub-primary mb-1">
            Sale Complete!
          </h2>
          <p className="text-sm text-hub-secondary mb-6">
            Sale #{completedSale.sale_number}
          </p>

          <div className="bg-hub-bg/50 rounded-xl p-4 space-y-2 mb-6 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-hub-secondary">Subtotal</span>
              <span className="text-hub-primary font-medium">
                ₺{Number(completedSale.subtotal).toFixed(2)}
              </span>
            </div>
            {Number(completedSale.discount_amount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-hub-secondary">Discount</span>
                <span className="text-hub-error font-medium">
                  -₺{Number(completedSale.discount_amount).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-base pt-2 border-t border-hub-border/30">
              <span className="font-semibold text-hub-primary">Total</span>
              <span className="font-bold text-hub-accent">
                ₺{Number(completedSale.total).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs pt-1">
              <span className="text-hub-muted">Payment</span>
              <span className="text-hub-primary font-medium capitalize">
                {completedSale.payment_method === "cash" ? "💵 Cash" : "💳 Card"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-hub-muted">Employee</span>
              <span className="text-hub-primary font-medium">
                {completedSale.employee_username}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setCompletedSale(null)}
              className="btn-primary flex-1"
            >
              New Sale
            </button>
            <Link
              href="/dashboard/reports"
              className="btn-secondary flex-1 flex items-center justify-center"
            >
              Reports
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-hub-primary">
            Retail Sale
          </h1>
          <p className="text-sm text-hub-secondary mt-0.5">
            Search products or scan QR codes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── LEFT: Search + Results ──────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-hub-muted" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input-base pl-11 pr-10"
              placeholder="Search products by name..."
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  searchRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-hub-muted hover:text-hub-primary rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Results */}
          {searching && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-hub-muted" />
            </div>
          )}

          {!searching && searchResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="card p-4 text-left hover:shadow-hub-md hover:border-hub-accent/30 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-hub-bg overflow-hidden flex-shrink-0">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-hub-muted/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-hub-primary truncate group-hover:text-hub-accent transition-colors">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {product.brand &&
                          typeof product.brand === "object" && (
                            <span className="text-[9px] font-medium text-hub-accent bg-hub-accent/10 px-1.5 py-0.5 rounded-full">
                              {(product.brand as { name: string }).name}
                            </span>
                          )}
                        {product.variations &&
                          product.variations.length > 0 && (
                            <span className="text-[9px] text-hub-secondary">
                              {product.variations.length} var
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!searching &&
            searchQuery.length >= 2 &&
            searchResults.length === 0 && (
              <div className="card p-8 text-center">
                <Package className="w-8 h-8 text-hub-muted/30 mx-auto mb-2" />
                <p className="text-sm text-hub-secondary">
                  No products found for &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            )}

          {!searching && searchQuery.length < 2 && cart.length === 0 && (
            <div className="card p-12 text-center">
              <Search className="w-10 h-10 text-hub-muted/20 mx-auto mb-3" />
              <p className="text-hub-secondary text-sm">
                Start typing to search products
              </p>
              <p className="text-[11px] text-hub-muted mt-1">
                Or scan a product QR code with your camera
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Cart + Checkout ─────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Cart */}
          <Cart
            items={cart}
            onUpdateQuantity={updateCartQuantity}
            onRemoveItem={removeCartItem}
            onClearCart={clearCart}
          />

          {/* Checkout Panel */}
          {cart.length > 0 && (
            <div className="card p-5 space-y-4">
              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-hub-secondary">Subtotal</span>
                  <span className="font-medium text-hub-primary">
                    ₺{subtotal.toFixed(2)}
                  </span>
                </div>

                {/* Discount */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-hub-secondary flex-shrink-0">
                    Discount
                  </span>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-hub-muted">
                      ₺
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-hub-border/50 bg-hub-bg/30 text-sm text-hub-primary text-right focus:outline-none focus:ring-1 focus:ring-hub-accent/20"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="pt-2 border-t border-hub-border/30 flex justify-between items-center">
                  <span className="text-base font-semibold text-hub-primary">
                    Total
                  </span>
                  <span className="text-xl font-bold text-hub-accent">
                    ₺{total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <input
                type="text"
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                className="input-base text-sm py-2"
                placeholder="Sale notes (optional)"
              />

              {/* Payment Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleCheckout("cash")}
                  disabled={processing || cart.length === 0}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-hub-success text-white font-medium text-sm hover:bg-hub-success/90 transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  <Banknote className="w-4 h-4" />
                  Cash
                </button>
                <button
                  onClick={() => handleCheckout("card")}
                  disabled={processing || cart.length === 0}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  <CreditCard className="w-4 h-4" />
                  Card
                </button>
              </div>

              {processing && (
                <div className="flex items-center justify-center gap-2 text-sm text-hub-secondary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing sale...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add to Cart Modal */}
      <AddToCartModal
        product={selectedProduct}
        calcSalePrice={calcSalePrice}
        getExchangeRate={getExchangeRate}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
      />
    </div>
  );
}