import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — list all products
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const brandId = url.searchParams.get("brand_id") || "";
    const supplierId = url.searchParams.get("supplier_id") || "";
    const activeOnly = url.searchParams.get("active") !== "false";

    let query = supabaseAdmin
  .from("products")
  .select("*, brand:brands(*), supplier:suppliers!products_current_supplier_id_fkey(*), variations:product_variations(*)")

    if (activeOnly) {
      query = query.eq("is_active", true);
    }
    if (brandId) {
      query = query.eq("brand_id", brandId);
    }
    if (supplierId) {
      query = query.eq("current_supplier_id", supplierId);
    }
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ products: data || [] });
  } catch (err) {
    console.error("Products GET error:", err);
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    );
  }
}

// POST — create a product
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin can create products
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can create products" },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    // Build product record
    const product = {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      netsis_code: body.netsis_code?.trim() || null,
      image_url: body.image_url?.trim() || null,
      brand_id: body.brand_id || null,
      current_supplier_id: body.current_supplier_id || null,
      currency: body.currency || "TRY",
      list_price: body.list_price || 0,
      discount_percent: body.discount_percent || 0,
      kdv_percent: body.kdv_percent ?? 20,
      profit_percent: body.profit_percent ?? 35,
      has_price2: body.has_price2 || false,
      price2_label: body.price2_label?.trim() || "Price 2",
      list_price2: body.list_price2 || 0,
      discount_percent2: body.discount_percent2 || 0,
    };

    const { data, error } = await supabaseAdmin
      .from("products")
      .insert(product)
      .select("*, brand:brands(*), supplier:suppliers!products_current_supplier_id_fkey(*)")
      .single();

    if (error) throw error;

    // If supplier assigned, also create product_suppliers link
    if (product.current_supplier_id) {
      await supabaseAdmin.from("product_suppliers").upsert(
        {
          product_id: data.id,
          supplier_id: product.current_supplier_id,
          list_price: product.list_price,
          discount_percent: product.discount_percent,
          is_current: true,
        },
        { onConflict: "product_id,supplier_id" }
      );
    }

    return NextResponse.json({ product: data }, { status: 201 });
  } catch (err) {
    console.error("Products POST error:", err);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}