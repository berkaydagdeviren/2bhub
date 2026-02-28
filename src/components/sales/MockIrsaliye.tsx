"use client";

import { useRef } from "react";
import { Download, Share2, X, Printer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "@/lib/utils";
import type { B2BSale } from "@/types";

interface MockIrsaliyeProps {
  sale: B2BSale | null;
  onClose: () => void;
}

export default function MockIrsaliye({ sale, onClose }: MockIrsaliyeProps) {
  const irsaliyeRef = useRef<HTMLDivElement>(null);

  if (!sale) return null;

  const items = (sale.items || []).filter(
    (item) => Number(item.returned_quantity) < Number(item.quantity)
  );

  function generateHTML(): string {
    let rows = "";
    if (!sale) return "";
    items.forEach((item, i) => {
      const activeQty =
        Number(item.quantity) - Number(item.returned_quantity);
      rows += `
        <tr style="border-bottom: 1px solid #E5E0D8;">
          <td style="padding: 10px 12px; font-size: 13px; color: #7A7468;">${i + 1}</td>
          <td style="padding: 10px 12px;">
            <div style="font-size: 13px; font-weight: 600; color: #1A1A1A;">${item.product_name}</div>
            ${item.variation_label ? `<div style="font-size: 11px; color: #7A7468; margin-top: 2px;">${item.variation_label}</div>` : ""}
            ${item.is_swap ? `<div style="font-size: 10px; color: #3B82F6; margin-top: 2px;">↔ Swap${item.swap_note ? ": " + item.swap_note : ""}</div>` : ""}
          </td>
          <td style="padding: 10px 12px; text-align: right; font-size: 13px; font-weight: 600; color: #1A1A1A;">${activeQty}</td>
        </tr>`;
    });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: white; }
    .page {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 32px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 2px solid #8B7355;
    }
    .logo-area {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-box {
      width: 40px;
      height: 40px;
      background: #F0EBE3;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 800;
      color: #8B7355;
    }
    .logo-text {
      font-size: 20px;
      font-weight: 700;
      color: #1A1A1A;
      letter-spacing: -0.5px;
    }
    .doc-info {
      text-align: right;
    }
    .doc-title {
      font-size: 11px;
      font-weight: 700;
      color: #8B7355;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .doc-number {
      font-size: 13px;
      color: #1A1A1A;
      font-weight: 600;
      margin-top: 4px;
    }
    .doc-date {
      font-size: 12px;
      color: #7A7468;
      margin-top: 2px;
    }
    .firm-section {
      background: #F7F5F0;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .firm-label {
      font-size: 10px;
      font-weight: 700;
      color: #7A7468;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .firm-name {
      font-size: 18px;
      font-weight: 700;
      color: #1A1A1A;
    }
    .note-text {
      font-size: 12px;
      color: #7A7468;
      margin-top: 4px;
      font-style: italic;
    }
    .employee-text {
      font-size: 11px;
      color: #B5AFA6;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    thead tr {
      border-bottom: 2px solid #E5E0D8;
    }
    th {
      padding: 8px 12px;
      font-size: 10px;
      font-weight: 700;
      color: #7A7468;
      text-transform: uppercase;
      letter-spacing: 1px;
      text-align: left;
    }
    th:last-child {
      text-align: right;
    }
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #E5E0D8;
    }
    .footer-text {
      font-size: 10px;
      color: #B5AFA6;
      letter-spacing: 0.5px;
    }
    .total-row {
      background: #F7F5F0;
      border-radius: 8px;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .total-label {
      font-size: 12px;
      font-weight: 600;
      color: #7A7468;
    }
    .total-value {
      font-size: 16px;
      font-weight: 800;
      color: #1A1A1A;
    }
    @media print {
      body { margin: 0; }
      .page { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo-area">
        <div class="logo-box">2B</div>
        <div class="logo-text">Hub</div>
      </div>
      <div class="doc-info">
        <div class="doc-title">İrsaliye</div>
        <div class="doc-number">#${sale?.sale_number}</div>
        <div class="doc-date">${formatDate(sale.created_at)}</div>
      </div>
    </div>

    <div class="firm-section">
      <div class="firm-label">Firma</div>
      <div class="firm-name">${sale?.firm_name}</div>
      ${sale?.note ? `<div class="note-text">📝 ${sale?.note}</div>` : ""}
      <div class="employee-text">Teslim eden: ${sale?.employee_username}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Ürün</th>
          <th style="width: 80px; text-align: right;">Adet</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="total-row">
      <div class="total-label">Toplam Kalem</div>
      <div class="total-value">${items.length} ürün</div>
    </div>

    <div class="footer">
      <div class="footer-text">2B Hub • ${formatDate(sale.created_at)}</div>
    </div>
  </div>
</body>
</html>`;
  }

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(generateHTML());
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  }

  async function handleDownload() {
    try {
      // Create an iframe to render HTML
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.left = "-9999px";
      iframe.style.width = "600px";
      iframe.style.height = "900px";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      if (!doc) return;

      doc.open();
      doc.write(generateHTML());
      doc.close();

      // Wait for render
      await new Promise((r) => setTimeout(r, 500));

      // Use html2canvas if available, otherwise fallback to print
      handlePrint();
      document.body.removeChild(iframe);
    } catch {
      handlePrint();
    }
  }

  async function handleShare() {
    // Create a blob of the HTML for sharing
    const blob = new Blob([generateHTML()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    if (!sale) return "";
    if (navigator.share) {
      try {
        // Try native share (works on mobile)
        await navigator.share({
          title: `İrsaliye #${sale?.sale_number} - ${sale?.firm_name}`,
          text: `${sale?.firm_name} - ${items.length} ürün - ${formatDate(sale.created_at)}`,
        });
      } catch {
        // Fallback: open in new tab for manual screenshot
        window.open(url, "_blank");
      }
    } else {
      // Desktop: open in new tab
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(generateHTML());
        win.document.close();
      }
    }
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
            className="fixed inset-x-4 top-[3%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-xl bg-white rounded-2xl shadow-hub-lg z-[90] overflow-hidden max-h-[94vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-hub-border/50 flex-shrink-0">
              <h3 className="text-base font-semibold text-hub-primary">
                Mock İrsaliye
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-y-auto p-6">
              <div
                ref={irsaliyeRef}
                className="bg-white border border-hub-border/30 rounded-xl overflow-hidden"
              >
                {/* Doc Header */}
                <div className="px-6 pt-6 pb-4 flex items-start justify-between border-b-2 border-hub-accent">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-hub-accent/10 flex items-center justify-center">
                      <span className="text-sm font-extrabold text-hub-accent">
                        2B
                      </span>
                    </div>
                    <span className="text-xl font-bold text-hub-primary tracking-tight">
                      Hub
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-hub-accent uppercase tracking-[1.5px]">
                      İrsaliye
                    </p>
                    <p className="text-sm font-semibold text-hub-primary mt-0.5">
                      #{sale.sale_number}
                    </p>
                    <p className="text-xs text-hub-secondary">
                      {formatDate(sale.created_at)}
                    </p>
                  </div>
                </div>

                {/* Firm */}
                <div className="px-6 py-4 bg-hub-bg/50">
                  <p className="text-[10px] font-bold text-hub-secondary uppercase tracking-[1px]">
                    Firma
                  </p>
                  <p className="text-lg font-bold text-hub-primary mt-0.5">
                    {sale.firm_name}
                  </p>
                  {sale.note && (
                    <p className="text-xs text-hub-secondary mt-1 italic">
                      📝 {sale.note}
                    </p>
                  )}
                  <p className="text-[11px] text-hub-muted mt-1">
                    Teslim eden: {sale.employee_username}
                  </p>
                </div>

                {/* Items Table */}
                <div className="px-6 py-4">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-hub-border">
                        <th className="text-left text-[10px] font-bold text-hub-secondary uppercase tracking-[1px] pb-2 w-8">
                          #
                        </th>
                        <th className="text-left text-[10px] font-bold text-hub-secondary uppercase tracking-[1px] pb-2">
                          Ürün
                        </th>
                        <th className="text-right text-[10px] font-bold text-hub-secondary uppercase tracking-[1px] pb-2 w-16">
                          Adet
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => {
                        const activeQty =
                          Number(item.quantity) -
                          Number(item.returned_quantity);
                        return (
                          <tr
                            key={item.id}
                            className="border-b border-hub-border/30"
                          >
                            <td className="py-2.5 text-xs text-hub-muted">
                              {i + 1}
                            </td>
                            <td className="py-2.5">
                              <p className="text-sm font-semibold text-hub-primary">
                                {item.product_name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {item.variation_label && (
                                  <span className="text-[10px] text-hub-secondary">
                                    {item.variation_label}
                                  </span>
                                )}
                                {item.is_swap && (
                                  <span className="text-[9px] text-blue-600">
                                    ↔ Swap
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 text-right text-sm font-bold text-hub-primary">
                              {activeQty}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="mx-6 mb-4 bg-hub-bg/50 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-xs font-semibold text-hub-secondary">
                    Toplam Kalem
                  </span>
                  <span className="text-base font-extrabold text-hub-primary">
                    {items.length} ürün
                  </span>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-hub-border/30 text-center">
                  <p className="text-[10px] text-hub-muted tracking-wide">
                    2B Hub • {formatDate(sale.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-hub-border/50 flex-shrink-0">
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={handlePrint}
                  className="btn-secondary flex items-center justify-center gap-2 text-sm py-2.5"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={handleShare}
                  className="btn-primary flex items-center justify-center gap-2 text-sm py-2.5"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <button
                  onClick={handleDownload}
                  className="btn-secondary flex items-center justify-center gap-2 text-sm py-2.5"
                >
                  <Download className="w-4 h-4" />
                  Open
                </button>
              </div>
              <p className="text-[10px] text-hub-muted text-center mt-2">
                Share opens in a new tab — screenshot or save as PDF
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}