"use client";

import { useRef, useState } from "react";
import { Download, Share2, X, Printer, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "@/lib/utils";
import type { B2BSale } from "@/types";

interface MockIrsaliyeProps {
  sale: B2BSale | null;
  onClose: () => void;
  onShared?: () => void;
}

// Only label when price2 — price1 items without a price2 counterpart need no label
function priceLabel(type: "price1" | "price2" | string | undefined): string | null {
  if (type === "price2") return "Beyaz/Galvaniz";
  if (type === "price1") return "Siyah";
  return null;
}

// Does this sale have any mix of price types (meaning labels are meaningful)?
function hasMixedPriceTypes(items: B2BSale["items"]): boolean {
  if (!items) return false;
  const types = new Set(items.map((i) => i.price_type));
  return types.size > 1;
}

export default function MockIrsaliye({ sale, onClose, onShared }: MockIrsaliyeProps) {
  const irsaliyeRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  if (!sale) return null;

  const items = (sale.items || []).filter(
    (item) => Number(item.returned_quantity) < Number(item.quantity)
  );
  const showPriceLabels = hasMixedPriceTypes(items);

  async function captureAsPng(): Promise<Blob> {
    const html2canvas = (await import("html2canvas")).default;
    const el = irsaliyeRef.current!;
    const canvas = await html2canvas(el, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png", 1.0);
    });
  }

  async function handleShare() {
    if (!sale) return;
    setSharing(true);
    try {
      const blob = await captureAsPng();
      const file = new File([blob], `irsaliye-${sale.sale_number}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        onShared?.();
        if (!onShared) onClose();
      } else {
        downloadBlob(blob, `irsaliye-${sale.sale_number}.png`);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Share failed:", err);
        alert("Paylaşım başarısız oldu. Ekran görüntüsü alabilirsiniz.");
      }
    }
    setSharing(false);
  }

  async function handleDownload() {
    if (!sale) return;
    setSharing(true);
    try {
      const blob = await captureAsPng();
      downloadBlob(blob, `irsaliye-${sale.sale_number}.png`);
    } catch {
      handlePrint();
    }
    setSharing(false);
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(generatePrintHTML());
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  }

  function generatePrintHTML(): string {
    if (!sale) return "";
    let rows = "";
    const mixed = hasMixedPriceTypes(items);
    items.forEach((item, i) => {
      const activeQty = Number(item.quantity) - Number(item.returned_quantity);
      const pLabel = mixed ? priceLabel(item.price_type) : null;
      rows += `
        <tr style="border-bottom:1px solid #E5E0D8;">
          <td style="padding:8px 10px;font-size:12px;color:#7A7468;">${i + 1}</td>
          <td style="padding:8px 10px;">
            <span style="font-size:13px;font-weight:600;color:#1A1A1A;">${item.product_name}</span>
            ${item.variation_label ? `<span style="font-size:11px;color:#7A7468;margin-left:6px;">${item.variation_label}</span>` : ""}
            ${pLabel ? `<span style="font-size:10px;color:#8B7355;background:#F0EBE3;border-radius:4px;padding:1px 6px;margin-left:6px;">${pLabel}</span>` : ""}
            ${item.is_swap ? `<span style="font-size:10px;color:#3B82F6;margin-left:4px;">↔ Swap${item.swap_note ? ": " + item.swap_note : ""}</span>` : ""}
          </td>
          <td style="padding:8px 10px;text-align:right;font-size:13px;font-weight:700;color:#1A1A1A;">${activeQty}</td>
        </tr>`;
    });

    const logoUrl = typeof window !== "undefined" ? window.location.origin + "/logo.PNG" : "/logo.PNG";
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:system-ui,-apple-system,sans-serif; background:white; }
.page { max-width:580px; margin:0 auto; padding:28px 24px; }
.header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; padding-bottom:14px; border-bottom:2px solid #8B7355; }
.logo { height:36px; object-fit:contain; }
.doc-info { text-align:right; }
.doc-title { font-size:10px; font-weight:700; color:#8B7355; text-transform:uppercase; letter-spacing:1.5px; }
.doc-number { font-size:13px; color:#1A1A1A; font-weight:600; margin-top:3px; }
.doc-date { font-size:11px; color:#7A7468; margin-top:2px; }
.firm-section { background:#F7F5F0; border-radius:10px; padding:12px 16px; margin-bottom:16px; }
.firm-label { font-size:9px; font-weight:700; color:#7A7468; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px; }
.firm-name { font-size:16px; font-weight:700; color:#1A1A1A; }
table { width:100%; border-collapse:collapse; }
thead tr { border-bottom:2px solid #E5E0D8; }
th { padding:6px 10px; font-size:9px; font-weight:700; color:#7A7468; text-transform:uppercase; letter-spacing:1px; text-align:left; }
th:last-child { text-align:right; }
.footer { text-align:center; padding-top:14px; border-top:1px solid #E5E0D8; margin-top:14px; font-size:10px; color:#B5AFA6; }
</style></head><body><div class="page">
<div class="header">
  <img src="${logoUrl}" class="logo" alt="2B Hub" />
  <div class="doc-info">
    <div class="doc-title">İrsaliye</div>
    <div class="doc-number">#${sale.sale_number}</div>
    <div class="doc-date">${formatDate(sale.created_at)}</div>
  </div>
</div>
<div class="firm-section">
  <div class="firm-label">Firma</div>
  <div class="firm-name">${sale.firm_name}</div>
  ${sale.note ? `<div style="font-size:11px;color:#7A7468;margin-top:3px;font-style:italic;">📝 ${sale.note}</div>` : ""}
  <div style="font-size:10px;color:#B5AFA6;margin-top:3px;">Teslim eden: ${sale.employee_username}</div>
</div>
<table>
  <thead><tr>
    <th style="width:32px;">#</th>
    <th>Ürün</th>
    <th style="width:60px;text-align:right;">Adet</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">2B Hub • ${formatDate(sale.created_at)}</div>
</div></body></html>`;
  }

  return (
    <AnimatePresence>
      {sale && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[80]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-3 top-[2%] bottom-[2%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-xl bg-white rounded-2xl shadow-hub-lg z-[90] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-hub-border/50 flex-shrink-0">
              <h3 className="text-sm font-semibold text-hub-primary">İrsaliye Önizleme</h3>
              <button
                onClick={onClose}
                className="p-1.5 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview — scrollable */}
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
              <div
                ref={irsaliyeRef}
                className="bg-white border border-hub-border/30 rounded-xl overflow-hidden"
              >
                {/* Doc Header */}
                <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b-2 border-hub-accent">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.PNG" alt="2B Hub" className="h-7 object-contain" />
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-hub-accent uppercase tracking-[1.5px]">İrsaliye</p>
                    <p className="text-xs font-semibold text-hub-primary">#{sale.sale_number}</p>
                    <p className="text-[10px] text-hub-secondary">{formatDate(sale.created_at)}</p>
                  </div>
                </div>

                {/* Firm */}
                <div className="px-4 py-2.5 bg-hub-bg/50 border-b border-hub-border/20">
                  <p className="text-[9px] font-bold text-hub-secondary uppercase tracking-[1px]">Firma</p>
                  <p className="text-sm font-bold text-hub-primary leading-tight">{sale.firm_name}</p>
                  {sale.note && (
                    <p className="text-[10px] text-hub-secondary mt-0.5 italic">📝 {sale.note}</p>
                  )}
                  <p className="text-[10px] text-hub-muted">Teslim: {sale.employee_username}</p>
                </div>

                {/* Items Table */}
                <div className="px-4 py-2">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-hub-border/50">
                        <th className="text-left text-[9px] font-bold text-hub-secondary uppercase pb-1.5 w-6">#</th>
                        <th className="text-left text-[9px] font-bold text-hub-secondary uppercase pb-1.5">Ürün</th>
                        <th className="text-right text-[9px] font-bold text-hub-secondary uppercase pb-1.5 w-12">Adet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => {
                        const activeQty = Number(item.quantity) - Number(item.returned_quantity);
                        const pLabel = priceLabel(item.price_type);
                        return (
                          <tr key={item.id} className="border-b border-hub-border/20 last:border-0">
                            <td className="py-1.5 text-[10px] text-hub-muted align-top">{i + 1}</td>
                            <td className="py-1.5 pr-2">
                              <span className="text-xs font-semibold text-hub-primary">{item.product_name}</span>
                              {item.variation_label && (
                                <span className="text-[10px] text-hub-secondary ml-1">{item.variation_label}</span>
                              )}
                              {showPriceLabels && pLabel && (
                                <span className="ml-1 text-[9px] font-medium text-hub-accent bg-hub-accent/10 px-1.5 py-0.5 rounded">
                                  {pLabel}
                                </span>
                              )}
                              {item.is_swap && (
                                <span className="text-[9px] text-blue-600 ml-1">↔ Swap</span>
                              )}
                            </td>
                            <td className="py-1.5 text-right text-xs font-bold text-hub-primary align-top">{activeQty}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-hub-border/20 text-center">
                  <p className="text-[9px] text-hub-muted">2B Hub • {formatDate(sale.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Actions — always visible, never pushed off screen */}
            <div className="px-3 py-3 border-t border-hub-border/50 flex-shrink-0 bg-white">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handlePrint}
                  disabled={sharing}
                  className="btn-secondary flex items-center justify-center gap-1.5 text-sm py-2.5"
                >
                  <Printer className="w-4 h-4" />
                  Yazdır
                </button>
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className="btn-primary flex items-center justify-center gap-1.5 text-sm py-2.5"
                >
                  {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                  {sharing ? "..." : "Paylaş"}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={sharing}
                  className="btn-secondary flex items-center justify-center gap-1.5 text-sm py-2.5"
                >
                  {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  PNG
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
