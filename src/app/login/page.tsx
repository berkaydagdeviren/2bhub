"use client";

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
                    First time setup — loads users from configuration
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
