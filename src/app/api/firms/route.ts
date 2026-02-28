import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — all firms
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const lockedOnly = url.searchParams.get("locked") === "true";

    let query = supabaseAdmin
      .from("firms")
      .select("*")
      .order("name", { ascending: true });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }
    if (lockedOnly) {
      query = query.eq("is_locked", true);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Get sale counts per firm
    const { data: saleCounts, error: scErr } = await supabaseAdmin
      .from("b2b_sales")
      .select("firm_id");

    if (scErr) throw scErr;

    const countMap: Record<string, number> = {};
    for (const row of saleCounts || []) {
      if (row.firm_id) {
        countMap[row.firm_id] = (countMap[row.firm_id] || 0) + 1;
      }
    }

    const firmsWithCounts = (data || []).map((f) => ({
      ...f,
      sale_count: countMap[f.id] || 0,
    }));

    return NextResponse.json({ firms: firmsWithCounts });
  } catch (err) {
    console.error("Firms GET error:", err);
    return NextResponse.json(
      { error: "Failed to load firms" },
      { status: 500 }
    );
  }
}

// POST — create firm
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, contact_person, phone, email, address, tax_number, tax_office, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Firm name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("firms")
      .insert({
        name: name.trim(),
        contact_person: contact_person?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        tax_number: tax_number?.trim() || null,
        tax_office: tax_office?.trim() || null,
        notes: notes?.trim() || null,
      })
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

    return NextResponse.json({ firm: data }, { status: 201 });
  } catch (err) {
    console.error("Firms POST error:", err);
    return NextResponse.json(
      { error: "Failed to create firm" },
      { status: 500 }
    );
  }
}