"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Calendar,
  Printer,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Building2,
  AlertCircle,
  FileDown,
  RotateCcw,
  Clock,
  Package,
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { FirmRecord, B2BRecord, B2BRecordItem } from "@/types";

// ── Helpers ────────────────────────────────────────────────────

function fmt(amount: number): string {
  if (!amount) return "—";
  return (
    "₺" +
    amount.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function getActiveItems(items: B2BRecordItem[]): B2BRecordItem[] {
  return items.filter(
    (item) => Number(item.quantity) - Number(item.returned_quantity) > 0
  );
}

function saleTotalTRY(sale: B2BRecord): number {
  return getActiveItems(sale.items).reduce(
    (sum, i) => sum + i.line_total_try,
    0
  );
}

function getDefaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 13);
  return d.toISOString().split("T")[0];
}

function getDefaultDateTo(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Print HTML generation ──────────────────────────────────────

function buildPrintHTML(
  firms: FirmRecord[],
  dateFrom: string,
  dateTo: string,
  unprocessedOnly: boolean
): string {
  const dateLabel = `${formatDate(dateFrom + "T12:00:00")} – ${formatDate(
    dateTo + "T12:00:00"
  )}`;

  const activeFirms = firms
    .map((firm) => {
      const sales = firm.sales.filter((s) => {
        if (s.status === "returned") return false;
        if (unprocessedOnly && s.is_processed) return false;
        return getActiveItems(s.items).length > 0;
      });
      return { ...firm, sales };
    })
    .filter((f) => f.sales.length > 0);

  if (activeFirms.length === 0) {
    return `<!DOCTYPE html><html><body><p style="font-family:system-ui;padding:40px;color:#7A7468">Yazdırılacak kayıt bulunamadı.</p></body></html>`;
  }

  const firmPages = activeFirms
    .map((firm) => {
      const firmTotal = firm.sales.reduce(
        (sum, s) => sum + saleTotalTRY(s),
        0
      );
      const sortedSales = [...firm.sales].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      const salesHTML = sortedSales
        .map((sale) => {
          const activeItems = getActiveItems(sale.items);
          const saleTotal = activeItems.reduce(
            (sum, i) => sum + i.line_total_try,
            0
          );
          const statusBadge = sale.is_processed
            ? `<span class="badge done">✓ İşlendi</span>`
            : `<span class="badge pending">Bekliyor</span>`;

          const rowsHTML = activeItems
            .map((item, idx) => {
              const qty =
                Number(item.quantity) - Number(item.returned_quantity);
              const unitStr = item.sale_price_try
                ? `₺${item.sale_price_try.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : "—";
              const totalStr = item.line_total_try
                ? `₺${item.line_total_try.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : "—";
              const p2Badge =
                item.price_type === "price2"
                  ? `<span class="p2-badge">P2</span> `
                  : "";
              return `
          <tr>
            <td class="num">${idx + 1}</td>
            <td class="name">
              ${item.is_swap ? `<span class="swap-badge">↔</span> ` : ""}${p2Badge}${
                item.product_name
              }
              ${
                item.variation_label
                  ? `<div class="variation">${item.variation_label}</div>`
                  : ""
              }
            </td>
            <td class="netsis">${item.netsis_code || "—"}</td>
            <td class="qty-col">${qty}</td>
            <td class="price-col">${unitStr}</td>
            <td class="total-col">${totalStr}</td>
          </tr>`;
            })
            .join("");

          const partialTag =
            sale.status === "partially_returned"
              ? `<span class="partial-tag">Kısmi İade</span>`
              : "";

          return `
      <div class="sale-block">
        <div class="sale-header-row">
          <div>
            <span class="sale-num">Satış #${sale.sale_number}</span>
            <span class="sale-date"> — ${formatDateTime(sale.created_at)}</span>
            <span class="sale-emp"> · ${sale.employee_username}</span>
            ${
              sale.note
                ? `<div class="sale-note">📝 ${sale.note}</div>`
                : ""
            }
          </div>
          ${statusBadge}
        </div>
        <table>
          <thead>
            <tr>
              <th class="num">#</th>
              <th>Ürün</th>
              <th>Netsis Kodu</th>
              <th class="qty-col">Adet</th>
              <th class="price-col">Ref. Birim</th>
              <th class="total-col">Ref. Toplam</th>
            </tr>
          </thead>
          <tbody>${rowsHTML}</tbody>
        </table>
        <div class="sale-subtotal">
          ${partialTag}
          <span class="subtotal-label">Satış Toplamı (ref.):</span>
          <span class="subtotal-value">₺${saleTotal.toLocaleString("tr-TR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</span>
        </div>
      </div>`;
        })
        .join("");

      return `
    <div class="firm-page">
      <div class="page-header">
        <div>
          <div class="brand-mark">2B Hub</div>
          <div class="doc-type">B2B Satış Kayıtları</div>
        </div>
        <div class="header-right">
          <div class="firm-name-big">${firm.firm_name}</div>
          <div class="date-range">${dateLabel}</div>
        </div>
      </div>
      ${salesHTML}
      <div class="firm-total-row">
        <span class="firm-total-label">Genel Toplam (Referans Fiyat):</span>
        <span class="firm-total-value">₺${firmTotal.toLocaleString("tr-TR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}</span>
      </div>
      <div class="disclaimer">
        2B Hub · Referans fiyatlar güncel ürün fiyatlarından hesaplanmıştır. Faturalama öncesi teyit ediniz.
      </div>
    </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>B2B Kayıtlar — ${dateLabel}</title>
  <style>
    @page { size: A4; margin: 15mm 20mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: white; color: #1A1A1A; }

    .firm-page { page-break-after: always; min-height: 250mm; }
    .firm-page:last-child { page-break-after: auto; }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding-bottom: 14px; border-bottom: 2px solid #8B7355; margin-bottom: 20px;
    }
    .brand-mark { font-size: 16px; font-weight: 700; color: #1A1A1A; }
    .doc-type { font-size: 10px; color: #7A7468; margin-top: 2px; }
    .header-right { text-align: right; }
    .firm-name-big { font-size: 20px; font-weight: 700; color: #1A1A1A; }
    .date-range { font-size: 11px; color: #7A7468; margin-top: 3px; }

    .sale-block { margin-bottom: 20px; }
    .sale-header-row {
      display: flex; justify-content: space-between; align-items: flex-start;
      background: #F7F5F0; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px;
    }
    .sale-num { font-size: 13px; font-weight: 700; }
    .sale-date { font-size: 12px; }
    .sale-emp { font-size: 11px; color: #7A7468; }
    .sale-note { font-size: 11px; color: #7A7468; font-style: italic; margin-top: 3px; }

    .badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 10px; white-space: nowrap; }
    .badge.done { background: #E8F4EC; color: #5A7C65; }
    .badge.pending { background: #FEF3C7; color: #B45309; }

    table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    thead tr { border-bottom: 1px solid #E5E0D8; }
    th {
      padding: 5px 7px; font-size: 9px; font-weight: 700; color: #7A7468;
      text-transform: uppercase; letter-spacing: 0.4px; text-align: left;
    }
    td { padding: 6px 7px; border-bottom: 1px solid #F0EBE3; vertical-align: top; }
    .num { width: 28px; color: #B5AFA6; }
    .name { min-width: 160px; }
    .variation { font-size: 10px; color: #7A7468; margin-top: 1px; }
    .swap-badge { color: #3B82F6; font-size: 10px; }
    .p2-badge { color: #7C3AED; font-size: 9px; font-weight: 700; background: #EDE9FE; padding: 1px 4px; border-radius: 3px; margin-right: 2px; }
    .netsis { font-size: 10.5px; font-weight: 700; color: #8B7355; width: 90px; }
    .qty-col { text-align: right; width: 45px; font-weight: 600; }
    .price-col { text-align: right; width: 85px; }
    .total-col { text-align: right; width: 90px; font-weight: 700; }

    .sale-subtotal {
      display: flex; justify-content: flex-end; align-items: center; gap: 16px;
      padding: 7px 10px; background: #F7F5F0; border-radius: 5px; margin-top: 4px;
    }
    .partial-tag { font-size: 10px; color: #D97706; font-weight: 600; margin-right: auto; }
    .subtotal-label { font-size: 11px; color: #7A7468; }
    .subtotal-value { font-size: 13px; font-weight: 800; }

    .firm-total-row {
      display: flex; justify-content: flex-end; align-items: center; gap: 16px;
      margin-top: 20px; padding-top: 12px; border-top: 2px solid #8B7355;
    }
    .firm-total-label { font-size: 12px; font-weight: 600; color: #7A7468; }
    .firm-total-value { font-size: 20px; font-weight: 800; }

    .disclaimer {
      margin-top: 20px; padding-top: 10px; border-top: 1px solid #E5E0D8;
      font-size: 9px; color: #B5AFA6; text-align: center;
    }
  </style>
</head>
<body>
  ${firmPages}
</body>
</html>`;
}

// ── Page Component ─────────────────────────────────────────────

export default function RecordsPage() {
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom);
  const [dateTo, setDateTo] = useState(getDefaultDateTo);
  const [firms, setFirms] = useState<FirmRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unprocessedOnly, setUnprocessedOnly] = useState(false);
  const [expandedFirms, setExpandedFirms] = useState<Set<string>>(new Set());
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
      });
      const res = await fetch(`/api/b2b-sales/records?${params}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Yüklenemedi");
      const loaded: FirmRecord[] = data.firms || [];
      setFirms(loaded);
      setExpandedFirms(new Set(loaded.map((f) => f.firm_id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıtlar yüklenemedi");
    }
    setLoading(false);
  }, [dateFrom, dateTo]);

  // Auto-fetch on mount with default dates
  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleMarkDone(saleId: string, currentlyProcessed: boolean) {
    setProcessingId(saleId);
    try {
      const action = currentlyProcessed ? "unmark_processed" : "mark_processed";
      const res = await fetch(`/api/b2b-sales/${saleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Güncelleme başarısız");

      // Optimistic update
      setFirms((prev) =>
        prev.map((firm) => ({
          ...firm,
          unprocessed_count: firm.sales.filter((s) =>
            s.id === saleId ? currentlyProcessed : !s.is_processed
          ).length,
          sales: firm.sales.map((s) =>
            s.id === saleId ? { ...s, is_processed: !currentlyProcessed } : s
          ),
        }))
      );
    } catch {
      fetchRecords();
    }
    setProcessingId(null);
  }

  function handlePrintFirm(firm: FirmRecord) {
    const html = buildPrintHTML([firm], dateFrom, dateTo, unprocessedOnly);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  }

  function handlePrintAll() {
    const html = buildPrintHTML(firms, dateFrom, dateTo, unprocessedOnly);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  }

  function toggleFirm(firmId: string) {
    setExpandedFirms((prev) => {
      const next = new Set(prev);
      if (next.has(firmId)) next.delete(firmId);
      else next.add(firmId);
      return next;
    });
  }

  // Client-side filter
  const displayFirms = unprocessedOnly
    ? firms
        .map((f) => ({ ...f, sales: f.sales.filter((s) => !s.is_processed) }))
        .filter((f) => f.sales.length > 0)
    : firms;

  const totalUnprocessed = firms.reduce(
    (sum, f) => sum + f.unprocessed_count,
    0
  );
  const totalSales = firms.reduce((sum, f) => sum + f.sales.length, 0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-hub-border/30 text-hub-secondary hover:text-hub-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-hub-primary">
              B2B Kayıtlar
            </h1>
            <p className="text-sm text-hub-secondary mt-0.5">
              Faturalama için B2B satış kayıtları
            </p>
          </div>
        </div>
        {displayFirms.length > 0 && (
          <button
            onClick={handlePrintAll}
            className="btn-primary flex items-center gap-2 text-sm flex-shrink-0"
          >
            <FileDown className="w-4 h-4" />
            Tümünü İndir / Yazdır
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="card p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label-base">Başlangıç</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-base"
            />
          </div>
          <div>
            <label className="label-base">Bitiş</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-base"
            />
          </div>
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="btn-primary flex items-center gap-2 self-end"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Calendar className="w-4 h-4" />
            )}
            {loading ? "Yükleniyor…" : "Getir"}
          </button>
          {firms.length > 0 && (
            <button
              onClick={() => setUnprocessedOnly((v) => !v)}
              className={`self-end flex items-center gap-2 text-sm px-4 py-3 rounded-xl border transition-all ${
                unprocessedOnly
                  ? "bg-amber-50 border-amber-300 text-amber-700 font-medium"
                  : "border-hub-border text-hub-secondary hover:text-hub-primary hover:border-hub-accent/50"
              }`}
            >
              {unprocessedOnly ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
              Sadece Bekleyenler
            </button>
          )}
        </div>

        {firms.length > 0 && (
          <div className="flex gap-6 mt-4 pt-4 border-t border-hub-border/50">
            <div className="text-sm text-hub-secondary">
              <span className="font-semibold text-hub-primary">
                {firms.length}
              </span>{" "}
              firma
            </div>
            <div className="text-sm text-hub-secondary">
              <span className="font-semibold text-hub-primary">
                {totalSales}
              </span>{" "}
              satış
            </div>
            {totalUnprocessed > 0 && (
              <div className="text-sm text-amber-600">
                <span className="font-semibold">{totalUnprocessed}</span>{" "}
                bekleyen
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-hub-error text-sm p-4 bg-red-50 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-hub-border/40" />
                <div className="space-y-2">
                  <div className="h-4 bg-hub-border/50 rounded w-40" />
                  <div className="h-3 bg-hub-border/30 rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && firms.length === 0 && !error && (
        <div className="card p-14 text-center">
          <Building2 className="w-12 h-12 text-hub-muted mx-auto mb-4" />
          <p className="text-hub-secondary font-medium">
            Bu tarih aralığında B2B satış bulunamadı.
          </p>
          <p className="text-sm text-hub-muted mt-1">
            Tarih aralığını genişletip tekrar deneyin.
          </p>
        </div>
      )}

      {/* Firms accordion */}
      {!loading &&
        displayFirms.map((firm) => {
          const isExpanded = expandedFirms.has(firm.firm_id);
          const firmTotal = firm.sales.reduce(
            (sum, s) => sum + saleTotalTRY(s),
            0
          );
          const unprocessedInFirm = firm.sales.filter(
            (s) => !s.is_processed
          ).length;

          return (
            <div key={firm.firm_id} className="card overflow-hidden">
              {/* Firm header */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-hub-bg/40 transition-colors"
                onClick={() => toggleFirm(firm.firm_id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-hub-accent/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-hub-accent" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-hub-primary text-base">
                      {firm.firm_name}
                    </h2>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-hub-secondary">
                        {firm.sales.length} satış
                      </span>
                      {unprocessedInFirm > 0 && (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          {unprocessedInFirm} bekliyor
                        </span>
                      )}
                      {firmTotal > 0 && (
                        <span className="text-xs font-semibold text-hub-accent">
                          {fmt(firmTotal)} ref.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrintFirm(firm);
                    }}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Yazdır
                  </button>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-hub-secondary" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-hub-secondary" />
                  )}
                </div>
              </div>

              {/* Firm sales */}
              {isExpanded && (
                <div className="border-t border-hub-border/50 divide-y divide-hub-border/30">
                  {firm.sales.map((sale) => {
                    const activeItems = getActiveItems(sale.items);
                    const saleTotal = activeItems.reduce(
                      (sum, i) => sum + i.line_total_try,
                      0
                    );
                    const isFullyReturned = sale.status === "returned";

                    return (
                      <div
                        key={sale.id}
                        className={`p-5 ${isFullyReturned ? "opacity-50" : ""}`}
                      >
                        {/* Sale header row */}
                        <div className="flex items-start justify-between mb-4 gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-hub-primary text-sm">
                                #{sale.sale_number}
                              </span>
                              <span className="text-sm text-hub-secondary">
                                {formatDateTime(sale.created_at)}
                              </span>
                              <span className="text-hub-muted text-xs">·</span>
                              <span className="text-xs text-hub-secondary">
                                {sale.employee_username}
                              </span>
                              {sale.status === "partially_returned" && (
                                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                  Kısmi İade
                                </span>
                              )}
                              {sale.status === "returned" && (
                                <span className="text-[10px] font-semibold text-hub-error bg-red-50 px-2 py-0.5 rounded-full">
                                  İade Edildi
                                </span>
                              )}
                            </div>
                            {sale.note && (
                              <p className="text-xs text-hub-secondary mt-1 italic">
                                📝 {sale.note}
                              </p>
                            )}
                          </div>

                          {/* Status + action */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {sale.is_processed ? (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-hub-success bg-hub-success/10 px-2.5 py-1 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                İşlendi
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                                <Clock className="w-3.5 h-3.5" />
                                Bekliyor
                              </span>
                            )}
                            <button
                              onClick={() =>
                                handleMarkDone(sale.id, sale.is_processed)
                              }
                              disabled={processingId === sale.id}
                              className={`text-xs py-1.5 px-3 rounded-lg border transition-all flex items-center gap-1.5 ${
                                sale.is_processed
                                  ? "border-hub-border text-hub-secondary hover:border-hub-error/50 hover:text-hub-error"
                                  : "border-hub-success/40 text-hub-success bg-hub-success/5 hover:bg-hub-success/10"
                              }`}
                            >
                              {processingId === sale.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : sale.is_processed ? (
                                <RotateCcw className="w-3 h-3" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              {sale.is_processed ? "Geri Al" : "İşlendi"}
                            </button>
                          </div>
                        </div>

                        {/* Items table */}
                        {activeItems.length > 0 ? (
                          <div className="rounded-xl overflow-hidden border border-hub-border/40">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-hub-bg/60 border-b border-hub-border/40">
                                  <th className="text-left px-4 py-2.5 text-[10px] font-bold text-hub-secondary uppercase tracking-[0.8px] w-8">
                                    #
                                  </th>
                                  <th className="text-left px-4 py-2.5 text-[10px] font-bold text-hub-secondary uppercase tracking-[0.8px]">
                                    Ürün
                                  </th>
                                  <th className="text-left px-4 py-2.5 text-[10px] font-bold text-hub-secondary uppercase tracking-[0.8px] w-28">
                                    Netsis Kodu
                                  </th>
                                  <th className="text-right px-4 py-2.5 text-[10px] font-bold text-hub-secondary uppercase tracking-[0.8px] w-16">
                                    Adet
                                  </th>
                                  <th className="text-right px-4 py-2.5 text-[10px] font-bold text-hub-secondary uppercase tracking-[0.8px] w-28">
                                    Ref. Birim
                                  </th>
                                  <th className="text-right px-4 py-2.5 text-[10px] font-bold text-hub-secondary uppercase tracking-[0.8px] w-28">
                                    Ref. Toplam
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeItems.map((item, idx) => {
                                  const qty =
                                    Number(item.quantity) -
                                    Number(item.returned_quantity);
                                  return (
                                    <tr
                                      key={item.id}
                                      className="border-b border-hub-border/20 last:border-0 hover:bg-hub-bg/20 transition-colors"
                                    >
                                      <td className="px-4 py-3 text-xs text-hub-muted">
                                        {idx + 1}
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-start gap-2">
                                          {item.is_swap && (
                                            <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-semibold flex-shrink-0 mt-0.5">
                                              ↔ SWAP
                                            </span>
                                          )}
                                          {item.price_type === "price2" && (
                                            <span className="text-[9px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-semibold flex-shrink-0 mt-0.5">
                                              P2
                                            </span>
                                          )}
                                          <div>
                                            <p className="font-medium text-hub-primary text-sm">
                                              {item.product_name}
                                            </p>
                                            {item.variation_label && (
                                              <p className="text-xs text-hub-secondary mt-0.5">
                                                {item.variation_label}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-xs font-semibold text-hub-accent">
                                        {item.netsis_code || (
                                          <span className="text-hub-muted font-normal">
                                            —
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right font-semibold">
                                        {qty}
                                      </td>
                                      <td className="px-4 py-3 text-right text-hub-secondary text-sm">
                                        {item.sale_price_try ? (
                                          fmt(item.sale_price_try)
                                        ) : (
                                          <span className="text-hub-muted">
                                            —
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right font-semibold text-sm">
                                        {item.line_total_try ? (
                                          fmt(item.line_total_try)
                                        ) : (
                                          <span className="text-hub-muted font-normal">
                                            —
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {saleTotal > 0 && (
                              <div className="flex justify-end items-center gap-4 px-4 py-2.5 bg-hub-bg/60 border-t border-hub-border/40">
                                <span className="text-xs text-hub-secondary">
                                  Satış Toplamı (ref.):
                                </span>
                                <span className="text-sm font-bold text-hub-primary">
                                  {fmt(saleTotal)}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-hub-muted italic py-2">
                            <Package className="w-4 h-4" />
                            Tüm ürünler iade edildi.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

      {/* Reference prices note */}
      {!loading && firms.length > 0 && (
        <p className="text-center text-xs text-hub-muted pb-4">
          * Ref. fiyatlar güncel ürün fiyatlarından hesaplanmıştır. Faturalama
          öncesi teyit ediniz.
        </p>
      )}
    </div>
  );
}
