import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

// GET — generate QR code for product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify product exists
    const { data: product, error } = await supabaseAdmin
      .from("products")
      .select("id, name")
      .eq("id", params.id)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Build public URL for this product
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const productUrl = baseUrl + "/p/" + params.id;

    // Generate QR as data URL (PNG base64)
    const qrDataUrl = await QRCode.toDataURL(productUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: "#1A1A1A",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    });

    // Also generate as SVG string for printing
    const qrSvg = await QRCode.toString(productUrl, {
      type: "svg",
      width: 400,
      margin: 2,
      color: {
        dark: "#1A1A1A",
        light: "#FFFFFF",
      },
    });

    // Store QR URL in product
    await supabaseAdmin
      .from("products")
      .update({ qr_code: productUrl })
      .eq("id", params.id);

    return NextResponse.json({
      qr_data_url: qrDataUrl,
      qr_svg: qrSvg,
      product_url: productUrl,
      product_name: product.name,
    });
  } catch (err) {
    console.error("QR generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}
