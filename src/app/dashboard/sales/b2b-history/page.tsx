"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Loader2,
  Filter,
  X,
  Package,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  RotateCcw,
  ArrowLeftRight,
  Share2,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import type { B2BSale, B2BSaleItem } from "@/types";
import B2BReturnModal from "@/components/sales/B2BReturnModal";
import B2BSwapModal from "@/components/sales/B2BSwapModal";
import MockIrsaliye from "@/components/sales/MockIrsaliye";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getDefaultDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

const STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  returned: "İade",
  partially_returned: "Kısmi İade",
};

const STATUS_STYLES: Record<string, string> = {
  active: "text-hub-success bg-hub-success/10",
  returned: "text-hub-error bg-hub-error/10",
  partially_returned: "text-amber-600 bg-amber-50",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function B2BHistoryPage() {
  const defaults = getDefaultDates();
  const [sales, setSales] = useState<B2BSale[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [statusFilter, setStatusFilter] = useState("");
  const [firmSearch, setFirmSearch] = useState("");
  const [processedFilter, setProcessedFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modals
  const [returnItem, setReturnItem] = useState<{ saleId: string; item: B2BSaleItem } | null>(null);
  const [swapItem, setSwapItem] = useState<{ saleId: string; item: B2BSaleItem } | null>(null);
  const [irsaliyeSale, setIrsaliyeSale] = useState<B2BSale | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("date_from", dateFrom);
      params.set("date_to", dateTo);
      if (statusFilter) params.set("status", statusFilter);
      if (processedFilter) params.set("processed", processedFilter);

      const res = await fetch(`/api/b2b-sales?${params.toString()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      setSales(data.sales || []);
    } catch (err) {
      console.error("Failed to fetch B2B sales:", err);
    }
    setLoading(false);
  }, [dateFrom, dateTo, statusFilter, processedFilter]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // ── Mark processed / unprocessed ────────────────────────────────────────────

  async function toggleProcessed(sale: B2BSale) {
    const action = sale.is_processed ? "unmark_processed" : "mark_processed";
    setProcessingId(sale.id);
    try {
      const res = await fetch(`/api/b2b-sales/${sale.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setSales((prev) =>
          prev.map((s) =>
            s.id === sale.id ? { ...s, is_processed: !sale.is_processed } : s
          )
        );
      }
    } catch (err) {
      console.error("Toggle processed failed:", err);
    }
    setProcessingId(null);
  }

  // ── Full return ──────────────────────────────────────────────────────────────

  async function handleFullReturn(sale: B2BSale) {
    if (!confirm(`${sale.firm_name} — #${sale.sale_number} siparişinin tüm ürünlerini iade al?`)) return;
    setProcessingId(sale.id);
    try {
      const res = await fetch(`/api/b2b-sales/${sale.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "full_return" }),
      });
      if (res.ok) fetchSales();
    } catch (err) {
      console.error("Full return failed:", err);
    }
    setProcessingId(null);
  }

  // ── Client-side firm search ──────────────────────────────────────────────────

  const filteredSales = firmSearch
    ? sales.filter((s) =>
        s.firm_name.toLowerCase().includes(firmSearch.toLowerCase())
      )
    : sales;

  const hasActiveFilters =
    statusFilter || processedFilter || firmSearch;

  // ── Stats ────────────────────────────────────────────────────────────────────

  const unprocessedCount = filteredSales.filter((s) => !s.is_processed && s.status !== "returned").length;
  const activeSales = filteredSales.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/sales"
          className="p-2 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-white transition-all flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-hub-primary">
            B2B Satış Geçmişi
          </h1>
          <p className="text-sm text-hub-secondary mt-0.5">
            {filteredSales.length} sipariş · {unprocessedCount} bekleyen
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary flex items-center gap-2 text-sm py-2 flex-shrink-0 ${
            hasActiveFilters ? "border-hub-accent text-hub-accent" : ""
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtre
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-hub-accent rounded-full" />
          )}
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-[11px] text-hub-secondary uppercase tracking-wider">
            Toplam
          </p>
          <p className="text-xl font-bold text-hub-primary mt-1">
            {filteredSales.length}
          </p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[11px] text-hub-secondary uppercase tracking-wider">
            Aktif
          </p>
          <p className="text-xl font-bold text-hub-success mt-1">
            {activeSales}
          </p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[11px] text-hub-secondary uppercase tracking-wider">
            Bekleyen
          </p>
          <p className="text-xl font-bold text-hub-accent mt-1">
            {unprocessedCount}
          </p>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="label-base">Başlangıç</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-base text-sm"
              />
            </div>
            <div>
              <label className="label-base">Bitiş</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-base text-sm"
              />
            </div>
            <div>
              <label className="label-base">Durum</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-base text-sm"
              >
                <option value="">Tümü</option>
                <option value="active">Aktif</option>
                <option value="partially_returned">Kısmi İade</option>
                <option value="returned">İade</option>
              </select>
            </div>
            <div>
              <label className="label-base">İşlem</label>
              <select
                value={processedFilter}
                onChange={(e) => setProcessedFilter(e.target.value)}
                className="input-base text-sm"
              >
                <option value="">Tümü</option>
                <option value="false">Bekleyen</option>
                <option value="true">Tamamlanan</option>
              </select>
            </div>
          </div>

          {/* Firm search */}
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hub-muted" />
            <input
              type="text"
              value={firmSearch}
              onChange={(e) => setFirmSearch(e.target.value)}
              placeholder="Cari ara..."
              className="input-base pl-10 text-sm"
            />
            {firmSearch && (
              <button
                onClick={() => setFirmSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-hub-muted hover:text-hub-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setStatusFilter("");
                setProcessedFilter("");
                setFirmSearch("");
              }}
              className="flex items-center gap-1 text-[11px] text-hub-accent hover:underline"
            >
              <X className="w-3 h-3" />
              Filtreleri temizle
            </button>
          )}
        </div>
      )}

      {/* Sales List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-hub-muted" />
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-10 h-10 text-hub-muted/40 mx-auto mb-3" />
          <p className="text-hub-secondary">Sipariş bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSales.map((sale) => {
            const isExpanded = expandedId === sale.id;
            const activeItems =
              sale.items?.filter(
                (i) => !i.is_swap && Number(i.quantity) - Number(i.returned_quantity) > 0
              ) ?? [];
            const swapItems =
              sale.items?.filter((i) => i.is_swap) ?? [];

            return (
              <div
                key={sale.id}
                className={`card overflow-hidden transition-all duration-200 ${
                  sale.status === "returned" ? "opacity-60" : ""
                }`}
              >
                {/* Sale row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                  className="w-full px-5 py-4 flex items-start gap-4 text-left hover:bg-hub-bg/30 transition-colors"
                >
                  {/* Firm name — dominant */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-hub-accent">
                        {sale.firm_name}
                      </span>
                      <span className="text-xs text-hub-muted">
                        #{sale.sale_number}
                      </span>
                      {/* Status badge */}
                      <span
                        className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                          STATUS_STYLES[sale.status] ?? "text-hub-secondary bg-hub-bg"
                        }`}
                      >
                        {STATUS_LABELS[sale.status] ?? sale.status}
                      </span>
                      {/* Processed badge */}
                      {sale.is_processed ? (
                        <span className="text-[9px] font-semibold uppercase text-hub-success bg-hub-success/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          İşlendi
                        </span>
                      ) : sale.status !== "returned" ? (
                        <span className="text-[9px] font-semibold uppercase text-hub-accent bg-hub-accent/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          Bekliyor
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-hub-muted mt-1">
                      {formatDateTime(sale.created_at)}
                      {" · "}
                      {sale.employee_username}
                      {activeItems.length > 0 &&
                        ` · ${activeItems.length} kalem`}
                      {sale.note && ` · 📝 ${sale.note}`}
                    </p>
                  </div>

                  {/* Expand icon */}
                  <div className="flex-shrink-0 mt-1">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-hub-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-hub-muted" />
                    )}
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-hub-border/30">
                    {/* Items */}
                    <div className="divide-y divide-hub-border/20">
                      {(sale.items ?? []).map((item) => {
                        const returned = Number(item.returned_quantity);
                        const qty = Number(item.quantity);
                        const active = qty - returned;
                        const isFullyReturned = returned >= qty;

                        return (
                          <div
                            key={item.id}
                            className={`px-5 py-3 flex items-center gap-3 ${
                              isFullyReturned ? "opacity-50" : ""
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
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p
                                  className={`text-sm font-medium truncate ${
                                    isFullyReturned
                                      ? "line-through text-hub-muted"
                                      : "text-hub-primary"
                                  }`}
                                >
                                  {item.product_name}
                                </p>
                                {item.is_swap && (
                                  <span className="text-[9px] font-semibold text-hub-accent bg-hub-accent/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                    ↔ SWAP
                                  </span>
                                )}
                                {item.price_type === "price2" && (
                                  <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                    P2
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {item.variation_label && (
                                  <span className="text-[10px] text-hub-secondary">
                                    {item.variation_label}
                                  </span>
                                )}
                                {item.netsis_code && (
                                  <span className="text-[9px] text-hub-muted font-mono">
                                    {item.netsis_code}
                                  </span>
                                )}
                                <span className="text-[10px] text-hub-muted">
                                  {active} adet
                                  {returned > 0 && ` · ${returned} iade`}
                                </span>
                              </div>
                            </div>

                            {/* Item actions */}
                            {!isFullyReturned && sale.status !== "returned" && !item.is_swap && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReturnItem({ saleId: sale.id, item });
                                  }}
                                  className="p-1.5 text-hub-muted hover:text-hub-error rounded-lg hover:bg-hub-error/5 transition-colors"
                                  title="İade al"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSwapItem({ saleId: sale.id, item });
                                  }}
                                  className="p-1.5 text-hub-muted hover:text-hub-accent rounded-lg hover:bg-hub-accent/5 transition-colors"
                                  title="Swap"
                                >
                                  <ArrowLeftRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Swap note (if any swap items) */}
                    {swapItems.length > 0 &&
                      swapItems.some((i) => i.swap_note) && (
                        <div className="px-5 py-2 bg-hub-accent/5 border-t border-hub-border/20">
                          {swapItems
                            .filter((i) => i.swap_note)
                            .map((i) => (
                              <p key={i.id} className="text-[11px] text-hub-secondary">
                                ↔ Swap notu: {i.swap_note}
                              </p>
                            ))}
                        </div>
                      )}

                    {/* Actions bar */}
                    <div className="px-5 py-3 border-t border-hub-border/30 flex items-center gap-2 flex-wrap">
                      {/* Mark processed */}
                      <button
                        onClick={() => toggleProcessed(sale)}
                        disabled={processingId === sale.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                          sale.is_processed
                            ? "text-hub-secondary border-hub-border/50 hover:border-hub-error/30 hover:text-hub-error"
                            : "text-hub-success border-hub-success/30 hover:bg-hub-success/5 bg-hub-success/5"
                        }`}
                      >
                        {processingId === sale.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : sale.is_processed ? (
                          <X className="w-3 h-3" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {sale.is_processed ? "İşlemi Geri Al" : "İşlendi Olarak Onayla"}
                      </button>

                      {/* Irsaliye */}
                      <button
                        onClick={() => setIrsaliyeSale(sale)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-hub-accent border border-hub-accent/30 rounded-lg hover:bg-hub-accent/5 transition-all"
                      >
                        <Share2 className="w-3 h-3" />
                        İrsaliye
                      </button>

                      {/* Full return */}
                      {sale.status !== "returned" && (
                        <button
                          onClick={() => handleFullReturn(sale)}
                          disabled={processingId === sale.id}
                          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-hub-error/70 hover:text-hub-error border border-hub-error/20 hover:bg-hub-error/5 rounded-lg transition-all"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Tamamını İade Al
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

      {/* Modals */}
      <B2BReturnModal
        item={returnItem}
        onClose={() => setReturnItem(null)}
        onCompleted={() => {
          setReturnItem(null);
          fetchSales();
        }}
      />

      <B2BSwapModal
        item={swapItem}
        onClose={() => setSwapItem(null)}
        onCompleted={() => {
          setSwapItem(null);
          fetchSales();
        }}
      />

      <MockIrsaliye
        sale={irsaliyeSale}
        onClose={() => setIrsaliyeSale(null)}
      />
    </div>
  );
}
