"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  CheckCircle2,
  Globe,
  User,
  Trash2,
} from "lucide-react";
import { getReminderColor, formatDateTime, formatDate } from "@/lib/utils";
import type { Note } from "@/types";

interface NoteDetailModalProps {
  note: Note | null;
  currentUserId: string;
  currentUserRole: string;
  onClose: () => void;
  onUpdated: () => void;
}

export default function NoteDetailModal({
  note,
  currentUserId,
  currentUserRole,
  onClose,
  onUpdated,
}: NoteDetailModalProps) {
  const [resolving, setResolving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!note) return null;

  const reminder = getReminderColor(note.reminder_date);
  const isOwner = note.created_by === currentUserId;
  const isAdmin = currentUserRole === "admin";
  const canDelete = isOwner || isAdmin;
  const isGlobal = note.visibility === "global";

  async function handleResolve() {
    setResolving(true);
    try {
      await fetch(`/api/notes/${note!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: note!.is_resolved ? "unresolve" : "resolve",
        }),
      });
      onUpdated();
      onClose();
    } catch (err) {
      console.error("Resolve error:", err);
    }
    setResolving(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this note permanently?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/notes/${note!.id}`, { method: "DELETE" });
      onUpdated();
      onClose();
    } catch (err) {
      console.error("Delete error:", err);
    }
    setDeleting(false);
  }

  return (
    <AnimatePresence>
      {note && (
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
            className="fixed inset-x-4 bottom-24 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg bg-white rounded-2xl shadow-hub-lg z-[90] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-hub-border/50">
              <div className="flex items-center gap-2">
                {isGlobal ? (
                  <Globe className="w-4 h-4 text-hub-accent" />
                ) : (
                  <User className="w-4 h-4 text-hub-secondary" />
                )}
                <span className="text-sm font-medium text-hub-primary">
                  {note.created_by_username}
                </span>
                {note.is_resolved && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-hub-success bg-hub-success/10 px-2 py-0.5 rounded-full">
                    Resolved
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Reminder badge */}
              {note.reminder_date && (
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-4 ${reminder.bg} ${reminder.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${reminder.dot}`} />
                  {formatDate(note.reminder_date)} — {reminder.label}
                </div>
              )}

              {/* Message */}
              <p className="text-[15px] text-hub-primary leading-relaxed whitespace-pre-wrap">
                {note.body}
              </p>

              {/* Meta */}
              <p className="text-[11px] text-hub-muted mt-4">
                Created {formatDateTime(note.created_at)}
              </p>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-hub-border/50 flex items-center gap-3">
              {/* Resolve button — for global notes */}
              {isGlobal && (
                <button
                  onClick={handleResolve}
                  disabled={resolving}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    note.is_resolved
                      ? "border border-hub-border text-hub-secondary hover:text-hub-primary"
                      : "bg-hub-success text-white hover:bg-hub-success/90"
                  }`}
                >
                  {resolving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {note.is_resolved ? "Unresolve" : "Mark Resolved"}
                </button>
              )}

              {/* Delete — owner or admin only */}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-hub-error/20 text-hub-error hover:bg-hub-error/5 text-sm font-medium transition-all duration-200"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}