const fs = require("fs");
const path = require("path");

const dirPath = path.join(
  __dirname,
  "src",
  "app",
  "dashboard",
  "products",
  "[id]"
);
fs.mkdirSync(dirPath, { recursive: true });

fs.writeFileSync(
  path.join(dirPath, "page.tsx"),
  `"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Package,
  Tag,
  Truck,
  Clock,
  QrCode,
  Printer,
  Download,
  Pencil,
  Trash2,
  Layers,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Calculator,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import type { Product, ProductVariation, VariationGroup, CurrencyRates } from "@/types";

interface FullProduct extends Product {
  variations: ProductVariation[];
  variation_groups: VariationGroup[];
  supplier_links: Array<{
    id: string;
    supplier_id: string;
    list_price: number;
    discount_percent: number;
    is_current: boolean;
    notes: string | null;
    supplier: { id: string; name: string; vade_days: number };
  }>;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<FullProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<CurrencyRates>({ usd_try: 0, eur_try: 0 });
  const [usePrice2, setUsePrice2] = useState(false);

  // QR state
  const [qrData, setQrData] = useState<{
    qr_data_url: string;
    qr_svg: string;
    product_url: string;
  } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const qrPrintRef = useRef<HTMLDivElement>(null);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch("/api/products/" + productId, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.product) setProduct(data.product);
    } catch (err) {
      console.error("Failed to fetch product:", err);
    }
    setLoading(false);
  }, [productId]);

  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const data = await res.json();
      if (data.settings?.currency_rates) {
        setRates(data.settings.currency_rates as CurrencyRates);
      }
    } catch (err) {
      console.error("Failed to fetch rates:", err);
    }
  }, []);

  useEffect(() => {
    fetchProduct();
    fetchRates();
  }, [fetchProduct, fetchRates]);

  async function generateQR() {
    setQrLoading(true);
    try {
      const res = await fetch("/api/products/" + productId + "/qr", {
        cache: "no-store",
      });
      const data = await res.json();
      setQrData(data);
    } catch (err) {
      console.error("QR generation failed:", err);
    }
    setQrLoading(false);
  }

  function printQR() {
    if (!qrData || !product) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(\`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR - \${product.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh;
            font-family: system-ui, sans-serif;
          }
          .qr-card {
            text-align: center;
            padding: 24px;
            border: 2px solid #E5E0D8;
            border-radius: 16px;
            width: 280px;
          }
          .qr-card img { 
            width: 200px; 
            height: 200px; 
            margin: 0 auto 12px; 
          }
          .product-name { 
            font-size: 14px; 
            font-weight: 700; 
            color: #1A1A1A;
            margin-bottom: 4px;
          }
          .brand { 
            font-size: 11px; 
            color: #7A7468; 
          }
          .logo {
            font-size: 10px;
            color: #8B7355;
            margin-top: 8px;
            font-weight: 600;
          }
          @media print {
            body { margin: 0; }
            .qr-card { border: 1px solid #ccc; }
          }
        </style>
      </head>
      <body>
        <div class="qr-card">
          <img src="\${qrData.qr_data_url}" alt="QR" />
          <div class="product-name">\${product.name}</div>
          \${product.brand ? '<div class="brand">' + product.brand.name + '</div>' : ''}
          <div class="logo">2B Hub</div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        <\\/script>
      </body>
      </html>
    \`);
    printWindow.document.close();
  }

  function downloadQR() {
    if (!qrData || !product) return;
    const link = document.createElement("a");
    link.download = "QR-" + product.name.replace(/\\s+/g, "-") + ".png";
    link.href = qrData.qr_data_url;
    link.click();
  }

  async function handleDelete() {
    if (!product) return;
    if (!confirm("Deactivate \\"" + product.name + "\\"? It will be hidden from the catalog.")) return;

    setDeleting(true);
    try {
      await fetch("/api/products/" + productId, { method: "DELETE" });
      router.push("/dashboard/products");
    } catch (err) {
      console.error("Delete failed:", err);
    }
    setDeleting(false);
  }

  // ── Price helpers ──────────────────────────────────────
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
    const sale = beforeKdv + kdv;

    let saleTry = sale;
    if (currency === "USD" && rates.usd_try > 0) saleTry = sale * rates.usd_try;
    if (currency === "EUR" && rates.eur_try > 0) saleTry = sale * rates.eur_try;

    return { buy, sale, saleTry, isForeign: currency !== "TRY" };
  }

  const currencySymbols: Record<string, string> = { TRY: "\\u20BA", USD: "$", EUR: "\\u20AC" };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-hub-muted" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="card p-12 text-center">
        <Package className="w-10 h-10 text-hub-muted/40 mx-auto mb-3" />
        <p className="text-hub-secondary">Product not found</p>
        <Link
          href="/dashboard/products"
          className="text-sm text-hub-accent hover:text-hub-accent-hover mt-2 font-medium inline-block"
        >
          Back to products
        </Link>
      </div>
    );
  }

  const sym = currencySymbols[product.currency] || "\\u20BA";
  const mainPrice = calcSalePrice(
    Number(product.list_price),
    Number(product.discount_percent),
    Number(product.kdv_percent),
    Number(product.profit_percent),
    product.currency
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/products"
          className="p-2 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-hub-primary truncate">
            {product.name}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            {product.brand && (
              <span className="text-[11px] font-medium text-hub-accent bg-hub-accent/10 px-2 py-0.5 rounded-full">
                {product.brand.name}
              </span>
            )}
            {product.netsis_code && (
              <span className="text-[11px] text-hub-muted">
                {product.netsis_code}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={"/dashboard/products/" + productId + "/edit"}
            className="btn-secondary flex items-center gap-2 text-sm py-2"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-hub-secondary hover:text-hub-error rounded-lg hover:bg-hub-error/5 transition-colors"
            title="Deactivate product"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Image + Info ─────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image + Description */}
          <div className="card p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Image */}
              <div className="aspect-square rounded-xl bg-hub-bg overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-hub-muted/30" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-4">
                {product.description && (
                  <div>
                    <p className="label-base">Description</p>
                    <p className="text-sm text-hub-secondary leading-relaxed whitespace-pre-wrap">
                      {product.description}
                    </p>
                  </div>
                )}

                {product.supplier && (
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-hub-muted" />
                    <span className="text-sm text-hub-secondary">
                      {product.supplier.name}
                    </span>
                    {product.supplier.vade_days > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-hub-warning bg-hub-warning/10 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" />
                        {product.supplier.vade_days}d
                      </span>
                    )}
                  </div>
                )}

                {/* Main Price */}
                {Number(product.list_price) > 0 && (
                  <div className="p-3 rounded-xl bg-hub-bg/50 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-hub-secondary">List Price</span>
                      <span className="text-hub-primary font-medium">
                        {sym}{Number(product.list_price).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-hub-secondary">Discount</span>
                      <span className="text-hub-primary font-medium">
                        {Number(product.discount_percent)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-hub-secondary">Buy Price</span>
                      <span className="text-hub-primary font-medium">
                        {sym}{mainPrice.buy.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-hub-border/30 pt-1.5 flex justify-between">
                      <span className="text-xs font-medium text-hub-secondary">
                        Sale Price
                      </span>
                      <span className="text-sm font-bold text-hub-accent">
                        {sym}{mainPrice.sale.toFixed(2)}
                      </span>
                    </div>
                    {mainPrice.isForeign && mainPrice.saleTry !== mainPrice.sale && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-hub-muted">TRY</span>
                        <span className="text-hub-primary font-medium">
                          \\u20BA{mainPrice.saleTry.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Variations */}
          {product.variations && product.variations.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-hub-accent" />
                  <h2 className="text-sm font-semibold text-hub-primary uppercase tracking-wider">
                    Variations
                  </h2>
                  <span className="text-[10px] font-semibold text-hub-accent bg-hub-accent/10 px-2 py-0.5 rounded-full">
                    {product.variations.length}
                  </span>
                </div>

                {/* Price toggle */}
                {product.has_price2 && (
                  <button
                    onClick={() => setUsePrice2(!usePrice2)}
                    className="flex items-center gap-1.5 text-xs font-medium text-hub-secondary hover:text-hub-primary transition-colors"
                  >
                    {usePrice2 ? (
                      <ToggleRight className="w-5 h-5 text-hub-accent" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                    {usePrice2
                      ? product.price2_label || "Price 2"
                      : "Price 1"}
                  </button>
                )}
              </div>

              {/* Variation groups display */}
              {product.variation_groups && product.variation_groups.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-hub-border/30">
                  {product.variation_groups.map((g) => (
                    <div key={g.id} className="text-xs">
                      <span className="font-medium text-hub-primary">{g.name}:</span>{" "}
                      <span className="text-hub-secondary">{g.values.join(", ")}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Variation list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {product.variations.map((v) => {
                  const hasCustom = v.has_custom_price;
                  let varPrice = { buy: 0, sale: 0, saleTry: 0, isForeign: false };

                  if (hasCustom) {
                    const lp = usePrice2
                      ? Number(v.list_price2) || Number(v.list_price) || 0
                      : Number(v.list_price) || 0;
                    const dp = usePrice2
                      ? Number(v.discount_percent2) || Number(v.discount_percent) || 0
                      : Number(v.discount_percent) || 0;

                    varPrice = calcSalePrice(
                      lp,
                      dp,
                      Number(product.kdv_percent),
                      Number(product.profit_percent),
                      product.currency
                    );
                  }

                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-hub-bg/50 border border-hub-border/30"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-hub-primary">
                          {v.variation_label}
                        </span>
                        {v.sku && (
                          <span className="text-[10px] text-hub-muted ml-2">
                            {v.sku}
                          </span>
                        )}
                      </div>
                      {hasCustom && (
                        <div className="text-right flex-shrink-0 ml-3">
                          <span className="text-sm font-semibold text-hub-accent">
                            {sym}{varPrice.sale.toFixed(2)}
                          </span>
                          {varPrice.isForeign && varPrice.saleTry !== varPrice.sale && (
                            <span className="text-[10px] text-hub-muted block">
                              \\u20BA{varPrice.saleTry.toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Supplier Links */}
          {product.supplier_links && product.supplier_links.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-4 h-4 text-hub-accent" />
                <h2 className="text-sm font-semibold text-hub-primary uppercase tracking-wider">
                  Supplier Prices
                </h2>
              </div>
              <div className="space-y-2">
                {product.supplier_links.map((link) => (
                  <div
                    key={link.id}
                    className={"flex items-center justify-between p-3 rounded-xl border " + (link.is_current ? "border-hub-accent/30 bg-hub-accent/5" : "border-hub-border/30 bg-hub-bg/30")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-hub-primary">
                        {link.supplier.name}
                      </span>
                      {link.is_current && (
                        <span className="text-[9px] font-semibold uppercase text-hub-accent bg-hub-accent/10 px-1.5 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                      {link.supplier.vade_days > 0 && (
                        <span className="text-[10px] text-hub-warning">
                          {link.supplier.vade_days}d vade
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-hub-primary">
                        {sym}{Number(link.list_price).toFixed(2)}
                      </span>
                      {Number(link.discount_percent) > 0 && (
                        <span className="text-[10px] text-hub-muted block">
                          -{link.discount_percent}% disc
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: QR + Meta ───────────────────────── */}
        <div className="space-y-6">
          {/* QR Code Card */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-4 h-4 text-hub-accent" />
              <h2 className="text-sm font-semibold text-hub-primary uppercase tracking-wider">
                QR Code
              </h2>
            </div>

            {qrData ? (
              <div className="space-y-4">
                <div
                  ref={qrPrintRef}
                  className="bg-white rounded-xl p-4 flex flex-col items-center"
                >
                  <img
                    src={qrData.qr_data_url}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                  <p className="text-xs font-semibold text-hub-primary mt-2">
                    {product.name}
                  </p>
                  {product.brand && (
                    <p className="text-[10px] text-hub-secondary">
                      {product.brand.name}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={printQR}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm py-2"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                  <button
                    onClick={downloadQR}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm py-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Save
                  </button>
                </div>

                <div className="text-center">
                  <a
                    href={qrData.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-hub-accent hover:text-hub-accent-hover"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Public page
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <button
                  onClick={generateQR}
                  disabled={qrLoading}
                  className="btn-primary flex items-center justify-center gap-2 w-full"
                >
                  {qrLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <QrCode className="w-4 h-4" />
                  )}
                  {qrLoading ? "Generating..." : "Generate QR Code"}
                </button>
                <p className="text-[11px] text-hub-muted mt-2">
                  Print to put on shelf
                </p>
              </div>
            )}
          </div>

          {/* Product Meta */}
          <div className="card p-6 space-y-3">
            <h2 className="text-sm font-semibold text-hub-primary uppercase tracking-wider mb-3">
              Details
            </h2>

            <MetaRow label="Currency" value={product.currency} />
            <MetaRow label="KDV" value={product.kdv_percent + "%"} />
            <MetaRow label="Profit Margin" value={product.profit_percent + "%"} />
            {product.has_price2 && (
              <MetaRow label="Price 2 Label" value={product.price2_label} />
            )}
            <MetaRow
              label="Created"
              value={new Date(product.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            />
            <MetaRow label="ID" value={product.id.slice(0, 8) + "..."} mono />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-hub-secondary">{label}</span>
      <span
        className={"text-xs font-medium text-hub-primary " + (mono ? "font-mono" : "")}
      >
        {value}
      </span>
    </div>
  );
}
`,
  "utf-8"
);

console.log("✅ Created src/app/dashboard/products/[id]/page.tsx");