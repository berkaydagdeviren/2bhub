"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, RotateCcw, Package } from "lucide-react";
import type { B2BSaleItem } from "@/types";

interface B2BReturnModalProps {
  item: {
    saleId: string;
    item: B2BSaleItem;
  } | null;
  onClose: () => void;
  onCompleted: () => void;
}

export default function B2BReturnModal({
  item,
  onClose,
  onCompleted,
}: B2BReturnModalProps) {
  const [returnQty, setReturnQty] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (item) {
      const remaining =
        Number(item.item.quantity) - Number(item.item.returned_quantity);
      setReturnQty(String(remaining));
    }
  }, [item]);

  if (!item) return null;

  const qty = Number(item.item.quantity);
  const returned = Number(item.item.returned_quantity);
  const remaining = qty - returned;

  async function handleReturn() {
    const returnAmount = parseFloat(returnQty);
    if (isNaN(returnAmount) || returnAmount <= 0) {
      alert("Enter a valid return quantity");
      return;
    }
    if (returnAmount > remaining) {
      alert(`Cannot return more than ${remaining} remaining`);
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/b2b-sales/${item?.saleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "partial_return",
          item_id: item?.item.id,
          return_quantity: returnAmount,
        }),
      });

      if (res.ok) {
        onCompleted();
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || "Return failed");
      }
    } catch (err) {
      console.error("Return failed:", err);
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-hub-lg z-[90] p-6 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-hub-primary">
                Return Item
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product Info */}
            <div className="flex items-center gap-3 bg-hub-bg/50 rounded-xl p-3">
              <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex-shrink-0">
                {item.item.product_image ? (
                  <img
                    src={item.item.product_image}
                    alt={item.item.product_name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-hub-muted/30" />
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
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-hub-bg/30 rounded-lg p-2">
                <p className="text-[10px] text-hub-muted uppercase">Given</p>
                <p className="text-sm font-bold text-hub-primary">{qty}</p>
              </div>
              <div className="bg-hub-bg/30 rounded-lg p-2">
                <p className="text-[10px] text-hub-muted uppercase">Returned</p>
                <p className="text-sm font-bold text-hub-warning">{returned}</p>
              </div>
              <div className="bg-hub-bg/30 rounded-lg p-2">
                <p className="text-[10px] text-hub-muted uppercase">Remaining</p>
                <p className="text-sm font-bold text-hub-accent">{remaining}</p>
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="label-base">Return Quantity</label>
              <input
                type="number"
                step="1"
                min="1"
                max={remaining}
                value={returnQty}
                onChange={(e) => setReturnQty(e.target.value)}
                className="input-base text-center text-lg font-semibold"
                autoFocus
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleReturn}
              disabled={processing}
              className="w-full py-3 px-6 bg-hub-error hover:bg-hub-error/90 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              {processing ? "Processing..." : `Return ${returnQty || 0} pcs`}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}