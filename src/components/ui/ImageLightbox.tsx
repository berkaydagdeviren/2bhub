"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  caption?: string | null;
  className?: string;
}

export default function ImageLightbox({
  src,
  alt,
  caption,
  className,
}: ImageLightboxProps) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(true);
    setZoomed(false);
  }

  function handleClose() {
    setOpen(false);
    setZoomed(false);
  }

  function toggleZoom(e: React.MouseEvent) {
    e.stopPropagation();
    setZoomed((z) => !z);
  }

  return (
    <>
      {/* Thumbnail */}
      <div
        onClick={handleOpen}
        className={`relative cursor-pointer group ${className || ""}`}
      >
        <img src={src} alt={alt} className="w-full object-contain" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2 shadow-hub">
            <ZoomIn className="w-4 h-4 text-hub-primary" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 sm:hidden">
          <span className="text-[9px] font-medium bg-black/50 text-white px-2 py-0.5 rounded-full">
            Tap to zoom
          </span>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95"
          >
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
              <button
                onClick={toggleZoom}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white text-xs font-medium flex items-center gap-1.5"
              >
                <ZoomIn className="w-12 h-12" />
                {zoomed ? "Resmi ekrana sigdir" : "Resmi yakinlastir"}
              </button>
              <button
                onClick={handleClose}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Scrollable image area */}
            <div
              className="absolute inset-0 overflow-auto pt-16 pb-16"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {zoomed ? (
                /* Full size — scrollable both ways */
                <div className="min-w-fit min-h-fit p-4">
                  <img
                    src={src}
                    alt={alt}
                    draggable={false}
                    style={{ maxWidth: "none", width: "auto", height: "auto" }}
                  />
                </div>
              ) : (
                /* Fit to screen */
                <div className="w-full h-full flex items-center justify-center p-4">
                  <img
                    src={src}
                    alt={alt}
                    draggable={false}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* Caption */}
            {caption && (
              <div className="absolute bottom-0 left-0 right-0 p-4 text-center z-10">
                <p className="text-sm text-white/70">{caption}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}