import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — single supplier with its products
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: supplier, error } = await supabaseAdmin
      .from("suppliers")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Products where this supplier is current
    const { data: currentProducts, error: cpErr } = await supabaseAdmin
      .from("products")
      .select("id, name, image_url, list_price, discount_percent, currency")
      .eq("current_supplier_id", params.id)
      .eq("is_active", true)
      .order("name");

    if (cpErr) throw cpErr;

    // All product_suppliers entries for this supplier
    const { data: allLinks, error: alErr } = await supabaseAdmin
      .from("product_suppliers")
      .select("*, product:products(id, name, image_url)")
      .eq("supplier_id", params.id);

    if (alErr) throw alErr;

    return NextResponse.json({
      supplier,
      current_products: currentProducts || [],
      all_product_links: allLinks || [],
    });
  } catch (err) {
    console.error("Supplier GET error:", err);
    return NextResponse.json(
      { error: "Failed to load supplier" },
      { status: 500 }
    );
  }
}

// PUT — update supplier
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json(
          { error: "Supplier name cannot be empty" },
          { status: 400 }
        );
      }
      updates.name = body.name.trim();
    }
    if (body.contact_info !== undefined)
      updates.contact_info = body.contact_info?.trim() || null;
    if (body.vade_days !== undefined)
      updates.vade_days = body.vade_days;
    if (body.notes !== undefined)
      updates.notes = body.notes?.trim() || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("suppliers")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A supplier with this name already exists" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ supplier: data });
  } catch (err) {
    console.error("Supplier PUT error:", err);
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 }
    );
  }
}

// DELETE — remove supplier
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from("suppliers")
      .delete()
      .eq("id", params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Supplier DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 }
    );
  }
}
