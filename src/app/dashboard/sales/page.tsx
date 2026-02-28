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
  Building2,
  ShoppingBag,
  Lock,
  AlertTriangle,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { usePricing } from "@/hooks/usePricing";
import Cart from "@/components/sales/Cart";
import B2BCart from "@/components/sales/B2BCart";
import AddToCartModal from "@/components/sales/AddToCartModal";
import B2BAddToCartModal from "@/components/sales/B2BAddToCartModal";
import MockIrsaliye from "@/components/sales/MockIrsaliye";
import type {
  Product,
  CartItem,
  B2BCartItem,
  RetailSale,
  B2BSale,
  Firm,
} from "@/types";

type SaleMode = "retail" | "b2b";

export default function SalesPage() {
  // Mode
  const [mode, setMode] = useState<SaleMode>(() => {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "b2b" ? "b2b" : "retail";
  }
  return "retail";
});

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Retail Cart
  const [retailCart, setRetailCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [discountInput, setDiscountInput] = useState("");
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [completedRetailSale, setCompletedRetailSale] =
    useState<RetailSale | null>(null);

  // B2B Cart
  const [b2bCart, setB2BCart] = useState<B2BCartItem[]>([]);
  const [selectedB2BProduct, setSelectedB2BProduct] =
    useState<Product | null>(null);
  const [b2bNote, setB2BNote] = useState("");
  const [completedB2BSale, setCompletedB2BSale] = useState<B2BSale | null>(
    null
  );
  const [irsaliyeSale, setIrsaliyeSale] = useState<B2BSale | null>(null);

  // Firm selection
  const [firms, setFirms] = useState<Firm[]>([]);
  const [firmSearch, setFirmSearch] = useState("");
  const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);
  const [showFirmDropdown, setShowFirmDropdown] = useState(false);

  // Pricing
  const { calcSalePrice, getExchangeRate } = usePricing();

  // ── Fetch Firms ────────────────────────────────────────
  const fetchFirms = useCallback(async () => {
    try {
      const res = await fetch("/api/firms", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.firms) setFirms(data.firms);
    } catch (err) {
      console.error("Failed to fetch firms:", err);
    }
  }, []);

  useEffect(() => {
    fetchFirms();
  }, [fetchFirms]);

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
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(val), 300);
  }

  // ── QR Scan ────────────────────────────────────────────
  useEffect(() => {
  const url = new URL(window.location.href);

  // Read mode from URL (for B2B card on dashboard)
  const urlMode = url.searchParams.get("mode");
  if (urlMode === "b2b") {
    setMode("b2b");
  }

  // QR scan handler
  const productId = url.searchParams.get("product_id");
  if (productId) {
    addByProductId(productId);
  }

  // Clean URL params
  if (urlMode || productId) {
    window.history.replaceState({}, "", "/dashboard/sales");
  }
}, []);

  async function addByProductId(productId: string) {
    try {
      const res = await fetch(`/api/products/search?id=${productId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.products && data.products.length > 0) {
        if (mode === "b2b") {
          setSelectedB2BProduct(data.products[0]);
        } else {
          setSelectedProduct(data.products[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load product by ID:", err);
    }
  }

  // ── Mode Switch ────────────────────────────────────────
  function switchMode(newMode: SaleMode) {
    if (newMode === mode) return;

    // Transfer cart items if switching mid-sale
    if (newMode === "b2b" && retailCart.length > 0) {
      const transferred: B2BCartItem[] = retailCart.map((item) => ({
  id: item.id,
  product_id: item.product_id,
  product_name: item.product_name,
  product_image: item.product_image,
  brand_name: item.brand_name,
  netsis_code: item.netsis_code || null,
  variation_label: item.variation_label,
  quantity: item.quantity,
  price_type: item.price_type,
}));
      setB2BCart(transferred);
      setRetailCart([]);
    } else if (newMode === "retail" && b2bCart.length > 0) {
      // Can't transfer B2B to retail easily (no pricing), just warn
      if (
        !confirm(
          "Switching to retail will clear B2B cart (no prices assigned). Continue?"
        )
      ) {
        return;
      }
      setB2BCart([]);
    }

    setMode(newMode);
    setSearchQuery("");
    setSearchResults([]);
  }

  // ── Retail Cart Ops ────────────────────────────────────
  function addToRetailCart(item: CartItem) {
    setRetailCart((prev) => [...prev, item]);
    setTimeout(() => searchRef.current?.focus(), 100);
  }

  function updateRetailQty(itemId: string, quantity: number) {
    setRetailCart((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newLineTotal =
          Math.round(item.unit_price_try * quantity * 100) / 100;
        return { ...item, quantity, line_total: newLineTotal };
      })
    );
  }

  function removeRetailItem(itemId: string) {
    setRetailCart((prev) => prev.filter((item) => item.id !== itemId));
  }

  // ── B2B Cart Ops ───────────────────────────────────────
  function addToB2BCart(item: B2BCartItem) {
    setB2BCart((prev) => [...prev, item]);
    setTimeout(() => searchRef.current?.focus(), 100);
  }

  function updateB2BQty(itemId: string, quantity: number) {
    setB2BCart((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  }

  function removeB2BItem(itemId: string) {
    setB2BCart((prev) => prev.filter((item) => item.id !== itemId));
  }

  // ── Retail Checkout ────────────────────────────────────
  const retailSubtotal = retailCart.reduce(
    (sum, item) => sum + item.line_total,
    0
  );
  const retailDiscount = parseFloat(discountInput) || 0;
  const retailTotal = Math.max(
    0,
    Math.round((retailSubtotal - retailDiscount) * 100) / 100
  );

  async function handleRetailCheckout(paymentMethod: "cash" | "card") {
    if (retailCart.length === 0) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: retailCart.map((item) => ({
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
          discount_amount: retailDiscount,
          notes: checkoutNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to complete sale");
        setProcessing(false);
        return;
      }
      setCompletedRetailSale(data.sale);
      setRetailCart([]);
      setDiscountInput("");
      setCheckoutNotes("");
      setSearchQuery("");
      setSearchResults([]);
    } catch {
      alert("Something went wrong");
    }
    setProcessing(false);
  }

  // ── B2B Checkout ───────────────────────────────────────
  async function handleB2BCheckout() {
    if (b2bCart.length === 0 || !selectedFirm) return;

    if (selectedFirm.is_locked) {
      alert(
        `${selectedFirm.name} is LOCKED: ${selectedFirm.lock_reason || "Payment issue"}. Cannot create order.`
      );
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch("/api/b2b-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firm_id: selectedFirm.id,
          firm_name: selectedFirm.name,
          items: b2bCart.map((item) => ({
  product_id: item.product_id,
  product_name: item.product_name,
  product_image: item.product_image,
  brand_name: item.brand_name,
  netsis_code: item.netsis_code,
  variation_label: item.variation_label,
  quantity: item.quantity,
  price_type: item.price_type,
})),
          note: b2bNote.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create order");
        setProcessing(false);
        return;
      }
      setCompletedB2BSale(data.sale);
      setB2BCart([]);
      setB2BNote("");
      setSelectedFirm(null);
      setFirmSearch("");
      setSearchQuery("");
      setSearchResults([]);
    } catch {
      alert("Something went wrong");
    }
    setProcessing(false);
  }

  // ── Firm dropdown filter ───────────────────────────────
  const filteredFirms = firms.filter((f) =>
    f.name.toLowerCase().includes(firmSearch.toLowerCase())
  );

  function selectFirm(firm: Firm) {
    if (firm.is_locked) {
      alert(
        `${firm.name} is LOCKED: ${firm.lock_reason || "Payment issue"}. You cannot create orders for this firm.`
      );
      return;
    }
    setSelectedFirm(firm);
    setFirmSearch(firm.name);
    setShowFirmDropdown(false);
  }

  // ── Completed Sale Screens ─────────────────────────────
  if (completedRetailSale) {
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
            Sale #{completedRetailSale.sale_number}
          </p>
          <div className="bg-hub-bg/50 rounded-xl p-4 space-y-2 mb-6 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-hub-secondary">Total</span>
              <span className="font-bold text-hub-accent">
                ₺{Number(completedRetailSale.total).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-hub-muted">Payment</span>
              <span className="text-hub-primary font-medium capitalize">
                {completedRetailSale.payment_method === "cash"
                  ? "💵 Cash"
                  : "💳 Card"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-hub-muted">Employee</span>
              <span className="text-hub-primary font-medium">
                {completedRetailSale.employee_username}
              </span>
            </div>
          </div>
          <button
            onClick={() => setCompletedRetailSale(null)}
            className="btn-primary w-full"
          >
            New Sale
          </button>
        </div>
      </div>
    );
  }

  if (completedB2BSale) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-hub-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-hub-success" />
          </div>
          <h2 className="text-xl font-semibold text-hub-primary mb-1">
            B2B Order Created!
          </h2>
          <p className="text-sm text-hub-secondary mb-1">
            Order #{completedB2BSale.sale_number}
          </p>
          <p className="text-sm font-medium text-hub-accent mb-6">
            {completedB2BSale.firm_name}
          </p>
          <div className="bg-hub-bg/50 rounded-xl p-4 space-y-2 mb-6 text-left">
            <div className="flex justify-between text-xs">
              <span className="text-hub-muted">Items</span>
              <span className="text-hub-primary font-medium">
                {completedB2BSale.items?.length || 0} product
                {(completedB2BSale.items?.length || 0) !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-hub-muted">Employee</span>
              <span className="text-hub-primary font-medium">
                {completedB2BSale.employee_username}
              </span>
            </div>
            {completedB2BSale.note && (
              <div className="flex justify-between text-xs">
                <span className="text-hub-muted">Note</span>
                <span className="text-hub-primary font-medium">
                  {completedB2BSale.note}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setCompletedB2BSale(null)}
              className="btn-primary flex-1"
            >
              New Order
            </button>
            <button
              onClick={() => {
                // Mock irsaliye — Part 6E
                setIrsaliyeSale(completedB2BSale);
              }}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              İrsaliye
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Layout ────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header with Mode Switch */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Mode Toggle */}
        <div className="flex items-center bg-hub-bg rounded-xl p-1 gap-1">
          <button
            onClick={() => switchMode("retail")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === "retail"
                ? "bg-white text-hub-accent shadow-hub"
                : "text-hub-secondary hover:text-hub-primary"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Retail
          </button>
          <button
            onClick={() => switchMode("b2b")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === "b2b"
                ? "bg-white text-hub-accent shadow-hub"
                : "text-hub-secondary hover:text-hub-primary"
            }`}
          >
            <Building2 className="w-4 h-4" />
            B2B
          </button>
        </div>

        <div className="flex-1" />

        <Link
          href="/dashboard/sales/history"
          className="btn-secondary flex items-center gap-2 text-sm py-2"
        >
          <Search className="w-3.5 h-3.5" />
          History
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── LEFT: Search + Results ──────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Firm Selector (B2B only) */}
          {mode === "b2b" && (
            <div className="card p-4">
              <label className="label-base">Firm *</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-hub-muted" />
                <input
                  type="text"
                  value={firmSearch}
                  onChange={(e) => {
                    setFirmSearch(e.target.value);
                    setShowFirmDropdown(true);
                    if (selectedFirm && e.target.value !== selectedFirm.name) {
                      setSelectedFirm(null);
                    }
                  }}
                  onFocus={() => setShowFirmDropdown(true)}
                  className="input-base pl-11"
                  placeholder="Type firm name..."
                />
                {selectedFirm && (
                  <button
                    onClick={() => {
                      setSelectedFirm(null);
                      setFirmSearch("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-hub-muted hover:text-hub-primary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Dropdown */}
                {showFirmDropdown && firmSearch && !selectedFirm && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-hub-border/50 shadow-hub-lg max-h-[200px] overflow-y-auto">
                    {filteredFirms.length === 0 ? (
                      <div className="p-3 text-sm text-hub-muted text-center">
                        No firms found
                      </div>
                    ) : (
                      filteredFirms.map((firm) => (
                        <button
                          key={firm.id}
                          onClick={() => selectFirm(firm)}
                          className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-hub-bg/50 transition-colors ${
                            firm.is_locked ? "opacity-50" : ""
                          }`}
                        >
                          {firm.is_locked ? (
                            <Lock className="w-4 h-4 text-hub-error flex-shrink-0" />
                          ) : (
                            <Building2 className="w-4 h-4 text-hub-accent flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium truncate ${
                                firm.is_locked
                                  ? "text-hub-error/70"
                                  : "text-hub-primary"
                              }`}
                            >
                              {firm.name}
                            </p>
                            {firm.is_locked && (
                              <p className="text-[10px] text-hub-error flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {firm.lock_reason || "Locked"}
                              </p>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {selectedFirm && (
                <div className="mt-2 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-hub-success" />
                  <span className="text-xs text-hub-success font-medium">
                    {selectedFirm.name} selected
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Product Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-hub-muted" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input-base pl-11 pr-10"
              placeholder="Search products by name..."
              autoFocus={mode === "retail"}
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

          {/* Results */}
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
                  onClick={() =>
                    mode === "b2b"
                      ? setSelectedB2BProduct(product)
                      : setSelectedProduct(product)
                  }
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

          {!searching &&
            searchQuery.length < 2 &&
            retailCart.length === 0 &&
            b2bCart.length === 0 && (
              <div className="card p-12 text-center">
                <Search className="w-10 h-10 text-hub-muted/20 mx-auto mb-3" />
                <p className="text-hub-secondary text-sm">
                  {mode === "b2b"
                    ? "Select a firm above, then search products"
                    : "Start typing to search products"}
                </p>
              </div>
            )}
        </div>

        {/* ── RIGHT: Cart + Checkout ─────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {mode === "retail" ? (
            <>
              <Cart
                items={retailCart}
                onUpdateQuantity={updateRetailQty}
                onRemoveItem={removeRetailItem}
                onClearCart={() => setRetailCart([])}
              />

              {retailCart.length > 0 && (
                <div className="card p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-hub-secondary">Subtotal</span>
                      <span className="font-medium text-hub-primary">
                        ₺{retailSubtotal.toFixed(2)}
                      </span>
                    </div>
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
                    <div className="pt-2 border-t border-hub-border/30 flex justify-between items-center">
                      <span className="text-base font-semibold text-hub-primary">
                        Total
                      </span>
                      <span className="text-xl font-bold text-hub-accent">
                        ₺{retailTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={checkoutNotes}
                    onChange={(e) => setCheckoutNotes(e.target.value)}
                    className="input-base text-sm py-2"
                    placeholder="Sale notes (optional)"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleRetailCheckout("cash")}
                      disabled={processing}
                      className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-hub-success text-white font-medium text-sm hover:bg-hub-success/90 transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                      <Banknote className="w-4 h-4" />
                      Cash
                    </button>
                    <button
                      onClick={() => handleRetailCheckout("card")}
                      disabled={processing}
                      className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                      <CreditCard className="w-4 h-4" />
                      Card
                    </button>
                  </div>
                  {processing && (
                    <div className="flex items-center justify-center gap-2 text-sm text-hub-secondary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <B2BCart
                items={b2bCart}
                onUpdateQuantity={updateB2BQty}
                onRemoveItem={removeB2BItem}
                onClearCart={() => setB2BCart([])}
              />

              {b2bCart.length > 0 && (
                <div className="card p-5 space-y-4">
                  <input
                    type="text"
                    value={b2bNote}
                    onChange={(e) => setB2BNote(e.target.value)}
                    className="input-base text-sm"
                    placeholder="Note (employee name, section, etc.)"
                  />
                  <button
                    onClick={handleB2BCheckout}
                    disabled={processing || !selectedFirm}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Building2 className="w-4 h-4" />
                    )}
                    {processing
                      ? "Creating..."
                      : !selectedFirm
                      ? "Select a Firm First"
                      : `Create Order for ${selectedFirm.name}`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddToCartModal
        product={selectedProduct}
        calcSalePrice={calcSalePrice}
        getExchangeRate={getExchangeRate}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToRetailCart}
      />

      <B2BAddToCartModal
        product={selectedB2BProduct}
        onClose={() => setSelectedB2BProduct(null)}
        onAddToCart={addToB2BCart}
      />
      <MockIrsaliye
  sale={irsaliyeSale}
  onClose={() => setIrsaliyeSale(null)}
/>
    </div>
  );
}