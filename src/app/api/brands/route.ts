import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — all brands with product counts
export async function GET() {
  try {
    const { data: brands, error } = await supabaseAdmin
      .from("brands")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    // Get product counts per brand
    const { data: counts, error: countErr } = await supabaseAdmin
      .from("products")
      .select("brand_id")
      .eq("is_active", true);

    if (countErr) throw countErr;

    const countMap: Record<string, number> = {};
    for (const row of counts || []) {
      if (row.brand_id) {
        countMap[row.brand_id] = (countMap[row.brand_id] || 0) + 1;
      }
    }

    const brandsWithCounts = (brands || []).map((b) => ({
      ...b,
      product_count: countMap[b.id] || 0,
    }));

    return NextResponse.json({ brands: brandsWithCounts });
  } catch (err) {
    console.error("Brands GET error:", err);
    return NextResponse.json(
      { error: "Failed to load brands" },
      { status: 500 }
    );
  }
}

// POST — create a new brand
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Brand name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("brands")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A brand with this name already exists" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ brand: data }, { status: 201 });
  } catch (err) {
    console.error("Brands POST error:", err);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}