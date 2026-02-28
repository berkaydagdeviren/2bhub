"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  ArrowLeftRight,
  Package,
  Search,
  Layers,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type { B2BSaleItem, Product, ProductVariation } from "@/types";

interface B2BSwapModalProps {
  item: {
    saleId: string;
    item: B2BSaleItem;
  } | null;
  onClose: () => void;
  onCompleted: () => void;
}

export default function B2BSwapModal({
  item,
  onClose,
  onCompleted,
}: B2BSwapModalProps) {
  // Return qty
  const [returnQty, setReturnQty] = useState("");

  // New product search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Selected replacement
  const [newProduct, setNewProduct] = useState<Product | null>(null);
  const [newVariation, setNewVariation] = useState<ProductVariation | null>(null);
  const [newQty, setNewQty] = useState("");
  const [newPriceType, setNewPriceType] = useState<"price1" | "price2">("price1");
  const [swapNote, setSwapNote] = useState("");

  // Processing
  const [processing, setProcessing] = useState(false);

  // Reset when item changes
  useEffect(() => {
    if (item) {
      const remaining =
        Number(item.item.quantity) - Number(item.item.returned_quantity);
      setReturnQty(String(remaining));
      setSearchQuery("");
      setSearchResults([]);
      setNewProduct(null);
      setNewVariation(null);
      setNewQty(String(remaining));
      setNewPriceType(item.item.price_type || "price1");
      setSwapNote("");
    }
  }, [item]);

  // Search
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

  function selectProduct(product: Product) {
    setNewProduct(product);
    setNewVariation(null);
    setSearchQuery("");
    setSearchResults([]);
  }

  if (!item) return null;

  const qty = Number(item.item.quantity);
  const returned = Number(item.item.returned_quantity);
  const remaining = qty - returned;

  const hasVariations =
    newProduct?.variations && newProduct.variations.length > 0;
  const hasPrice2 = newProduct?.has_price2 || false;

  async function handleSwap() {
    const retAmount = parseFloat(returnQty);
    if (isNaN(retAmount) || retAmount <= 0) {
      alert("Enter a valid return quantity");
      return;
    }
    if (retAmount > remaining) {
      alert(`Cannot return more than ${remaining}`);
      return;
    }
    if (!newProduct) {
      alert("Select a replacement product");
      return;
    }
    if (hasVariations && !newVariation) {
      alert("Select a variation for the replacement");
      return;
    }

    const swapQty = parseFloat(newQty);
    if (isNaN(swapQty) || swapQty <= 0) {
      alert("Enter replacement quantity");
      return;
    }

    const brandName =
      newProduct.brand && typeof newProduct.brand === "object"
        ? (newProduct.brand as { name: string }).name
        : null;

    setProcessing(true);
    try {
      const res = await fetch(`/api/b2b-sales/${item?.saleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "swap",
          item_id: item?.item.id,
          return_quantity: retAmount,
          new_product: {
            product_id: newProduct.id,
            product_name: newProduct.name,
            product_image: newProduct.image_url,
            brand_name: brandName,
            netsis_code: newProduct.netsis_code,
            variation_label: newVariation?.variation_label || null,
            quantity: swapQty,
            price_type: newPriceType,
            swap_note: swapNote.trim() || `Swapped from ${item?.item.product_name}${item?.item.variation_label ? " (" + item.item.variation_label + ")" : ""}`,
          },
        }),
      });

      if (res.ok) {
        onCompleted();
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || "Swap failed");
      }
    } catch (err) {
      console.error("Swap failed:", err);
      alert("Something went wrong");
    }
    setProcessing(false);
  }

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[80]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-[5%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg bg-white rounded-2xl shadow-hub-lg z-[90] overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-hub-border/50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-semibold text-hub-primary">
                  Swap Product
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Original Product */}
              <div>
                <p className="label-base text-hub-error">Returning</p>
                <div className="flex items-center gap-3 bg-hub-error/5 border border-hub-error/10 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex-shrink-0">
                    {item.item.product_image ? (
                      <img
                        src={item.item.product_image}
                        alt={item.item.product_name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-hub-muted/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-hub-primary truncate">
                      {item.item.product_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.item.variation_label && (
                        <span className="text-[10px] text-hub-secondary">
                          {item.item.variation_label}
                        </span>
                      )}
                      {item.item.price_type === "price2" && (
                        <span className="text-[9px] font-medium text-hub-warning bg-hub-warning/10 px-1.5 py-0.5 rounded-full">
                          P2
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <input
                      type="number"
                      min="1"
                      max={remaining}
                      value={returnQty}
                      onChange={(e) => setReturnQty(e.target.value)}
                      className="w-16 px-2 py-1.5 rounded-lg border border-hub-error/20 bg-white text-sm text-center font-medium focus:outline-none focus:ring-1 focus:ring-hub-error/30"
                    />
                    <p className="text-[9px] text-hub-muted text-center mt-0.5">
                      of {remaining}
                    </p>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-blue-600 rotate-90" />
                </div>
              </div>

              {/* Replacement Product */}
              <div>
                <p className="label-base text-blue-600">Replacement</p>

                {newProduct ? (
                  <div className="space-y-3">
                    {/* Selected product */}
                    <div className="flex items-center gap-3 bg-blue-50/50 border border-blue-100 rounded-xl p-3">
                      <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex-shrink-0">
                        {newProduct.image_url ? (
                          <img
                            src={newProduct.image_url}
                            alt={newProduct.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-4 h-4 text-hub-muted/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-hub-primary truncate">
                          {newProduct.name}
                        </p>
                        {newProduct.brand &&
                          typeof newProduct.brand === "object" && (
                            <span className="text-[9px] font-medium text-hub-accent bg-hub-accent/10 px-1.5 py-0.5 rounded-full">
                              {(newProduct.brand as { name: string }).name}
                            </span>
                          )}
                      </div>
                      <button
                        onClick={() => {
                          setNewProduct(null);
                          setNewVariation(null);
                        }}
                        className="p-1 text-hub-muted hover:text-hub-primary"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Variation picker */}
                    {hasVariations && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Layers className="w-3.5 h-3.5 text-hub-accent" />
                          <label className="label-base mb-0">Variation *</label>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 max-h-[120px] overflow-y-auto">
                          {newProduct.variations!.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setNewVariation(v)}
                              className={`p-2 rounded-lg border text-xs text-center transition-all ${
                                newVariation?.id === v.id
                                  ? "border-hub-accent bg-hub-accent/10 text-hub-accent font-medium"
                                  : "border-hub-border/50 text-hub-secondary hover:border-hub-accent/30"
                              }`}
                            >
                              {v.variation_label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Price type */}
                    {hasPrice2 && (
                      <div>
                        <label className="label-base">Price Variant</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setNewPriceType("price1")}
                            className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                              newPriceType === "price1"
                                ? "border-hub-accent bg-hub-accent/10 text-hub-accent"
                                : "border-hub-border text-hub-secondary"
                            }`}
                          >
                            Price 1
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewPriceType("price2")}
                            className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                              newPriceType === "price2"
                                ? "border-hub-accent bg-hub-accent/10 text-hub-accent"
                                : "border-hub-border text-hub-secondary"
                            }`}
                          >
                            {newProduct.price2_label || "Price 2"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Quantity + Note */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-base">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={newQty}
                          onChange={(e) => setNewQty(e.target.value)}
                          className="input-base text-center"
                        />
                      </div>
                      <div>
                        <label className="label-base">Note (optional)</label>
                        <input
                          type="text"
                          value={swapNote}
                          onChange={(e) => setSwapNote(e.target.value)}
                          className="input-base"
                          placeholder="Reason..."
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Product Search */
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hub-muted" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="input-base pl-10 text-sm"
                        placeholder="Search replacement product..."
                        autoFocus
                      />
                    </div>

                    {searching && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-hub-muted" />
                      </div>
                    )}

                    {!searching && searchResults.length > 0 && (
                      <div className="max-h-[160px] overflow-y-auto space-y-1.5">
                        {searchResults.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => selectProduct(product)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-hub-border/30 hover:border-hub-accent/30 hover:bg-hub-bg/30 transition-all text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-hub-bg overflow-hidden flex-shrink-0">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-3 h-3 text-hub-muted/30" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-hub-primary truncate">
                                {product.name}
                              </p>
                              <div className="flex items-center gap-1.5">
                                {product.brand &&
                                  typeof product.brand === "object" && (
                                    <span className="text-[9px] text-hub-accent">
                                      {(product.brand as { name: string }).name}
                                    </span>
                                  )}
                                {product.variations &&
                                  product.variations.length > 0 && (
                                    <span className="text-[9px] text-hub-muted">
                                      {product.variations.length} var
                                    </span>
                                  )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {!searching &&
                      searchQuery.length >= 2 &&
                      searchResults.length === 0 && (
                        <p className="text-sm text-hub-muted text-center py-3">
                          No products found
                        </p>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-hub-border/50 flex-shrink-0">
              <button
                onClick={handleSwap}
                disabled={
                  processing ||
                  !newProduct ||
                  (hasVariations && !newVariation) ||
                  !returnQty ||
                  !newQty
                }
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowLeftRight className="w-4 h-4" />
                )}
                {processing ? "Processing..." : "Confirm Swap"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}