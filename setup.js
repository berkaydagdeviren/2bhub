const fs = require("fs");
const path = require("path");

function mkdirSafe(dir) {
  fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
}

function writeFile(filePath, content) {
  const full = path.join(__dirname, filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf-8");
}

console.log("🔧 2B Hub — Setting up Checkpoint 1...\n");

// ── Directories ──────────────────────────────────────────
const dirs = [
  "src/types",
  "src/lib/supabase",
  "src/hooks",
  "src/components/ui",
  "src/components/layout",
  "src/app/login",
  "src/app/dashboard",
  "src/app/api/auth/seed",
  "src/app/api/auth/login",
  "src/app/api/auth/logout",
  "src/app/api/auth/me",
  "src/app/api/products",
  "src/app/api/sales",
  "src/app/api/firms",
  "src/app/api/suppliers",
  "src/app/api/brands",
  "src/app/api/notes",
  "src/app/api/settings",
  "src/app/dashboard/products",
  "src/app/dashboard/sales",
  "src/app/dashboard/firms",
  "src/app/dashboard/suppliers",
  "src/app/dashboard/brands",
  "src/app/dashboard/records",
  "src/app/dashboard/reports",
  "supabase/migrations",
  "public",
];

dirs.forEach(mkdirSafe);
console.log("  ✅ Directories created");

// ── .env.local ───────────────────────────────────────────
writeFile(
  ".env.local",
  `NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET=change-me-to-a-strong-random-string-min-32
`
);
console.log("  ✅ .env.local (UPDATE WITH YOUR KEYS)");

// ── users.txt ────────────────────────────────────────────
writeFile("users.txt", "berkay;berkay\n");
console.log("  ✅ users.txt");

// ── SQL Migration ────────────────────────────────────────
writeFile(
  "supabase/migrations/001_users_and_settings.sql",
  `-- 2B HUB — Checkpoint 1: Users & App Settings

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

INSERT INTO app_settings (key, value)
VALUES ('currency_rates', '{"usd_try": 0, "eur_try": 0}')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_settings_updated ON app_settings;
CREATE TRIGGER trg_settings_updated
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`
);
console.log("  ✅ SQL migration");

// ── tailwind.config.ts ───────────────────────────────────
writeFile(
  "tailwind.config.ts",
  `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        hub: {
          bg: "#F7F5F0",
          card: "#FFFFFF",
          primary: "#1A1A1A",
          secondary: "#7A7468",
          accent: "#8B7355",
          "accent-hover": "#6D5A43",
          border: "#E5E0D8",
          error: "#C4464A",
          success: "#5A7C65",
          warning: "#D4A843",
          muted: "#B5AFA6",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        hub: "0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)",
        "hub-md": "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03)",
        "hub-lg": "0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.03)",
      },
    },
  },
  plugins: [],
};

export default config;
`
);
console.log("  ✅ tailwind.config.ts");

// ── src/types/index.ts ───────────────────────────────────
writeFile(
  "src/types/index.ts",
  `export interface User {
  id: string;
  username: string;
  display_name: string | null;
  role: "admin" | "employee";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

export interface AppSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
}

export interface CurrencyRates {
  usd_try: number;
  eur_try: number;
}
`
);
console.log("  ✅ src/types/index.ts");

// ── src/lib/supabase/server.ts ───────────────────────────
writeFile(
  "src/lib/supabase/server.ts",
  `import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
`
);
console.log("  ✅ src/lib/supabase/server.ts");

// ── src/lib/auth.ts ──────────────────────────────────────
writeFile(
  "src/lib/auth.ts",
  `import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import type { NextRequest } from "next/server";
import type { AuthUser } from "@/types";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  return new TextEncoder().encode(secret);
}

export async function createToken(user: {
  id: string;
  username: string;
  role: string;
}): Promise<string> {
  return new SignJWT({
    sub: user.id,
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string) {
  return jwtVerify(token, getSecret());
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token) return null;

    const { payload } = await verifyToken(token);
    return {
      id: payload.sub as string,
      username: payload.username as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export async function getAuthUserFromRequest(
  request: NextRequest
): Promise<AuthUser | null> {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) return null;

    const { payload } = await verifyToken(token);
    return {
      id: payload.sub as string,
      username: payload.username as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export function setAuthCookie(token: string) {
  return {
    name: "auth-token",
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  };
}
`
);
console.log("  ✅ src/lib/auth.ts");

// ── middleware.ts ─────────────────────────────────────────
writeFile(
  "middleware.ts",
  `import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth-token")?.value;

  if (pathname === "/login" && token) {
    try {
      await verifyToken(token);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } catch {
      const response = NextResponse.next();
      response.cookies.delete("auth-token");
      return response;
    }
  }

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/";
  if (isPublic) return NextResponse.next();

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await verifyToken(token);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.sub as string);
    requestHeaders.set("x-username", payload.username as string);
    requestHeaders.set("x-user-role", payload.role as string);
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth-token");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
`
);
console.log("  ✅ middleware.ts");

// ── src/app/globals.css ──────────────────────────────────
writeFile(
  "src/app/globals.css",
  `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    @apply bg-hub-bg text-hub-primary;
  }

  ::selection {
    @apply bg-hub-accent/20 text-hub-primary;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    @apply bg-transparent;
  }
  ::-webkit-scrollbar-thumb {
    @apply bg-hub-border rounded-full hover:bg-hub-muted;
  }
}

@layer components {
  .input-base {
    @apply w-full px-4 py-3 rounded-xl border border-hub-border bg-hub-bg/50
           text-hub-primary placeholder:text-hub-muted
           focus:outline-none focus:ring-2 focus:ring-hub-accent/20 focus:border-hub-accent
           transition-all duration-200;
  }

  .label-base {
    @apply block text-xs font-medium text-hub-secondary uppercase tracking-wider mb-2;
  }

  .btn-primary {
    @apply py-3 px-6 bg-hub-accent hover:bg-hub-accent-hover text-white rounded-xl
           font-medium transition-all duration-200
           disabled:opacity-50 disabled:cursor-not-allowed
           shadow-sm hover:shadow-md active:scale-[0.98];
  }

  .btn-secondary {
    @apply py-3 px-6 border border-hub-border text-hub-secondary
           hover:text-hub-primary hover:border-hub-accent/50 rounded-xl
           font-medium transition-all duration-200 active:scale-[0.98];
  }

  .card {
    @apply bg-white rounded-2xl border border-hub-border/50 shadow-hub;
  }
}
`
);
console.log("  ✅ src/app/globals.css");

// ── src/app/layout.tsx ───────────────────────────────────
writeFile(
  "src/app/layout.tsx",
  `import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "2B Hub \u2014 Operational Hub",
  description: "Hardware company operational management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
`
);
console.log("  ✅ src/app/layout.tsx");

// ── src/app/page.tsx ─────────────────────────────────────
writeFile(
  "src/app/page.tsx",
  `import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard");
}
`
);
console.log("  ✅ src/app/page.tsx");

// ── src/app/login/page.tsx ───────────────────────────────
writeFile(
  "src/app/login/page.tsx",
  `"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [seeding, setSeeding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkSystem();
  }, []);

  async function checkSystem() {
    try {
      const res = await fetch("/api/auth/seed");
      const data = await res.json();
      setInitialized(data.initialized);
    } catch {
      setInitialized(null);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    setError("");
    try {
      const res = await fetch("/api/auth/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setInitialized(true);
      } else {
        setError(data.error || "Initialization failed");
      }
    } catch {
      setError("Failed to connect to server");
    }
    setSeeding(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter both fields");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid credentials");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-hub-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] bg-hub-accent/[0.04] rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[15%] w-[400px] h-[400px] bg-hub-accent/[0.03] rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[420px]"
      >
        <div className="card p-8 sm:p-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-hub-accent/10 mb-5">
              <span className="text-2xl font-bold text-hub-accent tracking-tight">2B</span>
            </div>
            <h1 className="text-2xl font-semibold text-hub-primary tracking-tight">Hub</h1>
            <p className="text-sm text-hub-secondary mt-1.5">Operational Management</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="username" className="label-base">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-base"
                placeholder="Enter your username"
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="label-base">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 text-sm text-hub-error"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <AnimatePresence>
            {initialized === false && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-8 pt-6 border-t border-hub-border">
                  <button
                    onClick={handleSeed}
                    disabled={seeding}
                    className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                  >
                    {seeding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {seeding ? "Initializing..." : "Initialize System"}
                  </button>
                  <p className="text-[11px] text-hub-muted text-center mt-2.5">
                    First time setup \u2014 loads users from configuration
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-[11px] text-hub-muted mt-6">2B Hub v0.1</p>
      </motion.div>
    </div>
  );
}
`
);
console.log("  ✅ src/app/login/page.tsx");

// ── API: seed ────────────────────────────────────────────
writeFile(
  "src/app/api/auth/seed/route.ts",
  `import { NextResponse } from "next/server";
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
    const lines = content.split("\\n").map((l) => l.trim()).filter(Boolean);

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
`
);
console.log("  ✅ src/app/api/auth/seed/route.ts");

// ── API: login ───────────────────────────────────────────
writeFile(
  "src/app/api/auth/login/route.ts",
  `import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";
import { createToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, username, password_hash, role, is_active")
      .eq("username", username.toLowerCase().trim())
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ error: "Account is deactivated" }, { status: 403 });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    const response = NextResponse.json({
      user: { id: user.id, username: user.username, role: user.role },
    });

    response.cookies.set(setAuthCookie(token));
    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
`
);
console.log("  ✅ src/app/api/auth/login/route.ts");

// ── API: logout ──────────────────────────────────────────
writeFile(
  "src/app/api/auth/logout/route.ts",
  `import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
`
);
console.log("  ✅ src/app/api/auth/logout/route.ts");

// ── API: me ──────────────────────────────────────────────
writeFile(
  "src/app/api/auth/me/route.ts",
  `import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
`
);
console.log("  ✅ src/app/api/auth/me/route.ts");

// ── LogoutButton ─────────────────────────────────────────
writeFile(
  "src/components/LogoutButton.tsx",
  `"use client";

import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="p-2 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-all duration-200"
      title="Sign out"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <LogOut className="w-5 h-5" />
      )}
    </button>
  );
}
`
);
console.log("  ✅ src/components/LogoutButton.tsx");

// ── Dashboard Layout ─────────────────────────────────────
writeFile(
  "src/app/dashboard/layout.tsx",
  `import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-hub-bg flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-hub-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="w-10" />
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-hub-accent/10 flex items-center justify-center">
              <span className="text-sm font-bold text-hub-accent">2B</span>
            </div>
            <span className="text-lg font-semibold text-hub-primary tracking-tight">Hub</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      <footer className="border-t border-hub-border/50 bg-white/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-[11px] text-hub-muted text-center tracking-wide">
            2B Hub \u2022 Operational Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
`
);
console.log("  ✅ src/app/dashboard/layout.tsx");

// ── Dashboard Page ───────────────────────────────────────
writeFile(
  "src/app/dashboard/page.tsx",
  `import { getAuthUser } from "@/lib/auth";
import {
  Package,
  ShoppingCart,
  Building2,
  BarChart3,
  Users,
  Truck,
} from "lucide-react";

const MODULES = [
  {
    title: "Product Creation",
    description: "Add and manage your product catalog",
    icon: Package,
  },
  {
    title: "Retail Sales",
    description: "Process walk-in customer transactions",
    icon: ShoppingCart,
  },
  {
    title: "B2B Sales",
    description: "Manage business-to-business orders",
    icon: Building2,
  },
  {
    title: "Reports",
    description: "Analytics, revenue & performance",
    icon: BarChart3,
  },
  {
    title: "Firms",
    description: "B2B customer accounts & records",
    icon: Users,
  },
  {
    title: "Suppliers",
    description: "Supply chain & price tracking",
    icon: Truck,
  },
];

export default async function DashboardPage() {
  const user = await getAuthUser();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-light text-hub-primary leading-tight">
          Welcome back,{" "}
          <span className="font-semibold">{user?.username ?? "User"}</span>
        </h1>
        <p className="text-hub-secondary mt-2 text-[15px]">
          Your operational hub is ready. Modules will be activated as we build.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.title}
              className="card p-6 hover:shadow-hub-md transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-hub-accent/10 flex items-center justify-center group-hover:bg-hub-accent/[0.15] transition-colors duration-300">
                  <Icon className="w-6 h-6 text-hub-accent" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-hub-muted bg-hub-bg px-2.5 py-1 rounded-full">
                  Soon
                </span>
              </div>
              <h3 className="text-[15px] font-semibold text-hub-primary">
                {mod.title}
              </h3>
              <p className="text-sm text-hub-secondary mt-1 leading-relaxed">
                {mod.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
`
);
console.log("  ✅ src/app/dashboard/page.tsx");

// ── Done ─────────────────────────────────────────────────
console.log("\n============================================");
console.log("  2B Hub — Checkpoint 1 files created!");
console.log("============================================\n");
console.log("  Next steps:");
console.log("  1. Edit .env.local with your Supabase URL and service role key");
console.log("  2. Run the SQL from supabase/migrations/001_users_and_settings.sql");
console.log("     in your Supabase SQL Editor");
console.log("  3. npm run dev");
console.log("  4. Open http://localhost:3000");
console.log("  5. Click 'Initialize System' then login with berkay / berkay\n");