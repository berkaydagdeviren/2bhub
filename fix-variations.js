const fs = require("fs");
const path = require("path");

const dirPath = path.join(
  __dirname,
  "src",
  "app",
  "api",
  "products",
  "[id]",
  "variations"
);
fs.mkdirSync(dirPath, { recursive: true });

fs.writeFileSync(
  path.join(dirPath, "route.ts"),
  `import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — all variations for a product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: variations, error: vErr } = await supabaseAdmin
      .from("product_variations")
      .select("*")
      .eq("product_id", params.id)
      .order("sort_order", { ascending: true });

    if (vErr) throw vErr;

    const { data: groups, error: gErr } = await supabaseAdmin
      .from("variation_groups")
      .select("*")
      .eq("product_id", params.id)
      .order("sort_order", { ascending: true });

    if (gErr) throw gErr;

    return NextResponse.json({
      variations: variations || [],
      groups: groups || [],
    });
  } catch (err) {
    console.error("Variations GET error:", err);
    return NextResponse.json(
      { error: "Failed to load variations" },
      { status: 500 }
    );
  }
}

// POST — save variations (bulk replace strategy)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { variations, groups } = body;

    // Delete existing
    await supabaseAdmin
      .from("product_variations")
      .delete()
      .eq("product_id", params.id);

    await supabaseAdmin
      .from("variation_groups")
      .delete()
      .eq("product_id", params.id);

    // Insert new groups
    if (groups && groups.length > 0) {
      const groupRows = groups.map((g: { name: string; values: string[] }, i: number) => ({
        product_id: params.id,
        name: g.name,
        values: g.values,
        sort_order: i,
      }));

      const { error: gErr } = await supabaseAdmin
        .from("variation_groups")
        .insert(groupRows);

      if (gErr) throw gErr;
    }

    // Insert new variations
    if (variations && variations.length > 0) {
      const varRows = variations.map(
        (
          v: {
            variation_label: string;
            has_custom_price?: boolean;
            list_price?: number;
            discount_percent?: number;
            sku?: string;
          },
          i: number
        ) => ({
          product_id: params.id,
          variation_label: v.variation_label,
          has_custom_price: v.has_custom_price || false,
          list_price: v.list_price || null,
          discount_percent: v.discount_percent || null,
          sku: v.sku || null,
          sort_order: i,
        })
      );

      const { error: vErr } = await supabaseAdmin
        .from("product_variations")
        .insert(varRows);

      if (vErr) throw vErr;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Variations POST error:", err);
    return NextResponse.json(
      { error: "Failed to save variations" },
      { status: 500 }
    );
  }
}
`,
  "utf-8"
);

console.log("✅ Created src/app/api/products/[id]/variations/route.ts");