"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Loader2,
  Search,
  Calendar,
  CreditCard,
  Banknote,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Package,
  Filter,
  X,
} from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import type { RetailSale, RetailSaleItem } from "@/types";

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<RetailSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Expanded sale
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // Return state
  const [returningItem, setReturningItem] = useState<{
    saleId: string;
    item: RetailSaleItem;
  } | null>(null);
  const [returnQty, setReturnQty] = useState("");
  const [returnProcessing, setReturnProcessing] = useState(false);
  const [fullReturnProcessing, setFullReturnProcessing] = useState<string | null>(null);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (paymentFilter) params.set("payment_method", paymentFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "100");

      const res = await fetch(`/api/sales?${params.toString()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.sales) setSales(data.sales);
      if (data.total !== undefined) setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch sales:", err);
    }
    setLoading(false);
  }, [dateFrom, dateTo, paymentFilter, statusFilter]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // ── Returns ────────────────────────────────────────────
  async function handleFullReturn(saleId: string) {
    if (!confirm("Return ALL items in this sale? This cannot be undone.")) return;

    setFullReturnProcessing(saleId);
    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "full_return" }),
      });

      if (res.ok) {
        fetchSales();
      } else {
        const data = await res.json();
        alert(data.error || "Return failed");
      }
    } catch (err) {
      console.error("Full return failed:", err);
    }
    setFullReturnProcessing(null);
  }

  async function handlePartialReturn() {
    if (!returningItem) return;
    const qty = parseFloat(returnQty);
    if (isNaN(qty) || qty <= 0) {
      alert("Enter a valid return quantity");
      return;
    }

    const remaining =
      Number(returningItem.item.quantity) -
      Number(returningItem.item.returned_quantity);

    if (qty > remaining) {
      alert(`Cannot return more than ${remaining} remaining`);
      return;
    }

    setReturnProcessing(true);
    try {
      const res = await fetch(`/api/sales/${returningItem.saleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "partial_return",
          item_id: returningItem.item.id,
          return_quantity: qty,
        }),
      });

      if (res.ok) {
        setReturningItem(null);
        setReturnQty("");
        fetchSales();
      } else {
        const data = await res.json();
        alert(data.error || "Return failed");
      }
    } catch (err) {
      console.error("Partial return failed:", err);
    }
    setReturnProcessing(false);
  }

  // ── Stats ──────────────────────────────────────────────
  const completedSales = sales.filter((s) => s.status === "completed");
  const totalRevenue = completedSales.reduce(
    (sum, s) => sum + Number(s.total),
    0
  );
  const cashTotal = completedSales
    .filter((s) => s.payment_method === "cash")
    .reduce((sum, s) => sum + Number(s.total), 0);
  const cardTotal = completedSales
    .filter((s) => s.payment_method === "card")
    .reduce((sum, s) => sum + Number(s.total), 0);

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setPaymentFilter("");
    setStatusFilter("");
  }

  const hasActiveFilters = dateFrom || dateTo || paymentFilter || statusFilter;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/sales"
          className="p-2 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-hub-primary">
            Sales History
          </h1>
          <p className="text-sm text-hub-secondary mt-0.5">
            {total} sale{total !== 1 ? "s" : ""} found
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary flex items-center gap-2 text-sm py-2 ${
            hasActiveFilters ? "border-hub-accent text-hub-accent" : ""
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-hub-accent rounded-full" />
          )}
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-[11px] text-hub-secondary uppercase tracking-wider">
            Revenue
          </p>
          <p className="text-lg font-bold text-hub-accent mt-1">
            ₺{totalRevenue.toFixed(2)}
          </p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[11px] text-hub-secondary uppercase tracking-wider">
            Cash
          </p>
          <p className="text-lg font-bold text-hub-success mt-1">
            ₺{cashTotal.toFixed(2)}
          </p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[11px] text-hub-secondary uppercase tracking-wider">
            Card
          </p>
          <p className="text-lg font-bold text-blue-600 mt-1">
            ₺{cardTotal.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="label-base">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-base text-sm"
              />
            </div>
            <div>
              <label className="label-base">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-base text-sm"
              />
            </div>
            <div>
              <label className="label-base">Payment</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="input-base text-sm"
              >
                <option value="">All</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
            </div>
            <div>
              <label className="label-base">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-base text-sm"
              >
                <option value="">All</option>
                <option value="completed">Completed</option>
                <option value="returned">Returned</option>
                <option value="partially_returned">Partial Return</option>
              </select>
            </div>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 flex items-center gap-1 text-[11px] text-hub-accent hover:text-hub-accent-hover"
            >
              <X className="w-3 h-3" />
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Sales List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-hub-muted" />
        </div>
      ) : sales.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-10 h-10 text-hub-muted/40 mx-auto mb-3" />
          <p className="text-hub-secondary">No sales found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => {
            const isExpanded = expandedSaleId === sale.id;
            const isReturned = sale.status === "returned";
            const isPartial = sale.status === "partially_returned";

            return (
              <div
                key={sale.id}
                className={`card overflow-hidden transition-all duration-200 ${
                  isReturned ? "opacity-60" : ""
                }`}
              >
                {/* Sale Header Row */}
                <button
                  onClick={() =>
                    setExpandedSaleId(isExpanded ? null : sale.id)
                  }
                  className="w-full px-5 py-3.5 flex items-center gap-4 text-left hover:bg-hub-bg/30 transition-colors"
                >
                  {/* Sale number */}
                  <div className="w-14 text-center flex-shrink-0">
                    <span className="text-xs font-bold text-hub-accent">
                      #{sale.sale_number}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-hub-primary">
                        {sale.employee_username}
                      </span>
                      {sale.payment_method === "cash" ? (
                        <Banknote className="w-3.5 h-3.5 text-hub-success" />
                      ) : (
                        <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                      )}
                      {isReturned && (
                        <span className="text-[9px] font-semibold uppercase text-hub-error bg-hub-error/10 px-1.5 py-0.5 rounded-full">
                          Returned
                        </span>
                      )}
                      {isPartial && (
                        <span className="text-[9px] font-semibold uppercase text-hub-warning bg-hub-warning/10 px-1.5 py-0.5 rounded-full">
                          Partial Return
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-hub-muted mt-0.5">
                      {formatDateTime(sale.created_at)}
                      {sale.items &&
                        ` · ${sale.items.length} item${
                          sale.items.length !== 1 ? "s" : ""
                        }`}
                    </p>
                  </div>

                  {/* Total */}
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-sm font-bold ${
                        isReturned
                          ? "text-hub-muted line-through"
                          : "text-hub-primary"
                      }`}
                    >
                      ₺{Number(sale.total).toFixed(2)}
                    </p>
                    {Number(sale.discount_amount) > 0 && (
                      <p className="text-[10px] text-hub-error">
                        -₺{Number(sale.discount_amount).toFixed(2)} disc
                      </p>
                    )}
                  </div>

                  {/* Expand icon */}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-hub-muted flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-hub-muted flex-shrink-0" />
                  )}
                </button>

                {/* Expanded Detail */}
                {isExpanded && sale.items && (
                  <div className="border-t border-hub-border/30">
                    {/* Items */}
                    <div className="divide-y divide-hub-border/20">
                      {sale.items.map((item) => {
                        const returned = Number(item.returned_quantity);
                        const qty = Number(item.quantity);
                        const isItemReturned = returned >= qty;
                        const hasPartialReturn =
                          returned > 0 && returned < qty;

                        return (
                          <div
                            key={item.id}
                            className={`px-5 py-3 flex items-center gap-3 ${
                              isItemReturned ? "opacity-50" : ""
                            }`}
                          >
                            {/* Image */}
                            <div className="w-10 h-10 rounded-lg bg-hub-bg overflow-hidden flex-shrink-0">
                              {item.product_image ? (
                                <img
                                  src={item.product_image}
                                  alt={item.product_name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-3.5 h-3.5 text-hub-muted/30" />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-medium truncate ${
                                  isItemReturned
                                    ? "line-through text-hub-muted"
                                    : "text-hub-primary"
                                }`}
                              >
                                {item.product_name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {item.variation_label && (
                                  <span className="text-[10px] text-hub-secondary">
                                    {item.variation_label}
                                  </span>
                                )}
                                <span className="text-[10px] text-hub-muted">
                                  ₺{Number(item.unit_price_try).toFixed(2)} ×{" "}
                                  {qty}
                                </span>
                                {hasPartialReturn && (
                                  <span className="text-[9px] text-hub-warning font-medium">
                                    ({returned} returned)
                                  </span>
                                )}
                                {isItemReturned && (
                                  <span className="text-[9px] text-hub-error font-medium">
                                    Returned
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Line total */}
                            <span
                              className={`text-sm font-medium flex-shrink-0 ${
                                isItemReturned
                                  ? "line-through text-hub-muted"
                                  : "text-hub-primary"
                              }`}
                            >
                              ₺{Number(item.line_total).toFixed(2)}
                            </span>

                            {/* Return button */}
                            {!isItemReturned && sale.status !== "returned" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReturningItem({
                                    saleId: sale.id,
                                    item,
                                  });
                                  setReturnQty(String(qty - returned));
                                }}
                                className="p-1.5 text-hub-muted hover:text-hub-error rounded-lg hover:bg-hub-error/5 transition-colors flex-shrink-0"
                                title="Return this item"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Sale notes */}
                    {sale.notes && (
                      <div className="px-5 py-2 bg-hub-bg/30">
                        <p className="text-[11px] text-hub-secondary">
                          📝 {sale.notes}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {sale.status !== "returned" && (
                      <div className="px-5 py-3 border-t border-hub-border/30 flex justify-end">
                        <button
                          onClick={() => handleFullReturn(sale.id)}
                          disabled={fullReturnProcessing === sale.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-hub-error/70 hover:text-hub-error border border-hub-error/20 hover:bg-hub-error/5 rounded-lg transition-all"
                        >
                          {fullReturnProcessing === sale.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          Full Return
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Partial Return Modal */}
      {returningItem && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[80]"
            onClick={() => setReturningItem(null)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-hub-lg z-[90] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-hub-primary">
                Return Item
              </h3>
              <button
                onClick={() => setReturningItem(null)}
                className="p-1.5 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-hub-bg/50 rounded-xl p-3">
              <p className="text-sm font-medium text-hub-primary">
                {returningItem.item.product_name}
              </p>
              {returningItem.item.variation_label && (
                <p className="text-[11px] text-hub-secondary mt-0.5">
                  {returningItem.item.variation_label}
                </p>
              )}
              <p className="text-xs text-hub-muted mt-1">
                Purchased: {Number(returningItem.item.quantity)} · Already
                returned: {Number(returningItem.item.returned_quantity)} ·
                Remaining:{" "}
                {Number(returningItem.item.quantity) -
                  Number(returningItem.item.returned_quantity)}
              </p>
            </div>

            <div>
              <label className="label-base">Return Quantity</label>
              <input
                type="number"
                step="1"
                min="1"
                max={
                  Number(returningItem.item.quantity) -
                  Number(returningItem.item.returned_quantity)
                }
                value={returnQty}
                onChange={(e) => setReturnQty(e.target.value)}
                className="input-base"
                autoFocus
              />
            </div>

            <button
              onClick={handlePartialReturn}
              disabled={returnProcessing}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {returnProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              {returnProcessing ? "Processing..." : "Confirm Return"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}