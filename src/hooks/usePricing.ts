"use client";

import { useState, useEffect, useCallback } from "react";
import type { CurrencyRates } from "@/types";

export function usePricing() {
  const [rates, setRates] = useState<CurrencyRates>({ usd_try: 0, eur_try: 0 });

  const fetchRates = useCallback(async () => {
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
      console.error("Failed to fetch rates:", err);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  function getExchangeRate(currency: string): number {
    if (currency === "USD") return rates.usd_try || 0;
    if (currency === "EUR") return rates.eur_try || 0;
    return 1;
  }

  function calcSalePrice(
    listPrice: number,
    discountPercent: number,
    kdvPercent: number,
    profitPercent: number,
    currency: string
  ) {
    const buy = listPrice * (1 - discountPercent / 100);
    const profit = buy * (profitPercent / 100);
    const beforeKdv = buy + profit;
    const kdv = beforeKdv * (kdvPercent / 100);
    const saleForeign = beforeKdv + kdv;

    const rate = getExchangeRate(currency);
    const saleTry = currency === "TRY" ? saleForeign : saleForeign * rate;

    return {
      buy,
      saleForeign,
      saleTry: Math.round(saleTry * 100) / 100,
      rate,
      isForeign: currency !== "TRY",
    };
  }

  return { rates, calcSalePrice, getExchangeRate };
}