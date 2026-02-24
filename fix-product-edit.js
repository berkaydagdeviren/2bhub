const fs = require("fs");
const path = require("path");

const dirPath = path.join(
  __dirname,
  "src",
  "app",
  "dashboard",
  "products",
  "[id]",
  "edit"
);
fs.mkdirSync(dirPath, { recursive: true });

fs.writeFileSync(
  path.join(dirPath, "page.tsx"),
  `"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Check,
  ImageIcon,
  DollarSign,
  Euro,
  BadgeTurkishLira,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Calculator,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import VariationsBuilder, {
  type VariationGroupInput,
  type VariationInput,
} from "@/components/products/VariationsBuilder";
import SpecImageUploader, {
  type PendingImage,
} from "@/components/products/SpecImageUploader";
import type { Brand, Supplier, CurrencyRates } from "@/types";

interface FormState {
  name: string;
  description: string;
  netsis_code: string;
  image_url: string;
  brand_id: string;
  current_supplier_id: string;
  currency: "TRY" | "USD" | "EUR";
  list_price: string;
  discount_percent: string;
  kdv_percent: string;
  profit_percent: string;
  has_price2: boolean;
  price2_label: string;
  list_price2: string;
  discount_percent2: string;
}

interface PricingResult {
  buyPrice: number;
  profitAmount: number;
  priceBeforeKdv: number;
  kdvAmount: number;
  salePrice: number;
  salePriceTry: number;
  rate: number;
  isForeign: boolean;
}

interface SpecImage {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
}

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    netsis_code: "",
    image_url: "",
    brand_id: "",
    current_supplier_id: "",
    currency: "TRY",
    list_price: "",
    discount_percent: "",
    kdv_percent: "20",
    profit_percent: "35",
    has_price2: false,
    price2_label: "Price 2",
    list_price2: "",
    discount_percent2: "",
  });

  const [brands, setBrands] = useState<Brand[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rates, setRates] = useState<CurrencyRates>({ usd_try: 0, eur_try: 0 });
  const [variationGroups, setVariationGroups] = useState<VariationGroupInput[]>([]);
  const [variations, setVariations] = useState<VariationInput[]>([]);
  const [specImages, setSpecImages] = useState<SpecImage[]>([]);
  const [pendingSpecImages, setPendingSpecImages] = useState<PendingImage[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    try {
      const [productRes, brandsRes, suppliersRes, settingsRes, specRes] =
        await Promise.all([
          fetch("/api/products/" + productId, { cache: "no-store" }),
          fetch("/api/brands", { cache: "no-store" }),
          fetch("/api/suppliers", { cache: "no-store" }),
          fetch("/api/settings", { cache: "no-store" }),
          fetch("/api/products/" + productId + "/spec-images", { cache: "no-store" }),
        ]);

      const productData = await productRes.json();
      const brandsData = await brandsRes.json();
      const suppliersData = await suppliersRes.json();
      const settingsData = await settingsRes.json();
      const specData = await specRes.json();

      if (brandsData.brands) setBrands(brandsData.brands);
      if (suppliersData.suppliers) setSuppliers(suppliersData.suppliers);
      if (settingsData.settings?.currency_rates) {
        setRates(settingsData.settings.currency_rates);
      }
      if (specData.images) setSpecImages(specData.images);

      if (productData.product) {
        const p = productData.product;
        setForm({
          name: p.name || "",
          description: p.description || "",
          netsis_code: p.netsis_code || "",
          image_url: p.image_url || "",
          brand_id: p.brand_id || "",
          current_supplier_id: p.current_supplier_id || "",
          currency: p.currency || "TRY",
          list_price: p.list_price ? String(p.list_price) : "",
          discount_percent: p.discount_percent ? String(p.discount_percent) : "",
          kdv_percent: p.kdv_percent ? String(p.kdv_percent) : "20",
          profit_percent: p.profit_percent ? String(p.profit_percent) : "35",
          has_price2: p.has_price2 || false,
          price2_label: p.price2_label || "Price 2",
          list_price2: p.list_price2 ? String(p.list_price2) : "",
          discount_percent2: p.discount_percent2 ? String(p.discount_percent2) : "",
        });

        // Load variation groups
        if (p.variation_groups && p.variation_groups.length > 0) {
          setVariationGroups(
            p.variation_groups.map((g: { name: string; values: string[] }) => ({
              name: g.name,
              values: g.values || [],
            }))
          );
        }

        // Load variations
        if (p.variations && p.variations.length > 0) {
          setVariations(
            p.variations.map(
              (v: {
                variation_label: string;
                has_custom_price: boolean;
                list_price: number | null;
                discount_percent: number | null;
                list_price2: number | null;
                discount_percent2: number | null;
                sku: string | null;
              }) => ({
                variation_label: v.variation_label,
                has_custom_price: v.has_custom_price || false,
                list_price: v.list_price ? String(v.list_price) : "",
                discount_percent: v.discount_percent ? String(v.discount_percent) : "",
                list_price2: v.list_price2 ? String(v.list_price2) : "",
                discount_percent2: v.discount_percent2 ? String(v.discount_percent2) : "",
                sku: v.sku || "",
              })
            )
          );
        }
      }
    } catch (err) {
      console.error("Failed to load product:", err);
      setError("Failed to load product data");
    }
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ── Price Calculations ─────────────────────────────────
  function calcPricing(
    listPrice: string,
    discountPercent: string,
    kdvPercent: string,
    profitPercent: string,
    currency: string
  ): PricingResult {
    const lp = parseFloat(listPrice) || 0;
    const disc = parseFloat(discountPercent) || 0;
    const kdv = parseFloat(kdvPercent) || 0;
    const profit = parseFloat(profitPercent) || 0;

    const buyPrice = lp * (1 - disc / 100);
    const profitAmount = buyPrice * (profit / 100);
    const priceBeforeKdv = buyPrice + profitAmount;
    const kdvAmount = priceBeforeKdv * (kdv / 100);
    const salePrice = priceBeforeKdv + kdvAmount;

    let salePriceTry = salePrice;
    let rate = 1;
    if (currency === "USD" && rates.usd_try > 0) {
      rate = rates.usd_try;
      salePriceTry = salePrice * rates.usd_try;
    } else if (currency === "EUR" && rates.eur_try > 0) {
      rate = rates.eur_try;
      salePriceTry = salePrice * rates.eur_try;
    }

    return {
      buyPrice,
      profitAmount,
      priceBeforeKdv,
      kdvAmount,
      salePrice,
      salePriceTry,
      rate,
      isForeign: currency !== "TRY",
    };
  }

  const pricing1 = calcPricing(
    form.list_price,
    form.discount_percent,
    form.kdv_percent,
    form.profit_percent,
    form.currency
  );

  const pricing2 = form.has_price2
    ? calcPricing(
        form.list_price2,
        form.discount_percent2,
        form.kdv_percent,
        form.profit_percent,
        form.currency
      )
    : null;

  const currencySymbol =
    form.currency === "USD" ? "$" : form.currency === "EUR" ? "\\u20AC" : "\\u20BA";

  // ── Submit ─────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Product name is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Update product
      const res = await fetch("/api/products/" + productId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          netsis_code: form.netsis_code.trim() || null,
          image_url: form.image_url.trim() || null,
          brand_id: form.brand_id || null,
          current_supplier_id: form.current_supplier_id || null,
          currency: form.currency,
          list_price: parseFloat(form.list_price) || 0,
          discount_percent: parseFloat(form.discount_percent) || 0,
          kdv_percent: parseFloat(form.kdv_percent) || 20,
          profit_percent: parseFloat(form.profit_percent) || 35,
          has_price2: form.has_price2,
          price2_label: form.price2_label.trim() || "Price 2",
          list_price2: parseFloat(form.list_price2) || 0,
          discount_percent2: parseFloat(form.discount_percent2) || 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update product");
        setSaving(false);
        return;
      }

      // Save variations
      const hasVariations = variations.length > 0;
      const hasGroups = variationGroups.some(
        (g) => g.name.trim() && g.values.length > 0
      );

      await fetch("/api/products/" + productId + "/variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: hasGroups
            ? variationGroups.filter((g) => g.name.trim() && g.values.length > 0)
            : [],
          variations: hasVariations
            ? variations.map((v) => ({
                variation_label: v.variation_label,
                has_custom_price: v.has_custom_price,
                list_price: v.has_custom_price
                  ? parseFloat(v.list_price) || null
                  : null,
                discount_percent: v.has_custom_price
                  ? parseFloat(v.discount_percent) || null
                  : null,
                list_price2:
                  v.has_custom_price && form.has_price2
                    ? parseFloat(v.list_price2) || null
                    : null,
                discount_percent2:
                  v.has_custom_price && form.has_price2
                    ? parseFloat(v.discount_percent2) || null
                    : null,
                sku: v.sku || null,
              }))
            : [],
        }),
      });

      // Upload pending spec images
      for (const img of pendingSpecImages) {
        await fetch("/api/products/" + productId + "/spec-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_data: img.dataUrl,
            caption: img.caption || null,
          }),
        });
      }

      router.push("/dashboard/products/" + productId);
    } catch {
      setError("Something went wrong");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-hub-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={"/dashboard/products/" + productId}
          className="p-2 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-hub-primary">
            Edit Product
          </h1>
          <p className="text-sm text-hub-secondary mt-0.5">
            {form.name || "Untitled"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT COLUMN ──────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="card p-6 space-y-5">
              <h2 className="text-sm font-semibold text-hub-primary uppercase tracking-wider">
                Basic Information
              </h2>

              <div>
                <label className="label-base">Product Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="input-base"
                  placeholder="Product name"
                  autoFocus
                />
              </div>

              <div>
                <label className="label-base">Description / Technical Info</label>
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  className="input-base min-h-[80px] resize-y"
                  placeholder="Technical specifications..."
                />
              </div>

              <div>
                <label className="label-base">Netsis Code</label>
                <input
                  type="text"
                  value={form.netsis_code}
                  onChange={(e) => update("netsis_code", e.target.value)}
                  className="input-base"
                  placeholder="System sync code"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-base">Brand</label>
                  <select
                    value={form.brand_id}
                    onChange={(e) => update("brand_id", e.target.value)}
                    className="input-base"
                  >
                    <option value="">— Select Brand —</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label-base">Current Supplier</label>
                  <select
                    value={form.current_supplier_id}
                    onChange={(e) => update("current_supplier_id", e.target.value)}
                    className="input-base"
                  >
                    <option value="">— Select Supplier —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.vade_days > 0 ? " (" + s.vade_days + "d vade)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label-base">Image URL</label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => update("image_url", e.target.value)}
                  className="input-base"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-hub-primary uppercase tracking-wider">
                  Pricing
                </h2>
                <div className="flex items-center gap-1 bg-hub-bg rounded-xl p-1">
                  {(["TRY", "USD", "EUR"] as const).map((cur) => {
                    const icons = {
                      TRY: BadgeTurkishLira,
                      USD: DollarSign,
                      EUR: Euro,
                    };
                    const Icon = icons[cur];
                    return (
                      <button
                        key={cur}
                        type="button"
                        onClick={() => update("currency", cur)}
                        className={"flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all " +
                          (form.currency === cur
                            ? "bg-white text-hub-accent shadow-hub"
                            : "text-hub-secondary hover:text-hub-primary")}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {cur}
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.currency !== "TRY" && (
                <div className="flex items-center gap-2 text-xs text-hub-warning bg-hub-warning/10 px-3 py-2 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    Auto-converted using 1 {form.currency} ={" "}
                    <strong>
                      {form.currency === "USD"
                        ? rates.usd_try || "not set"
                        : rates.eur_try || "not set"}{" "}
                      \\u20BA
                    </strong>
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="label-base">List Price ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.list_price}
                    onChange={(e) => update("list_price", e.target.value)}
                    className="input-base"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="label-base">Discount %</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.discount_percent}
                    onChange={(e) => update("discount_percent", e.target.value)}
                    className="input-base"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="label-base">KDV %</label>
                  <div className="flex gap-1.5">
                    {["10", "20"].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => update("kdv_percent", val)}
                        className={"flex-1 py-3 rounded-xl border text-sm font-medium transition-all " +
                          (form.kdv_percent === val
                            ? "border-hub-accent bg-hub-accent/10 text-hub-accent"
                            : "border-hub-border text-hub-secondary hover:border-hub-accent/30")}
                      >
                        %{val}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label-base">Profit %</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.profit_percent}
                    onChange={(e) => update("profit_percent", e.target.value)}
                    className="input-base"
                    placeholder="35"
                  />
                </div>
              </div>

              {/* Price 2 Toggle */}
              <div className="pt-2 border-t border-hub-border/30">
                <button
                  type="button"
                  onClick={() => update("has_price2", !form.has_price2)}
                  className="flex items-center gap-2 text-sm text-hub-secondary hover:text-hub-primary transition-colors"
                >
                  {form.has_price2 ? (
                    <ToggleRight className="w-5 h-5 text-hub-accent" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                  Secondary Price Variant
                </button>
              </div>

              {form.has_price2 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pl-7">
                  <div>
                    <label className="label-base">Variant Label</label>
                    <input
                      type="text"
                      value={form.price2_label}
                      onChange={(e) => update("price2_label", e.target.value)}
                      className="input-base"
                      placeholder="e.g. White, Chrome..."
                    />
                  </div>
                  <div>
                    <label className="label-base">List Price 2 ({currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.list_price2}
                      onChange={(e) => update("list_price2", e.target.value)}
                      className="input-base"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="label-base">Discount 2 %</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={form.discount_percent2}
                      onChange={(e) => update("discount_percent2", e.target.value)}
                      className="input-base"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Spec Images */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-hub-accent" />
                <h2 className="text-sm font-semibold text-hub-primary uppercase tracking-wider">
                  Technical Specs & Images
                </h2>
              </div>
              <SpecImageUploader
                productId={productId}
                images={specImages}
                onImagesChange={setSpecImages}
                pendingImages={pendingSpecImages}
                onPendingChange={setPendingSpecImages}
              />
            </div>

            {/* Variations */}
            <VariationsBuilder
              groups={variationGroups}
              variations={variations}
              onGroupsChange={setVariationGroups}
              onVariationsChange={setVariations}
              currencySymbol={currencySymbol}
              hasPrice2={form.has_price2}
              price2Label={form.price2_label}
            />
          </div>

          {/* ── RIGHT COLUMN ─────────────────────────── */}
          <div className="space-y-6">
            {/* Preview */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-hub-primary uppercase tracking-wider mb-4">
                Preview
              </h2>
              <div className="w-full aspect-square rounded-xl bg-hub-bg overflow-hidden">
                {form.image_url ? (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <ImageIcon className="w-8 h-8 text-hub-muted/30" />
                    <span className="text-[11px] text-hub-muted">No image</span>
                  </div>
                )}
              </div>
              {form.name && (
                <div className="mt-3">
                  <h3 className="text-sm font-semibold text-hub-primary">{form.name}</h3>
                  {form.brand_id && (
                    <span className="text-[10px] font-medium text-hub-accent bg-hub-accent/10 px-2 py-0.5 rounded-full mt-1 inline-block">
                      {brands.find((b) => b.id === form.brand_id)?.name}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-4 h-4 text-hub-accent" />
                <h2 className="text-sm font-semibold text-hub-primary uppercase tracking-wider">
                  Price Breakdown
                </h2>
              </div>

              <PriceBreakdown
                label="Primary"
                pricing={pricing1}
                currency={form.currency}
                currencySymbol={currencySymbol}
              />

              {form.has_price2 && pricing2 && (
                <>
                  <div className="my-4 border-t border-hub-border/30" />
                  <PriceBreakdown
                    label={form.price2_label || "Price 2"}
                    pricing={pricing2}
                    currency={form.currency}
                    currencySymbol={currencySymbol}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Error + Submit */}
        <div className="mt-6">
          {error && (
            <div className="flex items-center gap-2 text-sm text-hub-error mb-4">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Link
              href={"/dashboard/products/" + productId}
              className="btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Price Breakdown ──────────────────────────────────────
function PriceBreakdown({
  label,
  pricing,
  currency,
  currencySymbol,
}: {
  label: string;
  pricing: PricingResult;
  currency: string;
  currencySymbol: string;
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-medium text-hub-secondary">{label}</p>

      <Row
        label="Buy Price"
        sublabel="List \\u2212 Discount"
        value={currencySymbol + pricing.buyPrice.toFixed(2)}
      />
      <Row
        label="+ Profit"
        sublabel={((pricing.profitAmount / (pricing.buyPrice || 1)) * 100).toFixed(1) + "%"}
        value={currencySymbol + pricing.profitAmount.toFixed(2)}
      />
      <Row
        label="Before KDV"
        value={currencySymbol + pricing.priceBeforeKdv.toFixed(2)}
      />
      <Row
        label="+ KDV"
        value={currencySymbol + pricing.kdvAmount.toFixed(2)}
        muted
      />

      <div className="pt-2 border-t border-hub-border/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-hub-primary">Sale Price</span>
          <span className="text-lg font-bold text-hub-accent">
            {currencySymbol}{pricing.salePrice.toFixed(2)}
          </span>
        </div>
        {pricing.isForeign && pricing.rate > 0 && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-hub-muted">
              Converted (\\u00D7{pricing.rate})
            </span>
            <span className="text-sm font-semibold text-hub-primary">
              \\u20BA{pricing.salePriceTry.toFixed(2)}
            </span>
          </div>
        )}
        {pricing.isForeign && pricing.rate <= 0 && (
          <p className="text-[10px] text-hub-warning mt-1">
            \\u26A0 Set {currency} rate in Settings
          </p>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  sublabel,
  value,
  muted,
}: {
  label: string;
  sublabel?: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className={"text-xs " + (muted ? "text-hub-muted" : "text-hub-secondary")}>
          {label}
        </span>
        {sublabel && (
          <span className="text-[10px] text-hub-muted">({sublabel})</span>
        )}
      </div>
      <span className={"text-xs font-medium " + (muted ? "text-hub-muted" : "text-hub-primary")}>
        {value}
      </span>
    </div>
  );
}
`,
  "utf-8"
);

console.log("✅ Created src/app/dashboard/products/[id]/edit/page.tsx");