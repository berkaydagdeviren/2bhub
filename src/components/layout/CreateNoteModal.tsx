"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Send, Globe, User, CalendarDays } from "lucide-react";

interface CreateNoteModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateNoteModal({
  open,
  onClose,
  onCreated,
}: CreateNoteModalProps) {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"self" | "global">("self");
  const [reminderDate, setReminderDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setBody("");
    setVisibility("self");
    setReminderDate("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!body.trim()) {
      setError("Please write something");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          visibility,
          reminder_date: reminderDate || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create note");
        setSaving(false);
        return;
      }

      resetForm();
      onCreated();
      onClose();
    } catch {
      setError("Something went wrong");
    }
    setSaving(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[80]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 bottom-24 sm:inset-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg bg-white rounded-2xl shadow-hub-lg z-[90] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-hub-border/50">
              <h3 className="text-base font-semibold text-hub-primary">
                New Note
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Message Body */}
              <div>
                <label className="label-base">Message</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="input-base min-h-[100px] resize-y"
                  placeholder="Write your note..."
                  autoFocus
                />
              </div>

              {/* Visibility Toggle */}
              <div>
                <label className="label-base">Visibility</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibility("self")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all duration-200 ${
                      visibility === "self"
                        ? "border-hub-accent bg-hub-accent/10 text-hub-accent"
                        : "border-hub-border text-hub-secondary hover:border-hub-accent/30"
                    }`}
                  >
                    <User className="w-4 h-4" />
                    To Myself
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility("global")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all duration-200 ${
                      visibility === "global"
                        ? "border-hub-accent bg-hub-accent/10 text-hub-accent"
                        : "border-hub-border text-hub-secondary hover:border-hub-accent/30"
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    Everyone
                  </button>
                </div>
              </div>

              {/* Reminder Date */}
              <div>
                <label className="label-base flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {visibility === "self" ? "Reminder Date" : "Due Date"}
                  <span className="text-hub-muted font-normal normal-case tracking-normal">
                    (optional)
                  </span>
                </label>
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="input-base"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-hub-error">{error}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {saving ? "Sending..." : "Create Note"}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}