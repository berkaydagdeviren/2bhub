"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Globe,
  User,
} from "lucide-react";
import { getReminderColor, formatDate } from "@/lib/utils";
import CreateNoteModal from "./CreateNoteModal";
import NoteDetailModal from "./NoteDetailModal";
import type { Note } from "@/types";

interface FooterProps {
  userId: string;
  username: string;
  userRole: string;
}

export default function Footer({ userId, username, userRole }: FooterProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [filter, setFilter] = useState<"all" | "mine" | "global">("all");

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/notes", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.notes) {
        setNotes(data.notes);
      }
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
    // Poll every 30s for new messages from other users
    const interval = setInterval(fetchNotes, 30000);
    return () => clearInterval(interval);
  }, [fetchNotes]);

  // Filter logic
  const filteredNotes = notes.filter((n) => {
    if (filter === "mine") return n.created_by === userId;
    if (filter === "global") return n.visibility === "global";
    return true;
  });

  // Unresolved global notes count for badge
  const unresolvedGlobal = notes.filter(
    (n) => n.visibility === "global" && !n.is_resolved
  ).length;

  // Notes to show in collapsed bar (latest unresolved, max 3)
  const previewNotes = notes
    .filter((n) => !n.is_resolved)
    .slice(0, 3);

  return (
    <>
      <footer className="sticky bottom-0 z-40 border-t border-hub-border/50 bg-white/95 backdrop-blur-md">
        {/* Expanded Panel */}
        {expanded && (
          <div className="max-w-7xl mx-auto border-b border-hub-border/30">
            {/* Filter tabs */}
            <div className="px-4 sm:px-6 pt-4 pb-2 flex items-center gap-1">
              {(["all", "mine", "global"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    filter === f
                      ? "bg-hub-accent/10 text-hub-accent"
                      : "text-hub-secondary hover:text-hub-primary hover:bg-hub-bg"
                  }`}
                >
                  {f === "all" ? "All" : f === "mine" ? "My Notes" : "Global"}
                </button>
              ))}

              <div className="flex-1" />

              <span className="text-[11px] text-hub-muted">
                {filteredNotes.length} note{filteredNotes.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Notes list */}
            <div className="px-4 sm:px-6 pb-4 max-h-[280px] overflow-y-auto space-y-2">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-hub-muted/50 mx-auto mb-2" />
                  <p className="text-sm text-hub-muted">No notes yet</p>
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const reminder = getReminderColor(note.reminder_date);
                  return (
                    <button
                      key={note.id}
                      onClick={() => setSelectedNote(note)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 hover:shadow-hub group ${
                        note.is_resolved
                          ? "border-hub-border/30 opacity-60 hover:opacity-80"
                          : "border-hub-border/50 hover:border-hub-accent/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            note.visibility === "global"
                              ? "bg-hub-accent/10"
                              : "bg-hub-bg"
                          }`}
                        >
                          {note.visibility === "global" ? (
                            <Globe className="w-3.5 h-3.5 text-hub-accent" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-hub-secondary" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-hub-primary">
                              {note.created_by_username}
                            </span>
                            {note.is_resolved && (
                              <span className="text-[9px] font-semibold uppercase tracking-wider text-hub-success bg-hub-success/10 px-1.5 py-0.5 rounded-full">
                                Resolved
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-hub-secondary truncate">
                            {note.body}
                          </p>
                        </div>

                        {/* Reminder / Date */}
                        <div className="flex-shrink-0 text-right">
                          {note.reminder_date && !note.is_resolved ? (
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${reminder.bg} ${reminder.text}`}
                            >
                              <span
                                className={`w-1 h-1 rounded-full ${reminder.dot}`}
                              />
                              {reminder.label}
                            </span>
                          ) : (
                            <span className="text-[10px] text-hub-muted">
                              {formatDate(note.created_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Collapsed Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-12 flex items-center gap-3">
            {/* Toggle expand */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-hub-secondary hover:text-hub-primary transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              {unresolvedGlobal > 0 && (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-hub-accent text-white text-[10px] font-bold rounded-full px-1">
                  {unresolvedGlobal}
                </span>
              )}
              {expanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Preview of recent notes — only when collapsed */}
            {!expanded && (
              <div className="flex-1 flex items-center gap-2 overflow-hidden">
                {previewNotes.length === 0 ? (
                  <span className="text-[11px] text-hub-muted">
                    No active notes
                  </span>
                ) : (
                  previewNotes.map((note) => {
                    const reminder = getReminderColor(note.reminder_date);
                    return (
                      <button
                        key={note.id}
                        onClick={() => setSelectedNote(note)}
                        className="flex items-center gap-1.5 max-w-[200px] px-2.5 py-1 rounded-lg bg-hub-bg/80 hover:bg-hub-bg transition-colors group"
                      >
                        {note.reminder_date && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${reminder.dot}`}
                          />
                        )}
                        {note.visibility === "global" && (
                          <Globe className="w-3 h-3 text-hub-accent flex-shrink-0" />
                        )}
                        <span className="text-[11px] text-hub-secondary group-hover:text-hub-primary truncate">
                          {note.body}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Spacer when expanded */}
            {expanded && <div className="flex-1" />}

            {/* Create note button */}
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-hub-accent/10 text-hub-accent hover:bg-hub-accent/20 text-xs font-medium transition-all duration-200"
            >
              <Plus className="w-3.5 h-3.5" />
              Note
            </button>

            {/* Brand mark */}
            <span className="text-[10px] text-hub-muted hidden sm:block">
              2B Hub
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CreateNoteModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchNotes}
      />

      <NoteDetailModal
        note={selectedNote}
        currentUserId={userId}
        currentUserRole={userRole}
        onClose={() => setSelectedNote(null)}
        onUpdated={fetchNotes}
      />
    </>
  );
}