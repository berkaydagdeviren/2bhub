import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — all spec images for a product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from("product_spec_images")
      .select("*")
      .eq("product_id", params.id)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ images: data || [] });
  } catch (err) {
    console.error("Spec images GET error:", err);
    return NextResponse.json(
      { error: "Failed to load spec images" },
      { status: 500 }
    );
  }
}

// POST — upload a spec image (accepts base64)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { image_data, caption } = body;

    if (!image_data) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      );
    }

    // Parse base64
    const matches = image_data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json(
        { error: "Invalid image format" },
        { status: 400 }
      );
    }

    const ext = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Upload to Supabase Storage
    const fileName = params.id + "/" + Date.now() + "." + ext;
    console.log(fileName)
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("spec-images")
      .upload(fileName, buffer, {
        contentType: "image/" + ext,
        upsert: false,
      });

    if (uploadErr) throw uploadErr;

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("spec-images")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;
    console.log(imageUrl, "imageUrl")
    // Get current count for sort order
    const { count } = await supabaseAdmin
      .from("product_spec_images")
      .select("*", { count: "exact", head: true })
      .eq("product_id", params.id);

    // Save to DB
    const { data, error: dbErr } = await supabaseAdmin
      .from("product_spec_images")
      .insert({
        product_id: params.id,
        image_url: imageUrl,
        caption: caption || null,
        sort_order: (count || 0),
      })
      .select()
      .single();

    if (dbErr) throw dbErr;

    return NextResponse.json({ image: data }, { status: 201 });
  } catch (err) {
    console.error("Spec image upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}

// DELETE — remove a spec image
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("image_id");

    if (!imageId) {
      return NextResponse.json(
        { error: "image_id is required" },
        { status: 400 }
      );
    }

    // Get image URL to delete from storage
    const { data: img } = await supabaseAdmin
      .from("product_spec_images")
      .select("image_url")
      .eq("id", imageId)
      .single();

    if (img?.image_url) {
      // Extract path from URL
      const urlParts = img.image_url.split("/spec-images/");
      if (urlParts[1]) {
        await supabaseAdmin.storage
          .from("spec-images")
          .remove([urlParts[1]]);
      }
    }

    const { error } = await supabaseAdmin
      .from("product_spec_images")
      .delete()
      .eq("id", imageId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Spec image DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
