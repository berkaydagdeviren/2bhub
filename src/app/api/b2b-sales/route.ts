import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — list b2b sales
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const firmId = url.searchParams.get("firm_id");
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");
    const processed = url.searchParams.get("processed");
    const status = url.searchParams.get("status");

    let query = supabaseAdmin
      .from("b2b_sales")
      .select("*, items:b2b_sale_items(*)")
      .order("created_at", { ascending: false });

    if (firmId) query = query.eq("firm_id", firmId);
    if (dateFrom) query = query.gte("created_at", dateFrom + "T00:00:00");
    if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59");
    if (processed === "true") query = query.eq("is_processed", true);
    if (processed === "false") query = query.eq("is_processed", false);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ sales: data || [] });
  } catch (err) {
    console.error("B2B Sales GET error:", err);
    return NextResponse.json(
      { error: "Failed to load B2B sales" },
      { status: 500 }
    );
  }
}

// POST — create b2b sale
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { firm_id, firm_name, items, note } = body;

    if (!firm_id || !firm_name) {
      return NextResponse.json(
        { error: "Firm is required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Check if firm is locked
    const { data: firm, error: firmErr } = await supabaseAdmin
      .from("firms")
      .select("is_locked, lock_reason")
      .eq("id", firm_id)
      .single();

    if (firmErr || !firm) {
      return NextResponse.json(
        { error: "Firm not found" },
        { status: 404 }
      );
    }

    if (firm.is_locked) {
      return NextResponse.json(
        {
          error: `This firm is locked: ${firm.lock_reason || "Payment issue"}. Cannot create sales.`,
        },
        { status: 403 }
      );
    }

    // Create sale
    const { data: sale, error: saleErr } = await supabaseAdmin
      .from("b2b_sales")
      .insert({
        firm_id,
        firm_name: firm_name.trim(),
        employee_id: user.id,
        employee_username: user.username,
        note: note?.trim() || null,
      })
      .select()
      .single();

    if (saleErr) throw saleErr;

    // Create items
    const saleItems = items.map(
  (item: {
    product_id: string;
    product_name: string;
    product_image?: string;
    brand_name?: string;
    netsis_code?: string;
    variation_label?: string;
    quantity: number;
    price_type?: string;
  }) => ({
    sale_id: sale.id,
    product_id: item.product_id,
    product_name: item.product_name,
    product_image: item.product_image || null,
    brand_name: item.brand_name || null,
    netsis_code: item.netsis_code || null,
    variation_label: item.variation_label || null,
    quantity: item.quantity,
    price_type: item.price_type || "price1",
  })
);

    const { error: itemsErr } = await supabaseAdmin
      .from("b2b_sale_items")
      .insert(saleItems);

    if (itemsErr) throw itemsErr;

    // Fetch complete sale
    const { data: completeSale } = await supabaseAdmin
      .from("b2b_sales")
      .select("*, items:b2b_sale_items(*)")
      .eq("id", sale.id)
      .single();

    return NextResponse.json({ sale: completeSale }, { status: 201 });
  } catch (err) {
    console.error("B2B Sales POST error:", err);
    return NextResponse.json(
      { error: "Failed to create B2B sale" },
      { status: 500 }
    );
  }
}