import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — single sale with items
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("retail_sales")
      .select("*, items:retail_sale_items(*)")
      .eq("id", params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    return NextResponse.json({ sale: data });
  } catch (err) {
    console.error("Sale GET error:", err);
    return NextResponse.json(
      { error: "Failed to load sale" },
      { status: 500 }
    );
  }
}

// PUT — update sale (return items, edit discount, etc.)
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

    // FULL RETURN
    if (action === "full_return") {
      // Mark all items as returned
      const { data: items } = await supabaseAdmin
        .from("retail_sale_items")
        .select("id, quantity")
        .eq("sale_id", params.id);

      if (items) {
        for (const item of items) {
          await supabaseAdmin
            .from("retail_sale_items")
            .update({ returned_quantity: item.quantity })
            .eq("id", item.id);
        }
      }

      const { data, error } = await supabaseAdmin
        .from("retail_sales")
        .update({ status: "returned" })
        .eq("id", params.id)
        .select("*, items:retail_sale_items(*)")
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

      // Get current item
      const { data: item, error: itemErr } = await supabaseAdmin
        .from("retail_sale_items")
        .select("quantity, returned_quantity")
        .eq("id", item_id)
        .single();

      if (itemErr || !item) {
        return NextResponse.json(
          { error: "Item not found" },
          { status: 404 }
        );
      }

      const newReturnQty = Number(item.returned_quantity) + Number(return_quantity);
      if (newReturnQty > Number(item.quantity)) {
        return NextResponse.json(
          { error: "Cannot return more than purchased quantity" },
          { status: 400 }
        );
      }

      await supabaseAdmin
        .from("retail_sale_items")
        .update({ returned_quantity: newReturnQty })
        .eq("id", item_id);

      // Check if all items fully returned
      const { data: allItems } = await supabaseAdmin
        .from("retail_sale_items")
        .select("quantity, returned_quantity")
        .eq("sale_id", params.id);

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
        : "completed";

      const { data, error } = await supabaseAdmin
        .from("retail_sales")
        .update({ status: newStatus })
        .eq("id", params.id)
        .select("*, items:retail_sale_items(*)")
        .single();

      if (error) throw error;
      return NextResponse.json({ sale: data });
    }

    // UPDATE DISCOUNT
    if (action === "update_discount") {
      const { discount_amount } = body;

      const { data: sale } = await supabaseAdmin
        .from("retail_sales")
        .select("subtotal")
        .eq("id", params.id)
        .single();

      if (!sale) {
        return NextResponse.json(
          { error: "Sale not found" },
          { status: 404 }
        );
      }

      const disc = parseFloat(discount_amount) || 0;
      const newTotal = Math.round((Number(sale.subtotal) - disc) * 100) / 100;

      const { data, error } = await supabaseAdmin
        .from("retail_sales")
        .update({
          discount_amount: disc,
          total: newTotal,
        })
        .eq("id", params.id)
        .select("*, items:retail_sale_items(*)")
        .single();

      if (error) throw error;
      return NextResponse.json({ sale: data });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Sale PUT error:", err);
    return NextResponse.json(
      { error: "Failed to update sale" },
      { status: 500 }
    );
  }
}

// DELETE — only admin, only soft-return
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    // We don't hard delete — mark as returned
    const { data: items } = await supabaseAdmin
      .from("retail_sale_items")
      .select("id, quantity")
      .eq("sale_id", params.id);

    if (items) {
      for (const item of items) {
        await supabaseAdmin
          .from("retail_sale_items")
          .update({ returned_quantity: item.quantity })
          .eq("id", item.id);
      }
    }

    const { data, error } = await supabaseAdmin
      .from("retail_sales")
      .update({ status: "returned" })
      .eq("id", params.id)
      .select("*, items:retail_sale_items(*)")
      .single();

    if (error) throw error;

    return NextResponse.json({ sale: data });
  } catch (err) {
    console.error("Sale DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete sale" },
      { status: 500 }
    );
  }
}
