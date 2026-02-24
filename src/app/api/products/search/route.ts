import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET — fast product search for sale page
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") || "";
    const productId = url.searchParams.get("id") || "";

    // Search by ID (for QR scan)
    if (productId) {
      const { data, error } = await supabaseAdmin
        .from("products")
        .select("*, brand:brands(name), variations:product_variations(*)")
        .eq("id", productId)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        return NextResponse.json({ products: [] });
      }

      return NextResponse.json({ products: [data] });
    }

    // Text search
    if (!q || q.length < 2) {
      return NextResponse.json({ products: [] });
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*, brand:brands(name), variations:product_variations(*)")
      .eq("is_active", true)
      .ilike("name", "%" + q + "%")
      .order("name")
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ products: data || [] });
  } catch (err) {
    console.error("Product search error:", err);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
