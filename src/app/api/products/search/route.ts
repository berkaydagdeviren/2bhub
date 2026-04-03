import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Normalize dimension queries so various formats match stored variation labels.
 * "M8x50" → "M8 × 50"
 * "M8x"   → "M8 ×"   (trailing x — user is mid-typing)
 */
function normalizeQuery(q: string): string {
  return q
    .replace(/([a-zA-Z0-9])\s*[xX]\s*([a-zA-Z0-9])/g, "$1 × $2")
    .replace(/([a-zA-Z0-9])\s*[xX]\s*$/g, "$1 ×")
    .trim();
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

    // Tokenize: split into words of 2+ chars for multi-word smart search
    const tokens = q
      .trim()
      .split(/\s+/)
      .filter((t) => t.length >= 2);

    const seen = new Set<string>();
    const allResults: Record<string, unknown>[] = [];
    const matchedVariations: Record<string, string> = {};

    function addResult(p: Record<string, unknown>) {
      const id = p.id as string;
      if (!seen.has(id)) {
        seen.add(id);
        allResults.push(p);
      }
    }

    // ── 1. Exact substring match on product name ─────────────────
    const { data: nameResults, error } = await supabaseAdmin
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .ilike("name", "%" + q + "%")
      .order("name")
      .limit(20);

    if (error) throw error;
    for (const p of nameResults || []) addResult(p);

    // ── 2. Multi-token intersection: all words must appear in name ─
    // Handles "profesyonel şerit metre" → name ILIKE %profesyonel% AND %şerit% AND %metre%
    if (tokens.length > 1 && tokens.length <= 6) {
      let tq = supabaseAdmin
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("is_active", true);
      for (const t of tokens) {
        tq = tq.ilike("name", "%" + t + "%");
      }
      const { data: tokenRes } = await tq.order("name").limit(20);
      for (const p of tokenRes || []) addResult(p);
    }

    // ── 3. Brand-based search ────────────────────────────────────
    // Find brands matching any token, then search their products
    // filtered by remaining (non-brand) tokens in the product name.
    if (tokens.length > 0) {
      const orCond = tokens.map((t) => `name.ilike.%${t}%`).join(",");
      const { data: brandMatches } = await supabaseAdmin
        .from("brands")
        .select("id, name")
        .or(orCond);

      if (brandMatches && brandMatches.length > 0) {
        const brandIds = brandMatches.map((b) => b.id);

        // Determine which tokens are brand-name tokens so we don't
        // require them to also appear in the product name.
        const brandWords = new Set(
          brandMatches.flatMap((b) =>
            b.name.toLowerCase().split(/\s+/)
          )
        );
        const nonBrandTokens = tokens.filter(
          (t) => !brandWords.has(t.toLowerCase())
        );

        let bq = supabaseAdmin
          .from("products")
          .select(PRODUCT_SELECT)
          .eq("is_active", true)
          .in("brand_id", brandIds);
        for (const t of nonBrandTokens) {
          bq = bq.ilike("name", "%" + t + "%");
        }
        const { data: brandProds } = await bq.order("name").limit(20);
        for (const p of brandProds || []) addResult(p);
      }
    }

    // ── 4. Variation-label search ────────────────────────────────
    // Uses normalized query so "M8x50" hits "M8 × 50",
    // and "M8x" (mid-type) hits "M8 × 50" via "M8 ×" prefix match.
    const varQuery = normalized !== q ? normalized : q;
    const { data: varMatches } = await supabaseAdmin
      .from("product_variations")
      .select("product_id, variation_label")
      .ilike("variation_label", "%" + varQuery + "%")
      .eq("is_active", true)
      .limit(60);

    // Also try the raw query if it differs from normalized (catches edge cases)
    const extraVarMatches: typeof varMatches = [];
    if (normalized !== q) {
      const { data: rawVarMatches } = await supabaseAdmin
        .from("product_variations")
        .select("product_id, variation_label")
        .ilike("variation_label", "%" + q + "%")
        .eq("is_active", true)
        .limit(60);
      for (const v of rawVarMatches || []) {
        if (!(varMatches || []).some((m) => m.product_id === v.product_id && m.variation_label === v.variation_label)) {
          extraVarMatches.push(v);
        }
      }
    }

    const allVarMatches = [...(varMatches || []), ...extraVarMatches];

    if (allVarMatches.length > 0) {
      // Build matched variation map (first match per product)
      for (const v of allVarMatches) {
        if (!matchedVariations[v.product_id]) {
          matchedVariations[v.product_id] = v.variation_label;
        }
      }

      // Fetch products found only via variation (not already in results)
      const extraIds = [
        ...new Set(
          allVarMatches
            .map((v) => v.product_id)
            .filter((id) => !seen.has(id))
        ),
      ];

      if (extraIds.length > 0) {
        const { data: extraProducts } = await supabaseAdmin
          .from("products")
          .select(PRODUCT_SELECT)
          .eq("is_active", true)
          .in("id", extraIds)
          .order("name");

        for (const p of extraProducts || []) addResult(p);
      }
    }

    return NextResponse.json({
      products: allResults,
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
