"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check, DollarSign, Euro, QrCode, Trash2, Printer } from "lucide-react";
import type { CurrencyRates } from "@/types";

interface QrListItem {
  product_id: string;
  product_name: string;
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [rates, setRates] = useState<CurrencyRates>({ usd_try: 0, eur_try: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [qrList, setQrList] = useState<QrListItem[]>([]);
  const [printingQr, setPrintingQr] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.settings?.currency_rates) {
        setRates(data.settings.currency_rates as CurrencyRates);
      }
      if (Array.isArray(data.settings?.qr_print_list)) {
        setQrList(data.settings.qr_print_list as QrListItem[]);
      } else {
        setQrList([]);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      fetchSettings();
      setSaved(false);
    }
  }, [open, fetchSettings]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "currency_rates",
          value: rates,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
    setSaving(false);
  }

  function handleRateChange(currency: keyof CurrencyRates, val: string) {
    const num = val === "" ? 0 : parseFloat(val);
    if (isNaN(num)) return;
    setRates((prev) => ({ ...prev, [currency]: num }));
  }

  async function saveQrList(newList: QrListItem[]) {
    setQrList(newList);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "qr_print_list", value: newList }),
      });
    } catch (err) {
      console.error("Failed to save QR list:", err);
    }
  }

  async function removeFromQrList(productId: string) {
    await saveQrList(qrList.filter((item) => item.product_id !== productId));
  }

  async function handlePrintQRList() {
    if (qrList.length === 0) return;
    setPrintingQr(true);
    try {
      const qrDataUrls: Array<{ name: string; dataUrl: string; shortCode: string }> = [];

      for (const item of qrList) {
        try {
          const res = await fetch(`/api/products/${item.product_id}/qr`, {
            cache: "no-store",
          });
          const data = await res.json();
          if (data.qr_data_url) {
            const shortCode = item.product_id.replace(/-/g, "").slice(0, 8).toUpperCase();
            qrDataUrls.push({ name: item.product_name, dataUrl: data.qr_data_url, shortCode });
          }
        } catch {
          // skip failed items
        }
      }

      if (qrDataUrls.length === 0) return;

      const cardsHtml = qrDataUrls
        .map(
          (item) => `
          <div class="card">
            <img src="${item.dataUrl}" alt="QR" />
            <p class="name">${item.name}</p>
            <p class="code">${item.shortCode}</p>
          </div>`
        )
        .join("");

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>QR Baskı Listesi</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: white; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; }
    .card { border: 1px solid #E5E0D8; border-radius: 8px; padding: 6mm; text-align: center; break-inside: avoid; }
    .card img { width: 100%; display: block; }
    .card .name { font-size: 9pt; margin-top: 3mm; word-break: break-word; color: #1A1A1A; font-weight: 600; }
    .card .code { font-size: 9pt; margin-top: 2mm; font-family: monospace; font-weight: 700; color: #8B7355; letter-spacing: 0.08em; background: #F7F5F0; border-radius: 4px; padding: 1mm 2mm; display: inline-block; }
  </style>
</head>
<body>
  <div class="grid">${cardsHtml}</div>
  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`);
      printWindow.document.close();
    } finally {
      setPrintingQr(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
          />

          {/* Panel — slides from right */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-hub-lg z-[70] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-16 border-b border-hub-border/50">
              <h2 className="text-lg font-semibold text-hub-primary">Settings</h2>
              <button
                onClick={onClose}
                className="p-2 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-hub-muted" />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Currency Section */}
                  <div>
                    <h3 className="label-base mb-4">Currency Exchange Rates</h3>
                    <p className="text-xs text-hub-muted mb-5 -mt-2">
                      Set current rates for automatic price conversion
                    </p>

                    <div className="space-y-4">
                      {/* USD → TRY */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-hub-bg flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-4 h-4 text-hub-accent" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-hub-secondary mb-1 block">
                            1 USD =
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={rates.usd_try || ""}
                              onChange={(e) => handleRateChange("usd_try", e.target.value)}
                              className="input-base pr-12"
                              placeholder="0.00"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-hub-muted font-medium">
                              TRY
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* EUR → TRY */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-hub-bg flex items-center justify-center flex-shrink-0">
                          <Euro className="w-4 h-4 text-hub-accent" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-hub-secondary mb-1 block">
                            1 EUR =
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={rates.eur_try || ""}
                              onChange={(e) => handleRateChange("eur_try", e.target.value)}
                              className="input-base pr-12"
                              placeholder="0.00"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-hub-muted font-medium">
                              TRY
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QR Print List Section */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="label-base flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-hub-accent" />
                        QR Baskı Listesi
                      </h3>
                      {qrList.length > 0 && (
                        <span className="text-[10px] font-semibold text-hub-accent bg-hub-accent/10 px-2 py-0.5 rounded-full">
                          {qrList.length}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-hub-muted mb-4">
                      Ürün sayfasından listeye eklenen QR kodları burada görünür.
                    </p>

                    {qrList.length === 0 ? (
                      <p className="text-xs text-hub-muted text-center py-6 bg-hub-bg/50 rounded-xl">
                        Listeye ürün eklemek için ürün sayfasına gidin.
                      </p>
                    ) : (
                      <div className="space-y-2 mb-4">
                        {qrList.map((item) => (
                          <div
                            key={item.product_id}
                            className="flex items-center justify-between p-3 rounded-xl bg-hub-bg/50 border border-hub-border/30"
                          >
                            <span className="text-sm text-hub-primary font-medium truncate flex-1 min-w-0 mr-2">
                              {item.product_name}
                            </span>
                            <button
                              onClick={() => removeFromQrList(item.product_id)}
                              className="p-1.5 text-hub-muted hover:text-hub-error rounded-lg hover:bg-hub-error/5 transition-colors flex-shrink-0"
                              title="Listeden çıkar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {qrList.length > 0 && (
                      <button
                        onClick={handlePrintQRList}
                        disabled={printingQr}
                        className="btn-secondary w-full flex items-center justify-center gap-2"
                      >
                        {printingQr ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Printer className="w-4 h-4" />
                        )}
                        {printingQr ? "Hazırlanıyor..." : `Tümünü Yazdır (${qrList.length})`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-hub-border/50">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved ? (
                  <Check className="w-4 h-4" />
                ) : null}
                {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
