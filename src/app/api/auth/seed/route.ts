import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { count, error } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json({ initialized: (count ?? 0) > 0 });
  } catch (err) {
    console.error("System check failed:", err);
    return NextResponse.json({ initialized: false });
  }
}

export async function POST() {
  try {
    const filePath = path.join(process.cwd(), "users.txt");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "users.txt not found in project root" },
        { status: 404 }
      );
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);

    if (lines.length === 0) {
      return NextResponse.json({ error: "users.txt is empty" }, { status: 400 });
    }

    const users = [];
    for (const line of lines) {
      const parts = line.split(";");
      if (parts.length < 2) continue;
      const [username, password] = parts;
      if (!username || !password) continue;
      const cleanUsername = username.toLowerCase().trim();
      const passwordHash = await bcrypt.hash(password.trim(), 12);
      users.push({
        username: cleanUsername,
        password_hash: passwordHash,
        display_name: username.trim(),
        role: cleanUsername === "berkay" ? "admin" : "employee",
      });
    }

    if (users.length === 0) {
      return NextResponse.json(
        { error: "No valid entries in users.txt (format: username;password)" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("users")
      .upsert(users, { onConflict: "username" });

    if (error) {
      console.error("Seed DB error:", error);
      return NextResponse.json({ error: "Database insert failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: users.length });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
