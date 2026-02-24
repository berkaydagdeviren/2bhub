import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — list retail sales with filters
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");
    const employeeId = url.searchParams.get("employee_id");
    const paymentMethod = url.searchParams.get("payment_method");
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = supabaseAdmin
      .from("retail_sales")
      .select("*, items:retail_sale_items(*)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (dateFrom) {
      query = query.gte("created_at", dateFrom + "T00:00:00");
    }
    if (dateTo) {
      query = query.lte("created_at", dateTo + "T23:59:59");
    }
    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }
    if (paymentMethod) {
      query = query.eq("payment_method", paymentMethod);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      sales: data || [],
      total: count || 0,
    });
  } catch (err) {
    console.error("Sales GET error:", err);
    return NextResponse.json(
      { error: "Failed to load sales" },
      { status: 500 }
    );
  }
}

// POST — create a new retail sale
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { items, payment_method, discount_amount, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    if (!payment_method || !["cash", "card"].includes(payment_method)) {
      return NextResponse.json(
        { error: "Payment method must be cash or card" },
        { status: 400 }
      );
    }

    // Calculate totals
    let subtotal = 0;
    const saleItems = items.map(
      (item: {
        product_id: string;
        product_name: string;
        product_image?: string;
        brand_name?: string;
        variation_label?: string;
        quantity: number;
        unit_price: number;
        price_type?: string;
        currency: string;
        exchange_rate: number;
        unit_price_try: number;
      }) => {
        const lineTotal =
          Math.round(item.unit_price_try * item.quantity * 100) / 100;
        subtotal += lineTotal;

        return {
          product_id: item.product_id,
          product_name: item.product_name,
          product_image: item.product_image || null,
          brand_name: item.brand_name || null,
          variation_label: item.variation_label || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          price_type: item.price_type || "price1",
          currency: item.currency,
          exchange_rate: item.exchange_rate,
          unit_price_try: item.unit_price_try,
          line_total: lineTotal,
        };
      }
    );

    subtotal = Math.round(subtotal * 100) / 100;
    const disc = parseFloat(discount_amount) || 0;
    const total = Math.round((subtotal - disc) * 100) / 100;

    // Create sale
    const { data: sale, error: saleErr } = await supabaseAdmin
      .from("retail_sales")
      .insert({
        employee_id: user.id,
        employee_username: user.username,
        subtotal,
        discount_amount: disc,
        total,
        payment_method,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (saleErr) throw saleErr;

    // Create sale items
    const itemsWithSaleId = saleItems.map(
      (item: Record<string, unknown>) => ({
        ...item,
        sale_id: sale.id,
      })
    );

    const { error: itemsErr } = await supabaseAdmin
      .from("retail_sale_items")
      .insert(itemsWithSaleId);

    if (itemsErr) throw itemsErr;

    // Fetch complete sale with items
    const { data: completeSale } = await supabaseAdmin
      .from("retail_sales")
      .select("*, items:retail_sale_items(*)")
      .eq("id", sale.id)
      .single();

    return NextResponse.json(
      { sale: completeSale },
      { status: 201 }
    );
  } catch (err) {
    console.error("Sales POST error:", err);
    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500 }
    );
  }
}