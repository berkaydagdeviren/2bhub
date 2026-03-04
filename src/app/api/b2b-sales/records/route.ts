import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import type { FirmRecord, B2BRecord, B2BRecordItem } from "@/types";

export const dynamic = "force-dynamic";

interface ProductPricing {
  list_price: number;
  discount_percent: number;
  kdv_percent: number;
  profit_percent: number;
  list_price2: number | null;
  discount_percent2: number | null;
  currency: string;
}

interface VariationPricing {
  list_price: number | null;
  discount_percent: number | null;
  list_price2: number | null;
  discount_percent2: number | null;
}

function computeSalePrice(
  product: ProductPricing,
  variation: VariationPricing | null,
  priceType: "price1" | "price2",
  rates: { usd_try: number; eur_try: number }
): number {
  // Variation-level prices override product-level prices when present
  const listPrice =
    priceType === "price2"
      ? (variation?.list_price2 ?? product.list_price2 ?? product.list_price)
      : (variation?.list_price ?? product.list_price);

  const discountPct =
    priceType === "price2"
      ? (variation?.discount_percent2 ?? product.discount_percent2 ?? product.discount_percent)
      : (variation?.discount_percent ?? product.discount_percent);

  const buy = listPrice * (1 - discountPct / 100);
  const exKdv = buy * (1 + product.profit_percent / 100);

  const rate =
    product.currency === "USD"
      ? rates.usd_try
      : product.currency === "EUR"
      ? rates.eur_try
      : 1;

  const saleTry = product.currency === "TRY" ? exKdv : exKdv * rate;
  return Math.round(saleTry * 100) / 100;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "date_from and date_to are required" },
        { status: 400 }
      );
    }

    // Fetch currency rates
    const { data: settingsRow } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "currency_rates")
      .single();

    const rates = (settingsRow?.value as {
      usd_try: number;
      eur_try: number;
    }) || { usd_try: 0, eur_try: 0 };

    // Fetch sales with items joined to products for base pricing
    const { data: sales, error } = await supabaseAdmin
      .from("b2b_sales")
      .select(
        "*, items:b2b_sale_items(*, product:products(list_price, discount_percent, kdv_percent, profit_percent, has_price2, list_price2, discount_percent2, currency))"
      )
      .gte("created_at", dateFrom + "T00:00:00")
      .lte("created_at", dateTo + "T23:59:59")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Collect all product IDs that appear in these sales
    const productIds = [
      ...new Set(
        (sales || []).flatMap((s) =>
          (s.items || []).map((i: { product_id: string }) => i.product_id)
        )
      ),
    ];

    // Fetch variation-level pricing for all relevant products.
    // Only variations with has_custom_price=true carry their own prices.
    const variationMap = new Map<string, VariationPricing>();
    if (productIds.length > 0) {
      const { data: variations } = await supabaseAdmin
        .from("product_variations")
        .select(
          "product_id, variation_label, list_price, discount_percent, list_price2, discount_percent2"
        )
        .in("product_id", productIds)
        .eq("has_custom_price", true);

      for (const v of variations || []) {
        // Key: "product_id:variation_label" — unique per product variation
        variationMap.set(`${v.product_id}:${v.variation_label}`, {
          list_price: v.list_price,
          discount_percent: v.discount_percent,
          list_price2: v.list_price2,
          discount_percent2: v.discount_percent2,
        });
      }
    }

    // Group by firm and enrich items with computed prices
    const firmMap = new Map<string, FirmRecord>();

    for (const sale of sales || []) {
      const enrichedItems: B2BRecordItem[] = (sale.items || []).map(
        (item: {
          product?: ProductPricing | null;
          product_id: string;
          variation_label: string | null;
          price_type?: string;
          quantity: number;
          returned_quantity: number;
          [key: string]: unknown;
        }) => {
          const { product, ...rest } = item;
          let salePriceTry = 0;

          if (product) {
            const variationKey = item.variation_label
              ? `${item.product_id}:${item.variation_label}`
              : null;
            const variation = variationKey
              ? (variationMap.get(variationKey) ?? null)
              : null;

            salePriceTry = computeSalePrice(
              product,
              variation,
              (item.price_type as "price1" | "price2") || "price1",
              rates
            );
          }

          const activeQty =
            Number(item.quantity) - Number(item.returned_quantity);
          const lineTotalTry =
            Math.round(salePriceTry * activeQty * 100) / 100;

          return {
            ...(rest as Omit<B2BRecordItem, "sale_price_try" | "line_total_try">),
            sale_price_try: salePriceTry,
            line_total_try: lineTotalTry,
          };
        }
      );

      const enrichedSale: B2BRecord = { ...sale, items: enrichedItems };

      if (!firmMap.has(sale.firm_id)) {
        firmMap.set(sale.firm_id, {
          firm_id: sale.firm_id,
          firm_name: sale.firm_name,
          sales: [],
          total_items: 0,
          unprocessed_count: 0,
        });
      }

      const firmRecord = firmMap.get(sale.firm_id)!;
      firmRecord.sales.push(enrichedSale);
      if (!sale.is_processed) firmRecord.unprocessed_count++;

      firmRecord.total_items += enrichedItems.filter(
        (i) =>
          Number(i.quantity) - Number(i.returned_quantity) > 0 && !i.is_swap
      ).length;
    }

    const firms = Array.from(firmMap.values()).sort((a, b) =>
      a.firm_name.localeCompare(b.firm_name, "tr")
    );

    return NextResponse.json({ firms, rates });
  } catch (err) {
    console.error("B2B Records GET error:", err);
    return NextResponse.json(
      { error: "Failed to load B2B records" },
      { status: 500 }
    );
  }
}
