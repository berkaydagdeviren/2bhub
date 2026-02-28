const fs = require("fs");
const path = require("path");

const dirPath = path.join(__dirname, "src", "app", "api", "firms", "[id]");
fs.mkdirSync(dirPath, { recursive: true });

fs.writeFileSync(
  path.join(dirPath, "route.ts"),
  `import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — single firm with sale history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: firm, error } = await supabaseAdmin
      .from("firms")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }

    // Fetch sales for this firm
    const url = new URL(request.url);
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");
    const productSearch = url.searchParams.get("product");
    const processedFilter = url.searchParams.get("processed");

    let salesQuery = supabaseAdmin
      .from("b2b_sales")
      .select("*, items:b2b_sale_items(*)")
      .eq("firm_id", params.id)
      .order("created_at", { ascending: false });

    if (dateFrom) {
      salesQuery = salesQuery.gte("created_at", dateFrom + "T00:00:00");
    }
    if (dateTo) {
      salesQuery = salesQuery.lte("created_at", dateTo + "T23:59:59");
    }
    if (processedFilter === "true") {
      salesQuery = salesQuery.eq("is_processed", true);
    } else if (processedFilter === "false") {
      salesQuery = salesQuery.eq("is_processed", false);
    }

    const { data: sales, error: salesErr } = await salesQuery;
    if (salesErr) throw salesErr;

    // Filter by product name if specified
    let filteredSales = sales || [];
    if (productSearch) {
      const searchLower = productSearch.toLowerCase();
      filteredSales = filteredSales.filter((sale) =>
        sale.items?.some((item: { product_name: string }) =>
          item.product_name.toLowerCase().includes(searchLower)
        )
      );
    }

    return NextResponse.json({
      firm,
      sales: filteredSales,
    });
  } catch (err) {
    console.error("Firm GET error:", err);
    return NextResponse.json(
      { error: "Failed to load firm" },
      { status: 500 }
    );
  }
}

// PUT — update firm (including lock/unlock)
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

    // Lock/Unlock action
    if (body.action === "lock") {
      const { data, error } = await supabaseAdmin
        .from("firms")
        .update({
          is_locked: true,
          lock_reason: body.lock_reason?.trim() || "Payment issue",
        })
        .eq("id", params.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ firm: data });
    }

    if (body.action === "unlock") {
      const { data, error } = await supabaseAdmin
        .from("firms")
        .update({
          is_locked: false,
          lock_reason: null,
        })
        .eq("id", params.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ firm: data });
    }

    // Regular update
    const updates: Record<string, unknown> = {};
    const fields = [
      "name", "contact_person", "phone", "email",
      "address", "tax_number", "tax_office", "notes"
    ];

    for (const field of fields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]?.trim() || null;
      }
    }

    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json(
        { error: "Firm name cannot be empty" },
        { status: 400 }
      );
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("firms")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A firm with this name already exists" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ firm: data });
  } catch (err) {
    console.error("Firm PUT error:", err);
    return NextResponse.json(
      { error: "Failed to update firm" },
      { status: 500 }
    );
  }
}

// DELETE — remove firm (only if no sales)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    // Check for existing sales
    const { count } = await supabaseAdmin
      .from("b2b_sales")
      .select("*", { count: "exact", head: true })
      .eq("firm_id", params.id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: "Cannot delete firm with existing sales. Lock it instead." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("firms")
      .delete()
      .eq("id", params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Firm DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete firm" },
      { status: 500 }
    );
  }
}
`,
  "utf-8"
);

console.log("✅ Created src/app/api/firms/[id]/route.ts");