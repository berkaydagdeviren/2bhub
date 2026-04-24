"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Loader2,
  ArrowLeft,
  Check,
  AlertCircle,
  DollarSign,
  Euro,
  BadgeTurkishLira,
  ChevronRight,
} from "lucide-react";
import type { Product, CurrencyRates } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────
interface VarEdit {
  id: string;
  variation_label: string;
  has_custom_price: boolean;
  list_price: string;
  discount_percent: string;
  list_price2: string;
  discount_percent2: string;
  sort_order: number;
  sku: string | null;
  is_active: boolean;
}

interface EditState {
  currency: "TRY" | "USD" | "EUR";
  list_price: string;
  discount_percent: string;
  kdv_percent: string;
  profit_percent: string;
  has_price2: boolean;
  price2_label: string;
  list_price2: string;
  discount_percent2: string;
  variations: VarEdit[];
}

interface QuickEditModalProps {
  open: boolean;
  onClose: () => void;
}

// ── Math helpers ────────────────────────────────────────────────────────
function buyPrice(listPrice: number, discount: number) {
  return listPrice * (1 - discount / 100);
}

function salePrice(listPrice: number, discount: number, kdv: number, profit: number) {
  const buy = buyPrice(listPrice, discount);
  const beforeKdv = buy * (1 + profit / 100);
  return beforeKdv * (1 + kdv / 100);
}

function fmt(n: number) {
  return n.toFixed(2);
}

// ── Component ───────────────────────────────────────────────────────────
export default function QuickEditModal({ open, onClose }: QuickEditModalProps) {
  // search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // edit
  const [product, setProduct] = useState<Product | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [rates, setRates] = useState<CurrencyRates>({ usd_try: 0, eur_try: 0 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Reset + focus on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setProduct(null);
      setEdit(null);
      setSaved(false);
      setSaveError("");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  // Fetch exchange rates once per open
  useEffect(() => {
    if (!open) return;
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.currency_rates) setRates(d.settings.currency_rates as CurrencyRates);
      })
      .catch(() => {});
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open || product) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.products || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
  }, [query, open, product]);

  // ── Select product → enter edit mode ───────────────────────────────
  function selectProduct(p: Product) {
    setProduct(p);
    setEdit({
      currency: p.currency,
      list_price: String(p.list_price),
      discount_percent: String(p.discount_percent),
      kdv_percent: String(p.kdv_percent),
      profit_percent: String(p.profit_percent),
      has_price2: p.has_price2,
      price2_label: p.price2_label || "Fiyat 2",
      list_price2: String(p.list_price2),
      discount_percent2: String(p.discount_percent2),
      variations: (p.variations || []).map((v) => ({
        id: v.id,
        variation_label: v.variation_label,
        has_custom_price: v.has_custom_price,
        list_price: v.list_price != null ? String(v.list_price) : "",
        discount_percent: v.discount_percent != null ? String(v.discount_percent) : "",
        list_price2: v.list_price2 != null ? String(v.list_price2) : "",
        discount_percent2: v.discount_percent2 != null ? String(v.discount_percent2) : "",
        sort_order: v.sort_order,
        sku: v.sku,
        is_active: v.is_active,
      })),
    });
  }

  function backToSearch() {
    setProduct(null);
    setEdit(null);
    setSaved(false);
    setSaveError("");
    setTimeout(() => inputRef.current?.focus(), 60);
  }

  function upd<K extends keyof EditState>(key: K, value: EditState[K]) {
    setEdit((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updVar(idx: number, key: keyof VarEdit, value: string | boolean) {
    setEdit((prev) => {
      if (!prev) return prev;
      const vars = [...prev.variations];
      vars[idx] = { ...vars[idx], [key]: value };
      return { ...prev, variations: vars };
    });
  }

  // ── Save ────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!product || !edit) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency: edit.currency,
          list_price: parseFloat(edit.list_price) || 0,
          discount_percent: parseFloat(edit.discount_percent) || 0,
          kdv_percent: parseFloat(edit.kdv_percent) || 20,
          profit_percent: parseFloat(edit.profit_percent) || 35,
          has_price2: edit.has_price2,
          price2_label: edit.price2_label,
          list_price2: parseFloat(edit.list_price2) || 0,
          discount_percent2: parseFloat(edit.discount_percent2) || 0,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setSaveError(d.error || "Kayıt başarısız");
        setSaving(false);
        return;
      }

      // Update variation prices via PATCH
      if (edit.variations.length > 0) {
        await fetch(`/api/products/${product.id}/variations`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variations: edit.variations.map((v) => ({
              id: v.id,
              has_custom_price: v.has_custom_price,
              list_price: v.has_custom_price ? (parseFloat(v.list_price) || null) : null,
              discount_percent: v.has_custom_price ? (parseFloat(v.discount_percent) || null) : null,
              list_price2: v.has_custom_price && edit.has_price2 ? (parseFloat(v.list_price2) || null) : null,
              discount_percent2: v.has_custom_price && edit.has_price2 ? (parseFloat(v.discount_percent2) || null) : null,
            })),
          }),
        });
      }

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 700);
    } catch {
      setSaveError("Bir hata oluştu");
    }
    setSaving(false);
  }

  // ── Computed values ─────────────────────────────────────────────────
  const currency = edit?.currency ?? "TRY";
  const rate = currency === "USD" ? rates.usd_try : currency === "EUR" ? rates.eur_try : 1;
  const isForeign = currency !== "TRY";
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₺";

  const kdv = parseFloat(edit?.kdv_percent ?? "20") || 20;
  const profit = parseFloat(edit?.profit_percent ?? "35") || 35;

  const baseBuy = edit ? buyPrice(parseFloat(edit.list_price) || 0, parseFloat(edit.discount_percent) || 0) : 0;
  const baseSale = edit ? salePrice(parseFloat(edit.list_price) || 0, parseFloat(edit.discount_percent) || 0, kdv, profit) : 0;
  const base2Buy = edit?.has_price2 ? buyPrice(parseFloat(edit.list_price2) || 0, parseFloat(edit.discount_percent2) || 0) : 0;
  const base2Sale = edit?.has_price2 ? salePrice(parseFloat(edit.list_price2) || 0, parseFloat(edit.discount_percent2) || 0, kdv, profit) : 0;

  // ── Render ──────────────────────────────────────────────────────────
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
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[80]"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className="fixed top-[8vh] left-1/2 -translate-x-1/2 w-full max-w-lg bg-white rounded-2xl shadow-hub-lg z-[90] flex flex-col overflow-hidden"
            style={{ maxHeight: "82vh" }}
          >
            {/* ── SEARCH PHASE ─────────────────────────── */}
            {!product && (
              <>
                <div className="flex items-center gap-3 px-4 h-12 border-b border-hub-border/40">
                  <Search className="w-4 h-4 text-hub-muted flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ürün ara... (ad, marka, varyasyon)"
                    className="flex-1 text-sm outline-none bg-transparent text-hub-primary placeholder:text-hub-muted"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") onClose();
                      if (e.key === "Enter" && results.length >= 1) selectProduct(results[0]);
                    }}
                  />
                  {searching ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-hub-muted flex-shrink-0" />
                  ) : (
                    <kbd className="text-[10px] text-hub-muted bg-hub-bg px-1.5 py-0.5 rounded border border-hub-border/50 flex-shrink-0">
                      ESC
                    </kbd>
                  )}
                </div>

                <div className="overflow-y-auto">
                  {query.length < 2 ? (
                    <p className="text-xs text-hub-muted text-center py-10">
                      En az 2 karakter girin
                    </p>
                  ) : !searching && results.length === 0 ? (
                    <p className="text-xs text-hub-muted text-center py-10">Ürün bulunamadı</p>
                  ) : null}

                  {results.map((p) => {
                    const pSym = p.currency === "USD" ? "$" : p.currency === "EUR" ? "€" : "₺";
                    const pRate =
                      p.currency === "USD" ? rates.usd_try : p.currency === "EUR" ? rates.eur_try : 1;
                    const pBuy = buyPrice(p.list_price, p.discount_percent);
                    const pSale = salePrice(p.list_price, p.discount_percent, p.kdv_percent, p.profit_percent);
                    const pSaleTry = p.currency !== "TRY" ? pSale * pRate : pSale;

                    return (
                      <button
                        key={p.id}
                        onClick={() => selectProduct(p)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-hub-bg/60 transition-colors border-b border-hub-border/20 last:border-0 text-left group"
                      >
                        {/* Product image thumbnail */}
                        <div className="w-9 h-9 rounded-lg bg-hub-bg flex-shrink-0 overflow-hidden">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-hub-muted/30">
                              <Search className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-hub-primary truncate">{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {p.brand && (
                              <span className="text-[10px] font-medium text-hub-accent bg-hub-accent/10 px-1.5 py-0.5 rounded-full">
                                {p.brand.name}
                              </span>
                            )}
                            <span className="text-[11px] text-hub-muted">
                              Geliş: {pSym}{fmt(pBuy)}
                              {p.currency !== "TRY" && pRate > 0 && ` = ₺${fmt(pBuy * pRate)}`}
                            </span>
                            {(p.variations?.length ?? 0) > 0 && (
                              <span className="text-[10px] text-hub-muted bg-hub-bg px-1.5 py-0.5 rounded-full">
                                {p.variations!.length} varyasyon
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-hub-accent">
                            {p.currency !== "TRY" && pRate > 0
                              ? `₺${fmt(pSaleTry)}`
                              : `${pSym}${fmt(pSale)}`}
                          </p>
                          <p className="text-[10px] text-hub-muted">satış</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-hub-muted flex-shrink-0 group-hover:text-hub-primary transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── EDIT PHASE ────────────────────────────── */}
            {product && edit && (
              <>
                {/* Header */}
                <div className="flex items-center gap-2 px-3 h-12 border-b border-hub-border/40 flex-shrink-0">
                  <button
                    onClick={backToSearch}
                    className="p-1.5 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-colors flex-shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-hub-primary truncate leading-tight">
                      {product.name}
                    </p>
                    {product.brand && (
                      <p className="text-[10px] text-hub-accent leading-tight">{product.brand.name}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-4 space-y-4">
                  {/* Currency */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-hub-bg rounded-xl p-1">
                      {(["TRY", "USD", "EUR"] as const).map((cur) => {
                        const icons = { TRY: BadgeTurkishLira, USD: DollarSign, EUR: Euro };
                        const Icon = icons[cur];
                        return (
                          <button
                            key={cur}
                            type="button"
                            onClick={() => upd("currency", cur)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                              edit.currency === cur
                                ? "bg-white text-hub-accent shadow-hub"
                                : "text-hub-secondary hover:text-hub-primary"
                            }`}
                          >
                            <Icon className="w-3 h-3" />
                            {cur}
                          </button>
                        );
                      })}
                    </div>
                    {isForeign && rate > 0 && (
                      <span className="text-[10px] text-hub-muted">
                        1 {currency} = {fmt(rate)} ₺
                      </span>
                    )}
                    {isForeign && rate <= 0 && (
                      <span className="text-[10px] text-hub-warning flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Kur ayarlı değil
                      </span>
                    )}
                  </div>

                  {/* Base pricing */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-hub-muted uppercase tracking-wider">
                      Ana Fiyat
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-hub-muted block mb-1">
                          Liste Fiyatı ({sym})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={edit.list_price}
                          onChange={(e) => upd("list_price", e.target.value)}
                          className="input-base text-sm py-2"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-hub-muted block mb-1">İndirim %</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={edit.discount_percent}
                          onChange={(e) => upd("discount_percent", e.target.value)}
                          className="input-base text-sm py-2"
                        />
                      </div>
                    </div>

                    {/* Live geliş / satış */}
                    <PriceLine
                      label="Ana"
                      buy={baseBuy}
                      sale={baseSale}
                      sym={sym}
                      rate={rate}
                      isForeign={isForeign}
                    />
                  </div>

                  {/* KDV + Profit */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-hub-muted block mb-1">KDV %</label>
                      <div className="flex gap-1.5">
                        {["10", "20"].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => upd("kdv_percent", val)}
                            className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                              edit.kdv_percent === val
                                ? "border-hub-accent bg-hub-accent/10 text-hub-accent"
                                : "border-hub-border text-hub-secondary hover:border-hub-accent/30"
                            }`}
                          >
                            %{val}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-hub-muted block mb-1">Kar %</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={edit.profit_percent}
                        onChange={(e) => upd("profit_percent", e.target.value)}
                        className="input-base text-sm py-2"
                      />
                    </div>
                  </div>

                  {/* Price 2 */}
                  {edit.has_price2 && (
                    <div className="space-y-2 pt-3 border-t border-hub-border/30">
                      <p className="text-[10px] font-semibold text-hub-muted uppercase tracking-wider">
                        {edit.price2_label || "Fiyat 2"}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-hub-muted block mb-1">
                            Liste Fiyatı 2 ({sym})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={edit.list_price2}
                            onChange={(e) => upd("list_price2", e.target.value)}
                            className="input-base text-sm py-2"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-hub-muted block mb-1">İndirim 2 %</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={edit.discount_percent2}
                            onChange={(e) => upd("discount_percent2", e.target.value)}
                            className="input-base text-sm py-2"
                          />
                        </div>
                      </div>
                      <PriceLine
                        label={edit.price2_label || "Fiyat 2"}
                        buy={base2Buy}
                        sale={base2Sale}
                        sym={sym}
                        rate={rate}
                        isForeign={isForeign}
                      />
                    </div>
                  )}

                  {/* Variations */}
                  {edit.variations.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-hub-border/30">
                      <p className="text-[10px] font-semibold text-hub-muted uppercase tracking-wider">
                        Varyasyonlar ({edit.variations.length})
                      </p>

                      {edit.variations.map((v, idx) => {
                        const vBuy = v.has_custom_price
                          ? buyPrice(parseFloat(v.list_price) || 0, parseFloat(v.discount_percent) || 0)
                          : baseBuy;
                        const vSale = v.has_custom_price
                          ? salePrice(parseFloat(v.list_price) || 0, parseFloat(v.discount_percent) || 0, kdv, profit)
                          : baseSale;

                        return (
                          <div
                            key={v.id}
                            className="rounded-xl border border-hub-border/40 p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-hub-primary truncate">
                                {v.variation_label}
                              </span>
                              <button
                                type="button"
                                onClick={() => updVar(idx, "has_custom_price", !v.has_custom_price)}
                                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all flex-shrink-0 ${
                                  v.has_custom_price
                                    ? "border-hub-accent bg-hub-accent/10 text-hub-accent"
                                    : "border-hub-border text-hub-muted hover:border-hub-accent/30"
                                }`}
                              >
                                {v.has_custom_price ? "Özel Fiyat" : "Ana Fiyat"}
                              </button>
                            </div>

                            {v.has_custom_price && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-hub-muted block mb-1">
                                    Liste ({sym})
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={v.list_price}
                                    onChange={(e) => updVar(idx, "list_price", e.target.value)}
                                    className="input-base text-sm py-1.5"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-hub-muted block mb-1">İndirim %</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={v.discount_percent}
                                    onChange={(e) => updVar(idx, "discount_percent", e.target.value)}
                                    className="input-base text-sm py-1.5"
                                  />
                                </div>
                              </div>
                            )}

                            <PriceLine
                              label={v.variation_label}
                              buy={vBuy}
                              sale={vSale}
                              sym={sym}
                              rate={rate}
                              isForeign={isForeign}
                              compact
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {saveError && (
                    <div className="flex items-center gap-2 text-xs text-hub-error bg-hub-error/5 rounded-xl px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{saveError}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-hub-border/40 flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary flex-1 text-sm py-2"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : saved ? (
                      <Check className="w-4 h-4" />
                    ) : null}
                    {saving ? "Kaydediliyor..." : saved ? "Kaydedildi!" : "Kaydet"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── PriceLine sub-component ─────────────────────────────────────────────
function PriceLine({
  buy,
  sale,
  sym,
  rate,
  isForeign,
  compact = false,
}: {
  label: string;
  buy: number;
  sale: number;
  sym: string;
  rate: number;
  isForeign: boolean;
  compact?: boolean;
}) {
  const buyTry = isForeign && rate > 0 ? buy * rate : buy;
  const saleTry = isForeign && rate > 0 ? sale * rate : sale;

  return (
    <div
      className={`flex items-center gap-3 bg-hub-bg/60 rounded-xl px-3 py-2 ${
        compact ? "text-[11px]" : "text-xs"
      }`}
    >
      <span className="text-hub-secondary">
        Geliş:{" "}
        <span className="font-semibold text-hub-primary">
          {isForeign ? (
            <>
              {sym}{fmt(buy)}
              {rate > 0 && <span className="text-hub-muted"> = ₺{fmt(buyTry)}</span>}
            </>
          ) : (
            `₺${fmt(buy)}`
          )}
        </span>
      </span>
      <span className="text-hub-border/60">|</span>
      <span className="text-hub-secondary">
        Satış:{" "}
        <span className="font-bold text-hub-accent">
          {isForeign && rate > 0 ? `₺${fmt(saleTry)}` : `${sym}${fmt(sale)}`}
        </span>
        {isForeign && rate > 0 && (
          <span className="text-hub-muted ml-1">
            ({sym}{fmt(sale)})
          </span>
        )}
      </span>
    </div>
  );
}
