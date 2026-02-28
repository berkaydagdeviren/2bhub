"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Building2,
  Lock,
  Unlock,
  Phone,
  Mail,
  MapPin,
  FileText,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Package,
  RotateCcw,
  ArrowLeftRight,
  CheckCircle2,
  X,
  Calendar,
  AlertTriangle,
  StickyNote,
  Share2
} from "lucide-react";
import Link from "next/link";
import { formatDateTime, formatDate } from "@/lib/utils";
import type { Firm, B2BSale, B2BSaleItem, Product } from "@/types";
import B2BReturnModal from "@/components/sales/B2BReturnModal";
import B2BSwapModal from "@/components/sales/B2BSwapModal";
import MockIrsaliye from "@/components/sales/MockIrsaliye";

export default function FirmDetailPage() {
  const params = useParams();
  const firmId = params.id as string;

  const [firm, setFirm] = useState<Firm | null>(null);
  const [sales, setSales] = useState<B2BSale[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [processedFilter, setProcessedFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Expanded sale
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // Return modal
  const [returningItem, setReturningItem] = useState<{
    saleId: string;
    item: B2BSaleItem;
  } | null>(null);

  // Swap modal
  const [swappingItem, setSwappingItem] = useState<{
    saleId: string;
    item: B2BSaleItem;
  } | null>(null);

  // Full return
  const [fullReturnProcessing, setFullReturnProcessing] = useState<string | null>(null);
  const [irsaliyeSale, setIrsaliyeSale] = useState<B2BSale | null>(null);
  // Lock
  const [lockProcessing, setLockProcessing] = useState(false);
  const [lockReason, setLockReason] = useState("");
  const [showLockModal, setShowLockModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      if (dateFrom) queryParams.set("date_from", dateFrom);
      if (dateTo) queryParams.set("date_to", dateTo);
      if (productSearch) queryParams.set("product", productSearch);
      if (processedFilter) queryParams.set("processed", processedFilter);

      const res = await fetch(
        "/api/firms/" + firmId + "?" + queryParams.toString(),
        { cache: "no-store", headers: { "Cache-Control": "no-cache" } }
      );
      const data = await res.json();
      if (data.firm) setFirm(data.firm);
      if (data.sales) setSales(data.sales);
    } catch (err) {
      console.error("Failed to fetch firm:", err);
    }
    setLoading(false);
  }, [firmId, dateFrom, dateTo, productSearch, processedFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Lock/Unlock ────────────────────────────────────────
  async function handleLock() {
    if (!firm) return;
    setLockProcessing(true);
    try {
      await fetch("/api/firms/" + firmId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lock",
          lock_reason: lockReason.trim() || "Payment issue",
        }),
      });
      setShowLockModal(false);
      setLockReason("");
      fetchData();
    } catch (err) {
      console.error("Lock failed:", err);
    }
    setLockProcessing(false);
  }

  async function handleUnlock() {
    if (!firm) return;
    setLockProcessing(true);
    try {
      await fetch("/api/firms/" + firmId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlock" }),
      });
      fetchData();
    } catch (err) {
      console.error("Unlock failed:", err);
    }
    setLockProcessing(false);
  }

  // ── Full Return ────────────────────────────────────────
  async function handleFullReturn(saleId: string) {
    if (!confirm("Return ALL items in this order? This cannot be undone.")) return;
    setFullReturnProcessing(saleId);
    try {
      const res = await fetch("/api/b2b-sales/" + saleId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "full_return" }),
      });
      if (res.ok) fetchData();
      else {
        const data = await res.json();
        alert(data.error || "Return failed");
      }
    } catch (err) {
      console.error("Full return failed:", err);
    }
    setFullReturnProcessing(null);
  }

  // ── Mark Processed ─────────────────────────────────────
  async function toggleProcessed(sale: B2BSale) {
    try {
      await fetch("/api/b2b-sales/" + sale.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: sale.is_processed ? "unmark_processed" : "mark_processed",
        }),
      });
      fetchData();
    } catch (err) {
      console.error("Toggle processed failed:", err);
    }
  }

  const hasActiveFilters = dateFrom || dateTo || productSearch || processedFilter;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-hub-muted" />
      </div>
    );
  }

  if (!firm) {
    return (
      <div className="card p-12 text-center">
        <Building2 className="w-10 h-10 text-hub-muted/40 mx-auto mb-3" />
        <p className="text-hub-secondary">Firm not found</p>
        <Link
          href="/dashboard/firms"
          className="text-sm text-hub-accent mt-2 font-medium inline-block"
        >
          Back to firms
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/firms"
          className="p-2 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-hub-primary truncate">
              {firm.name}
            </h1>
            {firm.is_locked && (
              <span className="text-[10px] font-semibold uppercase text-hub-error bg-hub-error/10 px-2 py-0.5 rounded-full flex-shrink-0">
                Locked
              </span>
            )}
          </div>
          <p className="text-sm text-hub-secondary mt-0.5">
            {sales.length} order{sales.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Lock/Unlock */}
        {firm.is_locked ? (
          <button
            onClick={handleUnlock}
            disabled={lockProcessing}
            className="btn-secondary flex items-center gap-2 text-sm py-2 text-hub-success border-hub-success/30 hover:bg-hub-success/5"
          >
            {lockProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Unlock className="w-3.5 h-3.5" />
            )}
            Unlock
          </button>
        ) : (
          <button
            onClick={() => setShowLockModal(true)}
            className="btn-secondary flex items-center gap-2 text-sm py-2 text-hub-error/70 border-hub-error/20 hover:bg-hub-error/5"
          >
            <Lock className="w-3.5 h-3.5" />
            Lock
          </button>
        )}
      </div>

      {/* Firm Info Card */}
      <div className="card p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {firm.contact_person && (
            <div className="flex items-center gap-2 text-sm text-hub-secondary">
              <FileText className="w-4 h-4 text-hub-muted flex-shrink-0" />
              <span className="truncate">{firm.contact_person}</span>
            </div>
          )}
          {firm.phone && (
            <div className="flex items-center gap-2 text-sm text-hub-secondary">
              <Phone className="w-4 h-4 text-hub-muted flex-shrink-0" />
              <span className="truncate">{firm.phone}</span>
            </div>
          )}
          {firm.email && (
            <div className="flex items-center gap-2 text-sm text-hub-secondary">
              <Mail className="w-4 h-4 text-hub-muted flex-shrink-0" />
              <span className="truncate">{firm.email}</span>
            </div>
          )}
          {firm.address && (
            <div className="flex items-center gap-2 text-sm text-hub-secondary">
              <MapPin className="w-4 h-4 text-hub-muted flex-shrink-0" />
              <span className="truncate">{firm.address}</span>
            </div>
          )}
        </div>
        {firm.is_locked && firm.lock_reason && (
          <div className="mt-3 pt-3 border-t border-hub-border/30 flex items-center gap-2 text-sm text-hub-error">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Lock reason: {firm.lock_reason}</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-hub-muted" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="input-base pl-11"
            placeholder="Filter by product name..."
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={"btn-secondary flex items-center gap-2 text-sm py-3 " + (hasActiveFilters ? "border-hub-accent text-hub-accent" : "")}
        >
          <Filter className="w-3.5 h-3.5" />
          {hasActiveFilters && <span className="w-2 h-2 bg-hub-accent rounded-full" />}
        </button>
      </div>

      {showFilters && (
        <div className="card p-4">
          <div className="grid grid-cols-3 gap-3">
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
              <label className="label-base">Processed</label>
              <select
                value={processedFilter}
                onChange={(e) => setProcessedFilter(e.target.value)}
                className="input-base text-sm"
              >
                <option value="">All</option>
                <option value="false">Not Processed</option>
                <option value="true">Processed</option>
              </select>
            </div>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setProductSearch(""); setProcessedFilter(""); }}
              className="mt-3 flex items-center gap-1 text-[11px] text-hub-accent"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* Sales List */}
      {sales.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-10 h-10 text-hub-muted/40 mx-auto mb-3" />
          <p className="text-hub-secondary">
            {hasActiveFilters ? "No orders match your filters" : "No orders yet"}
          </p>
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
                className={"card overflow-hidden transition-all " + (isReturned ? "opacity-60" : "") + (sale.is_processed ? " border-hub-success/20" : "")}
              >
                {/* Sale Header */}
                <button
                  onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                  className="w-full px-5 py-3.5 flex items-center gap-4 text-left hover:bg-hub-bg/30 transition-colors"
                >
                  <div className="w-14 text-center flex-shrink-0">
                    <span className="text-xs font-bold text-hub-accent">#{sale.sale_number}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-hub-primary">
                        {sale.employee_username}
                      </span>
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
                      {sale.is_processed && (
                        <span className="text-[9px] font-semibold uppercase text-hub-success bg-hub-success/10 px-1.5 py-0.5 rounded-full">
                          Processed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-hub-muted">
                        {formatDateTime(sale.created_at)}
                      </span>
                      {sale.items && (
                        <span className="text-[11px] text-hub-muted">
                          · {sale.items.length} item{sale.items.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      {sale.note && (
                        <span className="text-[11px] text-hub-accent flex items-center gap-0.5">
                          <StickyNote className="w-3 h-3" /> {sale.note}
                        </span>
                      )}
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-hub-muted flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-hub-muted flex-shrink-0" />
                  )}
                </button>

                {/* Expanded Detail */}
                {isExpanded && sale.items && (
                  <div className="border-t border-hub-border/30">
                    <div className="divide-y divide-hub-border/20">
                      {sale.items.map((item) => {
                        const returned = Number(item.returned_quantity);
                        const qty = Number(item.quantity);
                        const isItemReturned = returned >= qty;
                        const hasPartialReturn = returned > 0 && returned < qty;

                        return (
                          <div
                            key={item.id}
                            className={"px-5 py-3 flex items-center gap-3 " + (isItemReturned ? "opacity-50" : "")}
                          >
                            <div className="w-10 h-10 rounded-lg bg-hub-bg overflow-hidden flex-shrink-0">
                              {item.product_image ? (
                                <img src={item.product_image} alt={item.product_name} className="w-full h-full object-contain" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-3.5 h-3.5 text-hub-muted/30" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className={"text-sm font-medium truncate " + (isItemReturned ? "line-through text-hub-muted" : "text-hub-primary")}>
                                {item.product_name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {item.variation_label && (
                                  <span className="text-[10px] text-hub-secondary">{item.variation_label}</span>
                                )}
                                {item.netsis_code && (
                                  <span className="text-[10px] text-hub-muted font-mono">{item.netsis_code}</span>
                                )}
                                {item.price_type === "price2" && (
                                  <span className="text-[9px] font-medium text-hub-warning bg-hub-warning/10 px-1.5 py-0.5 rounded-full">P2</span>
                                )}
                                {item.is_swap && (
                                  <span className="text-[9px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <ArrowLeftRight className="w-3 h-3" /> Swap
                                  </span>
                                )}
                                {hasPartialReturn && (
                                  <span className="text-[9px] text-hub-warning font-medium">({returned} returned)</span>
                                )}
                                {isItemReturned && (
                                  <span className="text-[9px] text-hub-error font-medium">Returned</span>
                                )}
                                {item.swap_note && (
                                  <span className="text-[9px] text-hub-muted italic">"{item.swap_note}"</span>
                                )}
                              </div>
                            </div>

                            <span className={"text-sm font-semibold flex-shrink-0 " + (isItemReturned ? "line-through text-hub-muted" : "text-hub-primary")}>
                              x{qty}
                            </span>

                            {/* Actions */}
                            {!isItemReturned && sale.status !== "returned" && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSwappingItem({ saleId: sale.id, item }); }}
                                  className="p-1.5 text-hub-muted hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                  title="Swap product"
                                >
                                  <ArrowLeftRight className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setReturningItem({ saleId: sale.id, item }); }}
                                  className="p-1.5 text-hub-muted hover:text-hub-error rounded-lg hover:bg-hub-error/5 transition-colors"
                                  title="Return item"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Sale Actions */}
                    <div className="px-5 py-3 border-t border-hub-border/30 flex items-center justify-between">
                    <button
  onClick={() => setIrsaliyeSale(sale)}
  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-hub-accent border border-hub-accent/20 hover:bg-hub-accent/5 rounded-lg transition-all"
>
  <Share2 className="w-3 h-3" />
  İrsaliye
</button>
                      <button
                        onClick={() => toggleProcessed(sale)}
                        className={"flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all " +
                          (sale.is_processed
                            ? "text-hub-success border border-hub-success/30 hover:bg-hub-success/5"
                            : "text-hub-secondary border border-hub-border hover:border-hub-success/30 hover:text-hub-success"
                          )}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {sale.is_processed ? "Processed ✓" : "Mark Processed"}
                      </button>

                      {sale.status !== "returned" && (
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
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lock Modal */}
      {showLockModal && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[80]" onClick={() => setShowLockModal(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-hub-lg z-[90] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-hub-error/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-hub-error" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-hub-primary">Lock {firm.name}</h3>
              </div>
            </div>
            <div>
              <label className="label-base">Reason</label>
              <input
                type="text"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                className="input-base"
                placeholder="e.g. Missed payment..."
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowLockModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleLock}
                disabled={lockProcessing}
                className="flex-1 py-3 px-6 bg-hub-error hover:bg-hub-error/90 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {lockProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Lock
              </button>
            </div>
          </div>
        </>
      )}

      {/* Return Modal */}
      <B2BReturnModal
        item={returningItem}
        onClose={() => setReturningItem(null)}
        onCompleted={fetchData}
      />

      {/* Swap Modal */}
      <B2BSwapModal
        item={swappingItem}
        onClose={() => setSwappingItem(null)}
        onCompleted={fetchData}
      />
    </div>
  );
  <MockIrsaliye
  sale={irsaliyeSale}
  onClose={() => setIrsaliyeSale(null)}
/>
}
