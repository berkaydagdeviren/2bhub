import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — fetch notes visible to current user
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch: all global notes + user's own self notes
    const { data, error } = await supabaseAdmin
      .from("notes")
      .select("*")
      .or(`visibility.eq.global,and(visibility.eq.self,created_by.eq.${user.id})`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(
      { notes: data || [] },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (err) {
    console.error("Notes GET error:", err);
    return NextResponse.json(
      { error: "Failed to load notes" },
      { status: 500 }
    );
  }
}

// POST — create a new note
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { body: noteBody, visibility, reminder_date } = body;

    if (!noteBody || !noteBody.trim()) {
      return NextResponse.json(
        { error: "Note body is required" },
        { status: 400 }
      );
    }

    if (visibility && !["self", "global"].includes(visibility)) {
      return NextResponse.json(
        { error: "Visibility must be 'self' or 'global'" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("notes")
      .insert({
        body: noteBody.trim(),
        visibility: visibility || "self",
        reminder_date: reminder_date || null,
        created_by: user.id,
        created_by_username: user.username,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ note: data }, { status: 201 });
  } catch (err) {
    console.error("Notes POST error:", err);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}