"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShoppingCart,
  Minus,
  Plus,
  ToggleLeft,
  ToggleRight,
  Package,
  Layers,
} from "lucide-react";
import type { Product, ProductVariation, CartItem } from "@/types";

interface AddToCartModalProps {
  product: Product | null;
  calcSalePrice: (
    listPrice: number,
    discountPercent: number,
    kdvPercent: number,
    profitPercent: number,
    currency: string
  ) => {
    buy: number;
    saleForeign: number;
    saleTry: number;
    rate: number;
    isForeign: boolean;
  };
  getExchangeRate: (currency: string) => number;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export default function AddToCartModal({
  product,
  calcSalePrice,
  getExchangeRate,
  onClose,
  onAddToCart,
}: AddToCartModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState("1");
  const [usePrice2, setUsePrice2] = useState(false);
  const [selectedVariation, setSelectedVariation] =
    useState<ProductVariation | null>(null);

  // Reset state when product changes
  useEffect(() => {
    setQuantity(1);
    setQuantityInput("1");
    setUsePrice2(false);
    setSelectedVariation(null);
  }, [product?.id]);

  if (!product) return null;
  const p = product;
  const hasVariations =
    product.variations && product.variations.length > 0;
  const hasPrice2 = product.has_price2;

  // Determine pricing source
  function getCurrentPrice() {
    const prod = product!;
    let listPrice: number;
    let discount: number;

    if (selectedVariation?.has_custom_price) {
      if (usePrice2 && hasPrice2) {
        listPrice =
          Number(selectedVariation.list_price2) ||
          Number(selectedVariation.list_price) ||
          0;
        discount =
          Number(selectedVariation.discount_percent2) ||
          Number(selectedVariation.discount_percent) ||
          0;
      } else {
        listPrice = Number(selectedVariation.list_price) || 0;
        discount = Number(selectedVariation.discount_percent) || 0;
      }
    } else {
      if (usePrice2 && hasPrice2) {
        listPrice = Number(prod.list_price2) || 0;
        discount = Number(prod.discount_percent2) || 0;
      } else {
        listPrice = Number(prod.list_price) || 0;
        discount = Number(prod.discount_percent) || 0;
      }
    }

    const result = calcSalePrice(
      listPrice,
      discount,
      Number(prod.kdv_percent),
      Number(prod.profit_percent),
      prod.currency
    );

    return {
      unitPriceForeign: result.saleForeign,
      unitPriceTry: result.saleTry,
      currency: prod.currency,
      rate: result.rate,
    };
  }

  const price = getCurrentPrice();
  const lineTotal = Math.round(price.unitPriceTry * quantity * 100) / 100;

  function handleQuantityChange(val: string) {
    setQuantityInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setQuantity(num);
    }
  }

  function incrementQty() {
    const newQty = quantity + 1;
    setQuantity(newQty);
    setQuantityInput(String(newQty));
  }

  function decrementQty() {
    if (quantity <= 1) return;
    const newQty = quantity - 1;
    setQuantity(newQty);
    setQuantityInput(String(newQty));
  }

  function handleAdd() {
    const prod = product!;
    if (hasVariations && !selectedVariation) return;
    if (quantity <= 0) return;

    const cartItem: CartItem = {
      id: crypto.randomUUID(),
      product_id: prod.id,
      product_name: prod.name,
      product_image: prod.image_url,
      brand_name:
        prod.brand && typeof prod.brand === "object"
          ? (prod.brand as { name: string }).name
          : null,
      variation_label: selectedVariation?.variation_label || null,
      quantity,
      unit_price: price.unitPriceForeign,
      price_type: usePrice2 ? "price2" : "price1",
      currency: prod.currency,
      exchange_rate: price.rate || 1,
      unit_price_try: price.unitPriceTry,
      line_total: lineTotal,
    };

    onAddToCart(cartItem);
    onClose();
  }

  const currencySymbols: Record<string, string> = {
    TRY: "₺",
    USD: "$",
    EUR: "€",
  };
  const sym = currencySymbols[product.currency] || "₺";

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
                {product.name}
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
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
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
                    {product.name}
                  </p>
                  {product.brand && typeof product.brand === "object" && (
                    <span className="text-[10px] font-medium text-hub-accent bg-hub-accent/10 px-2 py-0.5 rounded-full">
                      {(product.brand as { name: string }).name}
                    </span>
                  )}
                </div>
              </div>

              {/* Variation Picker */}
              {hasVariations && (
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Layers className="w-3.5 h-3.5 text-hub-accent" />
                    <label className="label-base mb-0">
                      Select Variation *
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto">
                    {product.variations!.map((v) => {
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
                          {v.sku && (
                            <span className="text-[9px] text-hub-muted block">
                              {v.sku}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price Type Toggle */}
              {hasPrice2 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setUsePrice2(!usePrice2)}
                    className="flex items-center gap-2 text-sm text-hub-secondary hover:text-hub-primary transition-colors"
                  >
                    {usePrice2 ? (
                      <ToggleRight className="w-5 h-5 text-hub-accent" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                    {usePrice2
                      ? product.price2_label || "Price 2"
                      : "Price 1"}
                  </button>
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

              {/* Price Display */}
              <div className="bg-hub-bg/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-hub-secondary">Unit Price</span>
                  <span className="font-medium text-hub-primary">
                    {product.currency !== "TRY" && (
                      <span className="text-hub-muted mr-1.5">
                        {sym}
                        {price.unitPriceForeign.toFixed(2)} →
                      </span>
                    )}
                    ₺{price.unitPriceTry.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-hub-secondary">Quantity</span>
                  <span className="font-medium text-hub-primary">
                    ×{quantity}
                  </span>
                </div>
                <div className="pt-2 border-t border-hub-border/30 flex justify-between">
                  <span className="text-sm font-semibold text-hub-primary">
                    Line Total
                  </span>
                  <span className="text-lg font-bold text-hub-accent">
                    ₺{lineTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-hub-border/50 flex-shrink-0">
              <button
                onClick={handleAdd}
                disabled={
                  quantity <= 0 || (hasVariations && !selectedVariation)
                }
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Cart — ₺{lineTotal.toFixed(2)}
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