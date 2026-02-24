const fs = require("fs");
const path = require("path");

const dirPath = path.join(__dirname, "src", "app", "api", "products", "[id]");
fs.mkdirSync(dirPath, { recursive: true });

fs.writeFileSync(
  path.join(dirPath, "route.ts"),
  `import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — single product with all relations
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: product, error } = await supabaseAdmin
      .from("products")
      .select("*, brand:brands(*), supplier:suppliers!products_current_supplier_id_fkey(*)")
      .eq("id", params.id)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Fetch variations
    const { data: variations } = await supabaseAdmin
      .from("product_variations")
      .select("*")
      .eq("product_id", params.id)
      .order("sort_order", { ascending: true });

    // Fetch variation groups
    const { data: variationGroups } = await supabaseAdmin
      .from("variation_groups")
      .select("*")
      .eq("product_id", params.id)
      .order("sort_order", { ascending: true });

    // Fetch all supplier links
    const { data: supplierLinks } = await supabaseAdmin
      .from("product_suppliers")
      .select("*, supplier:suppliers(*)")
      .eq("product_id", params.id);

    return NextResponse.json({
      product: {
        ...product,
        variations: variations || [],
        variation_groups: variationGroups || [],
        supplier_links: supplierLinks || [],
      },
    });
  } catch (err) {
    console.error("Product GET error:", err);
    return NextResponse.json(
      { error: "Failed to load product" },
      { status: 500 }
    );
  }
}

// PUT — update product
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    const fields = [
      "name", "description", "netsis_code", "image_url",
      "brand_id", "current_supplier_id", "currency",
      "list_price", "discount_percent", "kdv_percent", "profit_percent",
      "has_price2", "price2_label", "list_price2", "discount_percent2",
      "qr_code", "is_active"
    ];

    for (const field of fields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .update(updates)
      .eq("id", params.id)
      .select("*, brand:brands(*), supplier:suppliers!products_current_supplier_id_fkey(*)")
      .single();

    if (error) throw error;

    // Sync product_suppliers if supplier changed
    if (updates.current_supplier_id) {
      await supabaseAdmin
        .from("product_suppliers")
        .update({ is_current: false })
        .eq("product_id", params.id);

      await supabaseAdmin.from("product_suppliers").upsert(
        {
          product_id: params.id,
          supplier_id: updates.current_supplier_id as string,
          list_price: updates.list_price ?? data.list_price,
          discount_percent: updates.discount_percent ?? data.discount_percent,
          is_current: true,
        },
        { onConflict: "product_id,supplier_id" }
      );
    }

    return NextResponse.json({ product: data });
  } catch (err) {
    console.error("Product PUT error:", err);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE — soft delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("products")
      .update({ is_active: false })
      .eq("id", params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Product DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
`,
  "utf-8"
);

console.log("✅ Created src/app/api/products/[id]/route.ts");