import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Normalize user queries so "M8x50" matches variation_label "M8 × 50"
function normalizeQuery(q: string): string {
  return q.replace(/([a-zA-Z0-9])\s*[xX]\s*([a-zA-Z0-9])/g, "$1 × $2").trim();
}

const PRODUCT_SELECT =
  "*, brand:brands(name), variations:product_variations(*), variation_groups:variation_groups(*)";

// GET — fast product search for sale page
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") || "";
    const productId = url.searchParams.get("id") || "";
    const shortId = url.searchParams.get("short_id") || "";

    // Search by full ID (for QR scan)
    if (productId) {
      const { data, error } = await supabaseAdmin
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("id", productId)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        return NextResponse.json({ products: [], matchedVariations: {} });
      }

      return NextResponse.json({ products: [data], matchedVariations: {} });
    }

    // Search by short code (first 8 hex chars of UUID without hyphens)
    // Uses UUID range query — avoids ILIKE on uuid column which needs explicit cast
    if (shortId && shortId.length >= 6) {
      const hex = shortId.replace(/-/g, "").toLowerCase().padEnd(8, "0").slice(0, 8);
      const lowerBound = `${hex}-0000-0000-0000-000000000000`;
      const upperBound = `${hex}-ffff-ffff-ffff-ffffffffffff`;

      const { data: shortResults } = await supabaseAdmin
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("is_active", true)
        .gte("id", lowerBound)
        .lte("id", upperBound)
        .limit(5);

      return NextResponse.json({
        products: shortResults || [],
        matchedVariations: {},
      });
    }

    // Text search
    if (!q || q.length < 2) {
      return NextResponse.json({ products: [], matchedVariations: {} });
    }

    const normalized = normalizeQuery(q);

    // ── 1. Name-based search ─────────────────────────────────────
    const { data: nameResults, error } = await supabaseAdmin
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .ilike("name", "%" + q + "%")
      .order("name")
      .limit(20);

    if (error) throw error;

    const nameResultIds = new Set((nameResults || []).map((p) => p.id));
    const matchedVariations: Record<string, string> = {};

    // ── 2. Variation-label search ────────────────────────────────
    // Use normalized query so "M8x50" hits "M8 × 50"
    const { data: varMatches } = await supabaseAdmin
      .from("product_variations")
      .select("product_id, variation_label")
      .ilike("variation_label", "%" + normalized + "%")
      .eq("is_active", true)
      .limit(60);

    if (varMatches && varMatches.length > 0) {
      // Build matched variation map (first match per product)
      for (const v of varMatches) {
        if (!matchedVariations[v.product_id]) {
          matchedVariations[v.product_id] = v.variation_label;
        }
      }

      // Fetch products found only via variation (not already in name results)
      const extraIds = [
        ...new Set(
          varMatches
            .map((v) => v.product_id)
            .filter((id) => !nameResultIds.has(id))
        ),
      ];

      if (extraIds.length > 0) {
        const { data: extraProducts } = await supabaseAdmin
          .from("products")
          .select(PRODUCT_SELECT)
          .eq("is_active", true)
          .in("id", extraIds)
          .order("name");

        const combined = [...(nameResults || []), ...(extraProducts || [])];
        return NextResponse.json({ products: combined, matchedVariations });
      }
    }

    return NextResponse.json({
      products: nameResults || [],
      matchedVariations,
    });
  } catch (err) {
    console.error("Product search error:", err);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
