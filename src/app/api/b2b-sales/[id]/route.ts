import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — single b2b sale
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from("b2b_sales")
      .select("*, items:b2b_sale_items(*)")
      .eq("id", params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    return NextResponse.json({ sale: data });
  } catch (err) {
    console.error("B2B Sale GET error:", err);
    return NextResponse.json(
      { error: "Failed to load sale" },
      { status: 500 }
    );
  }
}

// PUT — update b2b sale (returns, swaps, mark processed)
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
    const { action } = body;

    // MARK AS PROCESSED
    if (action === "mark_processed") {
      const { data, error } = await supabaseAdmin
        .from("b2b_sales")
        .update({
          is_processed: true,
          processed_at: new Date().toISOString(),
          processed_by: user.id,
        })
        .eq("id", params.id)
        .select("*, items:b2b_sale_items(*)")
        .single();

      if (error) throw error;
      return NextResponse.json({ sale: data });
    }

    // UNMARK PROCESSED
    if (action === "unmark_processed") {
      const { data, error } = await supabaseAdmin
        .from("b2b_sales")
        .update({
          is_processed: false,
          processed_at: null,
          processed_by: null,
        })
        .eq("id", params.id)
        .select("*, items:b2b_sale_items(*)")
        .single();

      if (error) throw error;
      return NextResponse.json({ sale: data });
    }

    // FULL RETURN
    if (action === "full_return") {
      const { data: items } = await supabaseAdmin
        .from("b2b_sale_items")
        .select("id, quantity")
        .eq("sale_id", params.id);

      if (items) {
        for (const item of items) {
          await supabaseAdmin
            .from("b2b_sale_items")
            .update({ returned_quantity: item.quantity })
            .eq("id", item.id);
        }
      }

      const { data, error } = await supabaseAdmin
        .from("b2b_sales")
        .update({ status: "returned" })
        .eq("id", params.id)
        .select("*, items:b2b_sale_items(*)")
        .single();

      if (error) throw error;
      return NextResponse.json({ sale: data });
    }

    // PARTIAL RETURN
    if (action === "partial_return") {
      const { item_id, return_quantity } = body;

      if (!item_id || return_quantity === undefined) {
        return NextResponse.json(
          { error: "item_id and return_quantity required" },
          { status: 400 }
        );
      }

      const { data: item, error: itemErr } = await supabaseAdmin
        .from("b2b_sale_items")
        .select("quantity, returned_quantity")
        .eq("id", item_id)
        .single();

      if (itemErr || !item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      const newReturnQty = Number(item.returned_quantity) + Number(return_quantity);
      if (newReturnQty > Number(item.quantity)) {
        return NextResponse.json(
          { error: "Cannot return more than purchased" },
          { status: 400 }
        );
      }

      await supabaseAdmin
        .from("b2b_sale_items")
        .update({ returned_quantity: newReturnQty })
        .eq("id", item_id);

      // Check all items status
      const { data: allItems } = await supabaseAdmin
        .from("b2b_sale_items")
        .select("quantity, returned_quantity")
        .eq("sale_id", params.id)
        .eq("is_swap", false);

      let allReturned = true;
      let anyReturned = false;

      if (allItems) {
        for (const i of allItems) {
          if (Number(i.returned_quantity) > 0) anyReturned = true;
          if (Number(i.returned_quantity) < Number(i.quantity)) allReturned = false;
        }
      }

      const newStatus = allReturned
        ? "returned"
        : anyReturned
        ? "partially_returned"
        : "active";

      const { data, error } = await supabaseAdmin
        .from("b2b_sales")
        .update({ status: newStatus })
        .eq("id", params.id)
        .select("*, items:b2b_sale_items(*)")
        .single();

      if (error) throw error;
      return NextResponse.json({ sale: data });
    }

    // SWAP — return item and add replacement
    if (action === "swap") {
      const { item_id, return_quantity, new_product } = body;

      if (!item_id || !return_quantity || !new_product) {
        return NextResponse.json(
          { error: "item_id, return_quantity, and new_product required" },
          { status: 400 }
        );
      }

      // Process the return
      const { data: item, error: itemErr } = await supabaseAdmin
        .from("b2b_sale_items")
        .select("quantity, returned_quantity")
        .eq("id", item_id)
        .single();

      if (itemErr || !item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      const newReturnQty = Number(item.returned_quantity) + Number(return_quantity);
      if (newReturnQty > Number(item.quantity)) {
        return NextResponse.json(
          { error: "Cannot return more than purchased" },
          { status: 400 }
        );
      }

      await supabaseAdmin
        .from("b2b_sale_items")
        .update({ returned_quantity: newReturnQty })
        .eq("id", item_id);

// Add the swap item
const { error: swapErr } = await supabaseAdmin
  .from("b2b_sale_items")
  .insert({
    sale_id: params.id,
    product_id: new_product.product_id,
    product_name: new_product.product_name,
    product_image: new_product.product_image || null,
    brand_name: new_product.brand_name || null,
    netsis_code: new_product.netsis_code || null,
    variation_label: new_product.variation_label || null,
    quantity: new_product.quantity || return_quantity,
    price_type: new_product.price_type || "price1",
    is_swap: true,
    swap_source_item_id: item_id,
    swap_note: new_product.swap_note || null,
  });

      if (swapErr) throw swapErr;

      // Update sale status
      const { data: allItems } = await supabaseAdmin
        .from("b2b_sale_items")
        .select("quantity, returned_quantity, is_swap")
        .eq("sale_id", params.id);

      let anyReturned = false;
      if (allItems) {
        for (const i of allItems) {
          if (Number(i.returned_quantity) > 0) anyReturned = true;
        }
      }

      const { data, error } = await supabaseAdmin
        .from("b2b_sales")
        .update({ status: anyReturned ? "partially_returned" : "active" })
        .eq("id", params.id)
        .select("*, items:b2b_sale_items(*)")
        .single();

      if (error) throw error;
      return NextResponse.json({ sale: data });
    }

    // UPDATE NOTE
    if (action === "update_note") {
      const { data, error } = await supabaseAdmin
        .from("b2b_sales")
        .update({ note: body.note?.trim() || null })
        .eq("id", params.id)
        .select("*, items:b2b_sale_items(*)")
        .single();

      if (error) throw error;
      return NextResponse.json({ sale: data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("B2B Sale PUT error:", err);
    return NextResponse.json(
      { error: "Failed to update sale" },
      { status: 500 }
    );
  }
}
