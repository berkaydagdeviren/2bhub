"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check, DollarSign, Euro } from "lucide-react";
import type { CurrencyRates } from "@/types";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [rates, setRates] = useState<CurrencyRates>({ usd_try: 0, eur_try: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

                  {/* More settings sections will be added here in future checkpoints */}
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