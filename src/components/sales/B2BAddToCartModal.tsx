"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShoppingCart,
  Minus,
  Plus,
  Package,
  Layers,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import type { Product, ProductVariation, B2BCartItem } from "@/types";

interface B2BAddToCartModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (item: B2BCartItem) => void;
}

export default function B2BAddToCartModal({
  product,
  onClose,
  onAddToCart,
}: B2BAddToCartModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState("1");
  const [selectedVariation, setSelectedVariation] =
    useState<ProductVariation | null>(null);
  const [usePrice2, setUsePrice2] = useState(false);
  useEffect(() => {
    setQuantity(1);
    setQuantityInput("1");
    setSelectedVariation(null);
    setUsePrice2(false)
  }, [product?.id]);

  if (!product) return null;
  const p = product;

  const hasVariations = p.variations && p.variations.length > 0;

  function handleQuantityChange(val: string) {
    setQuantityInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setQuantity(num);
    }
  }

  function incrementQty() {
    const n = quantity + 1;
    setQuantity(n);
    setQuantityInput(String(n));
  }

  function decrementQty() {
    if (quantity <= 1) return;
    const n = quantity - 1;
    setQuantity(n);
    setQuantityInput(String(n));
  }

  function handleAdd() {
    if (hasVariations && !selectedVariation) return;
    if (quantity <= 0) return;

    const brandName =
      p.brand && typeof p.brand === "object"
        ? (p.brand as { name: string }).name
        : null;

    const cartItem: B2BCartItem = {
  id: crypto.randomUUID(),
  product_id: p.id,
  product_name: p.name,
  product_image: p.image_url,
  brand_name: brandName,
  netsis_code: p.netsis_code,
  variation_label: selectedVariation?.variation_label || null,
  quantity,
  price_type: usePrice2 ? "price2" : "price1",
};

    onAddToCart(cartItem);
    onClose();
  }

  return (
    <AnimatePresence>
      {p && (
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
            className="fixed inset-x-4 top-[10%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md bg-white rounded-2xl shadow-hub-lg z-[90] overflow-hidden max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-hub-border/50 flex-shrink-0">
              <h3 className="text-base font-semibold text-hub-primary truncate pr-4">
                {p.name}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Product preview */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-hub-bg overflow-hidden flex-shrink-0">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-hub-muted/30" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-hub-primary truncate">
                    {p.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {p.brand && typeof p.brand === "object" && (
                      <span className="text-[10px] font-medium text-hub-accent bg-hub-accent/10 px-2 py-0.5 rounded-full">
                        {(p.brand as { name: string }).name}
                      </span>
                    )}
                    {p.netsis_code && (
                      <span className="text-[10px] text-hub-muted font-mono">
                        {p.netsis_code}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Variation Picker */}
              {hasVariations && (
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Layers className="w-3.5 h-3.5 text-hub-accent" />
                    <label className="label-base mb-0">Select Variation *</label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto">
                    {p.variations!.map((v) => {
                      const isSelected = selectedVariation?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariation(v)}
                          className={`p-2.5 rounded-xl border text-left text-sm transition-all ${
                            isSelected
                              ? "border-hub-accent bg-hub-accent/10 text-hub-accent font-medium"
                              : "border-hub-border/50 text-hub-secondary hover:border-hub-accent/30"
                          }`}
                        >
                          {v.variation_label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="label-base">Quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={decrementQty}
                    disabled={quantity <= 1}
                    className="w-10 h-10 rounded-xl border border-hub-border flex items-center justify-center text-hub-secondary hover:text-hub-primary hover:border-hub-accent/30 transition-all disabled:opacity-30"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={quantityInput}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    className="input-base text-center w-24"
                    min="0.01"
                    step="1"
                  />
                  <button
                    type="button"
                    onClick={incrementQty}
                    className="w-10 h-10 rounded-xl border border-hub-border flex items-center justify-center text-hub-secondary hover:text-hub-primary hover:border-hub-accent/30 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Price Type Toggle */}
{p.has_price2 && (
  <div>
    <label className="label-base">Price Variant</label>
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setUsePrice2(false)}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all ${
          !usePrice2
            ? "border-hub-accent bg-hub-accent/10 text-hub-accent"
            : "border-hub-border text-hub-secondary hover:border-hub-accent/30"
        }`}
      >
        Price 1
      </button>
      <button
        type="button"
        onClick={() => setUsePrice2(true)}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all ${
          usePrice2
            ? "border-hub-accent bg-hub-accent/10 text-hub-accent"
            : "border-hub-border text-hub-secondary hover:border-hub-accent/30"
        }`}
      >
        {p.price2_label || "Price 2"}
      </button>
    </div>
  </div>
)}

{/* B2B Notice */}
<div className="bg-hub-bg/50 rounded-xl p-3">
  <p className="text-[11px] text-hub-muted text-center">
    B2B orders — pricing handled per firm agreement
  </p>
</div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-hub-border/50 flex-shrink-0">
              <button
                onClick={handleAdd}
                disabled={quantity <= 0 || (hasVariations && !selectedVariation)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Order — {quantity} pcs
              </button>
              {hasVariations && !selectedVariation && (
                <p className="text-[11px] text-hub-error text-center mt-2">
                  Please select a variation first
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}