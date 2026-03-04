import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Metadata } from "next";
import SpecImageViewer from "@/components/public/SpecImageViewer";

export const dynamic = "force-dynamic";

interface SpecImage {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
}

interface Variation {
  id: string;
  variation_label: string;
  has_custom_price: boolean;
  list_price: number | null;
  discount_percent: number | null;
  list_price2: number | null;
  discount_percent2: number | null;
  is_active: boolean;
}

interface PageProps {
  params: { id: string };
}

function computeTRY(
  lp: number,
  disc: number,
  profit: number,
  kdv: number,
  currency: string,
  rates: { usd_try: number; eur_try: number }
): number {
  const buy = lp * (1 - disc / 100);
  const exKdv = buy * (1 + profit / 100);
  const saleLocal = exKdv * (1 + kdv / 100);
  const rate =
    currency === "USD"
      ? rates.usd_try
      : currency === "EUR"
      ? rates.eur_try
      : 1;
  return saleLocal * rate;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { data } = await supabaseAdmin
    .from("products")
    .select("name, description")
    .eq("id", params.id)
    .eq("is_active", true)
    .single();

  if (!data) return { title: "Ürün — 2B Hub" };
  return {
    title: `${data.name} — 2B Hub`,
    description: data.description || undefined,
  };
}

export default async function PublicProductPage({ params }: PageProps) {
  // Fetch product + brand + full variations
  const { data: product } = await supabaseAdmin
    .from("products")
    .select(
      "id, name, description, image_url, currency, list_price, discount_percent, kdv_percent, profit_percent, has_price2, price2_label, list_price2, discount_percent2, brand:brands(name), variations:product_variations(id, variation_label, has_custom_price, list_price, discount_percent, list_price2, discount_percent2, is_active)"
    )
    .eq("id", params.id)
    .eq("is_active", true)
    .single();

  if (!product) notFound();

  // Fetch spec images
  const { data: specImages } = await supabaseAdmin
    .from("product_spec_images")
    .select("id, image_url, caption, sort_order")
    .eq("product_id", params.id)
    .order("sort_order", { ascending: true });

  // Fetch currency rates
  const { data: ratesRow } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "currency_rates")
    .single();
  const rates = (ratesRow?.value ?? { usd_try: 0, eur_try: 0 }) as {
    usd_try: number;
    eur_try: number;
  };

  const lp = Number(product.list_price) || 0;
  const disc = Number(product.discount_percent) || 0;
  const profit = Number(product.profit_percent) || 0;
  const kdv = Number(product.kdv_percent) || 0;
  const currency = product.currency as string;
  const brandRaw = product.brand;
  const brandName = Array.isArray(brandRaw)
    ? (brandRaw[0] as { name: string } | undefined)?.name
    : (brandRaw as { name: string } | null)?.name;
  const images = (specImages || []) as SpecImage[];

  const activeVariations = (
    (product.variations as Variation[]) || []
  ).filter((v) => v.is_active);

  // Determine display mode
  const hasVariations = activeVariations.length > 0;

  // Product-level price1
  const productPrice1TRY = lp > 0 ? computeTRY(lp, disc, profit, kdv, currency, rates) : 0;
  // Product-level price2
  const lp2 = Number(product.list_price2) || 0;
  const disc2 = Number(product.discount_percent2) || 0;
  const productPrice2TRY = lp2 > 0 ? computeTRY(lp2, disc2, profit, kdv, currency, rates) : 0;
  const has_price2 = Boolean(product.has_price2);
  const price2_label = (product.price2_label as string | null) || "Fiyat 2";

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {/* Minimal header */}
      <header className="border-b border-[#E5E0D8] bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-[#1A1A1A] tracking-tight">
            2B Hub
          </span>
          <span className="text-xs text-[#7A7468]">Ürün Bilgisi</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Product image */}
        <div className="w-full aspect-square max-h-72 rounded-2xl bg-white border border-[#E5E0D8] overflow-hidden flex items-center justify-center mx-auto">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url as string}
              alt={product.name as string}
              className="w-full h-full object-contain p-4"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-[#B5AFA6]">
              <svg
                className="w-16 h-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
                />
              </svg>
              <span className="text-sm">Görsel yok</span>
            </div>
          )}
        </div>

        {/* Name + brand */}
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1A1A] leading-snug">
            {product.name as string}
          </h1>
          {brandName && (
            <span className="inline-block mt-1.5 text-xs font-medium text-[#8B7355] bg-[#8B7355]/10 px-2.5 py-0.5 rounded-full">
              {brandName}
            </span>
          )}
        </div>

        {/* Price section */}
        {hasVariations ? (
          /* Variation price table */
          <div className="bg-white rounded-2xl border border-[#E5E0D8] p-5">
            <p className="text-[10px] font-semibold text-[#7A7468] uppercase tracking-wider mb-3">
              Satış Fiyatları
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E0D8]">
                    <th className="text-left py-2 pr-4 text-[10px] font-semibold text-[#7A7468] uppercase">
                      Varyasyon
                    </th>
                    <th className="text-right py-2 px-2 text-[10px] font-semibold text-[#7A7468] uppercase">
                      {has_price2 ? "Siyah" : "Fiyat"}
                    </th>
                    {has_price2 && (
                      <th className="text-right py-2 pl-2 text-[10px] font-semibold text-[#7A7468] uppercase">
                        {price2_label || "Beyaz/Galvaniz"}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activeVariations.map((v) => {
                    const vLp = v.has_custom_price
                      ? Number(v.list_price) || lp
                      : lp;
                    const vDisc = v.has_custom_price
                      ? Number(v.discount_percent) || disc
                      : disc;
                    const vLp2 = v.has_custom_price
                      ? Number(v.list_price2) || lp2
                      : lp2;
                    const vDisc2 = v.has_custom_price
                      ? Number(v.discount_percent2) || disc2
                      : disc2;

                    const price1TRY =
                      vLp > 0
                        ? computeTRY(vLp, vDisc, profit, kdv, currency, rates)
                        : 0;
                    const price2TRY =
                      has_price2 && vLp2 > 0
                        ? computeTRY(vLp2, vDisc2, profit, kdv, currency, rates)
                        : 0;

                    return (
                      <tr
                        key={v.id}
                        className="border-b border-[#E5E0D8]/50 last:border-0"
                      >
                        <td className="py-2.5 pr-4 text-[#1A1A1A] font-medium">
                          {v.variation_label}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {price1TRY > 0 ? (
                            <span className="font-bold text-[#8B7355]">
                              ₺{price1TRY.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-[#B5AFA6] text-xs">—</span>
                          )}
                        </td>
                        {has_price2 && (
                          <td className="py-2.5 pl-2 text-right">
                            {price2TRY > 0 ? (
                              <span className="font-semibold text-[#7A7468]">
                                ₺{price2TRY.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-[#B5AFA6] text-xs">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {kdv > 0 && (
              <p className="text-[10px] text-[#B5AFA6] mt-3">
                KDV (%{kdv}) dahildir.
              </p>
            )}
          </div>
        ) : productPrice1TRY > 0 ? (
          /* Single product price */
          <div className="bg-white rounded-2xl border border-[#E5E0D8] p-5 space-y-3">
            <p className="text-[10px] font-semibold text-[#7A7468] uppercase tracking-wider">
              {has_price2 ? "Siyah" : "Satış Fiyatı"}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#8B7355]">
                ₺{productPrice1TRY.toFixed(2)}
              </span>
              {kdv > 0 && (
                <span className="text-xs text-[#B5AFA6]">KDV dahil</span>
              )}
            </div>
            {has_price2 && productPrice2TRY > 0 && (
              <div className="pt-2 border-t border-[#E5E0D8]/50 flex items-baseline gap-2">
                <span className="text-xs text-[#7A7468] font-medium">
                  {price2_label || "Beyaz/Galvaniz"}:
                </span>
                <span className="text-xl font-semibold text-[#7A7468]">
                  ₺{productPrice2TRY.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        ) : null}

        {/* Description */}
        {product.description && (
          <div className="bg-white rounded-2xl border border-[#E5E0D8] p-5">
            <p className="text-[10px] font-semibold text-[#7A7468] uppercase tracking-wider mb-2">
              Açıklama
            </p>
            <p className="text-sm text-[#1A1A1A] leading-relaxed whitespace-pre-wrap">
              {product.description as string}
            </p>
          </div>
        )}

        {/* Spec images */}
        {images.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-[#7A7468] uppercase tracking-wider mb-3">
              Teknik Özellikler
            </p>
            <SpecImageViewer images={images} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-[10px] text-[#B5AFA6]">
          2B Hub · Bu sayfa ürün bilgilendirme amaçlıdır.
        </p>
      </footer>
    </div>
  );
}
