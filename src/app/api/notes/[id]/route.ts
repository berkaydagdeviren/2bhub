import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

    if (action === "resolve") {
      const { data, error } = await supabaseAdmin
        .from("notes")
        .update({
          is_resolved: true,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", params.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ note: data });
    }

    if (action === "unresolve") {
      const { data, error } = await supabaseAdmin
        .from("notes")
        .update({
          is_resolved: false,
          resolved_by: null,
          resolved_at: null,
        })
        .eq("id", params.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ note: data });
    }

    const updates: Record<string, unknown> = {};
    if (body.body !== undefined) updates.body = body.body;
    if (body.visibility !== undefined) updates.visibility = body.visibility;
    if (body.reminder_date !== undefined) updates.reminder_date = body.reminder_date;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("notes")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ note: data });
  } catch (err) {
    console.error("Notes PUT error:", err);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: note, error: fetchErr } = await supabaseAdmin
      .from("notes")
      .select("created_by")
      .eq("id", params.id)
      .single();

    if (fetchErr || !note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.created_by !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "You can only delete your own notes" },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from("notes")
      .delete()
      .eq("id", params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notes DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
