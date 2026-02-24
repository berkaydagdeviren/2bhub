"use client";

import { useState } from "react";
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Package,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { CartItem } from "@/types";

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
}

export default function Cart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}: CartProps) {
  const [expanded, setExpanded] = useState(true);

  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="card p-6 text-center">
        <ShoppingCart className="w-8 h-8 text-hub-muted/30 mx-auto mb-2" />
        <p className="text-sm text-hub-secondary">Cart is empty</p>
        <p className="text-[11px] text-hub-muted mt-1">
          Search products or scan QR to add
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Cart Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 bg-hub-bg/50 border-b border-hub-border/30"
      >
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-hub-accent" />
          <span className="text-sm font-semibold text-hub-primary">
            Cart
          </span>
          <span className="text-[10px] font-semibold bg-hub-accent text-white px-2 py-0.5 rounded-full">
            {items.length} item{items.length !== 1 ? "s" : ""} · {totalItems}{" "}
            pcs
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-hub-accent">
            ₺{subtotal.toFixed(2)}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-hub-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-hub-secondary" />
          )}
        </div>
      </button>

      {/* Cart Items */}
      {expanded && (
        <div>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-hub-border/20">
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemoveItem={onRemoveItem}
              />
            ))}
          </div>

          {/* Clear cart */}
          <div className="px-5 py-3 border-t border-hub-border/30 flex justify-end">
            <button
              onClick={() => {
                if (confirm("Clear all items from cart?")) onClearCart();
              }}
              className="flex items-center gap-1.5 text-[11px] text-hub-error/70 hover:text-hub-error transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CartItemRow({
  item,
  onUpdateQuantity,
  onRemoveItem,
}: {
  item: CartItem;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [qtyInput, setQtyInput] = useState(String(item.quantity));

  function handleQtySubmit() {
    const num = parseFloat(qtyInput);
    if (!isNaN(num) && num > 0) {
      onUpdateQuantity(item.id, num);
    } else {
      setQtyInput(String(item.quantity));
    }
    setEditing(false);
  }

  return (
    <div className="px-5 py-3 flex items-center gap-3 group">
      {/* Image */}
      <div className="w-12 h-12 rounded-lg bg-hub-bg overflow-hidden flex-shrink-0">
        {item.product_image ? (
          <img
            src={item.product_image}
            alt={item.product_name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-4 h-4 text-hub-muted/30" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-hub-primary truncate">
          {item.product_name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {item.brand_name && (
            <span className="text-[9px] font-medium text-hub-accent bg-hub-accent/10 px-1.5 py-0.5 rounded-full">
              {item.brand_name}
            </span>
          )}
          {item.variation_label && (
            <span className="text-[10px] text-hub-secondary">
              {item.variation_label}
            </span>
          )}
          {item.price_type === "price2" && (
            <span className="text-[9px] font-medium text-hub-warning bg-hub-warning/10 px-1.5 py-0.5 rounded-full">
              P2
            </span>
          )}
        </div>
        <p className="text-[10px] text-hub-muted mt-0.5">
          ₺{item.unit_price_try.toFixed(2)} each
        </p>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => {
            if (item.quantity <= 1) {
              onRemoveItem(item.id);
            } else {
              onUpdateQuantity(item.id, item.quantity - 1);
            }
          }}
          className="w-7 h-7 rounded-lg border border-hub-border flex items-center justify-center text-hub-secondary hover:text-hub-primary hover:border-hub-accent/30 transition-all"
        >
          <Minus className="w-3 h-3" />
        </button>

        {editing ? (
          <input
            type="number"
            value={qtyInput}
            onChange={(e) => setQtyInput(e.target.value)}
            onBlur={handleQtySubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleQtySubmit();
            }}
            className="w-14 h-7 text-center text-sm font-medium border border-hub-accent rounded-lg focus:outline-none"
            autoFocus
            min="0.01"
          />
        ) : (
          <button
            onClick={() => {
              setQtyInput(String(item.quantity));
              setEditing(true);
            }}
            className="w-14 h-7 flex items-center justify-center text-sm font-semibold text-hub-primary bg-hub-bg rounded-lg hover:bg-hub-accent/10 transition-colors"
            title="Click to type quantity"
          >
            {item.quantity}
          </button>
        )}

        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          className="w-7 h-7 rounded-lg border border-hub-border flex items-center justify-center text-hub-secondary hover:text-hub-primary hover:border-hub-accent/30 transition-all"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Line total */}
      <div className="text-right flex-shrink-0 w-20">
        <p className="text-sm font-semibold text-hub-primary">
          ₺{item.line_total.toFixed(2)}
        </p>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemoveItem(item.id)}
        className="p-1 text-hub-muted hover:text-hub-error rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}