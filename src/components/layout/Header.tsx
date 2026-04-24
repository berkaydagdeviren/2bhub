"use client";

import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import SettingsModal from "@/components/SettingsModal";
import QuickEditModal from "@/components/products/QuickEditModal";

interface HeaderProps {
  username: string;
}

export default function Header({ username }: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickEditOpen, setQuickEditOpen] = useState(false);

  // Global Ctrl+E shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.shiftKey && e.key === "E") {
        e.preventDefault();
        setQuickEditOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-hub-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left — logout */}
          <LogoutButton />

          {/* Center — logo */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-hub-accent/10 flex items-center justify-center">
              <span className="text-sm font-bold text-hub-accent">2B</span>
            </div>
            <span className="text-lg font-semibold text-hub-primary tracking-tight">
              Hub
            </span>
          </div>

          {/* Right — quick edit + settings */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setQuickEditOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-all duration-200 text-xs"
              title="Hızlı ürün düzenle (Shift+E)"
            >
              <span>Hızlı Düzenle</span>
              <kbd className="text-[10px] bg-hub-bg border border-hub-border/50 px-1 py-0.5 rounded">
                Shift+E
              </kbd>
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-all duration-200"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <QuickEditModal
        open={quickEditOpen}
        onClose={() => setQuickEditOpen(false)}
      />
    </>
  );
}