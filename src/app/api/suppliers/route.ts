import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: suppliers, error } = await supabaseAdmin
      .from("suppliers")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    // Get product counts per supplier
    const { data: counts, error: countErr } = await supabaseAdmin
      .from("products")
      .select("current_supplier_id")
      .eq("is_active", true);

    if (countErr) throw countErr;

    const countMap: Record<string, number> = {};
    for (const row of counts || []) {
      if (row.current_supplier_id) {
        countMap[row.current_supplier_id] =
          (countMap[row.current_supplier_id] || 0) + 1;
      }
    }

    const suppliersWithCounts = (suppliers || []).map((s) => ({
      ...s,
      product_count: countMap[s.id] || 0,
    }));

    return NextResponse.json({ suppliers: suppliersWithCounts });
  } catch (err) {
    console.error("Suppliers GET error:", err);
    return NextResponse.json(
      { error: "Failed to load suppliers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, contact_info, vade_days, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Supplier name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("suppliers")
      .insert({
        name: name.trim(),
        contact_info: contact_info?.trim() || null,
        vade_days: vade_days || 0,
        notes: notes?.trim() || null,
      })
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

    return NextResponse.json({ supplier: data }, { status: 201 });
  } catch (err) {
    console.error("Suppliers POST error:", err);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}