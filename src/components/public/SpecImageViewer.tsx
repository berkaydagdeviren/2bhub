"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface SpecImage {
  id: string;
  image_url: string;
  caption: string | null;
}

export default function SpecImageViewer({ images }: { images: SpecImage[] }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  if (images.length === 0) return null;

  function openAt(i: number) {
    setIndex(i);
    setOpen(true);
  }

  function goPrev() {
    setIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  }

  function goNext() {
    setIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length !== 1) return; // ignore pinch
    setTouchStart(e.touches[0].clientX);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length > 1) {
      // second finger joined — cancel swipe tracking
      setTouchStart(null);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return;
    if (e.changedTouches.length !== 1) return; // ignore multi-finger lift
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) goNext();
      else goPrev();
    }
    setTouchStart(null);
  }

  const current = images[index];

  return (
    <>
      {/* Thumbnail grid */}
      <div className="grid grid-cols-2 gap-3">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => openAt(i)}
            className="rounded-xl overflow-hidden border border-[#E5E0D8] bg-white active:scale-95 transition-transform"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.image_url}
              alt={img.caption || "Teknik görsel"}
              className="w-full object-contain"
            />
            {img.caption && (
              <p className="text-[10px] text-[#7A7468] px-2 py-1.5 text-center">
                {img.caption}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Fullscreen lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 pt-safe-top py-3 flex-shrink-0">
            <span className="text-white/60 text-sm font-medium">
              {index + 1} / {images.length}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center px-2 min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.image_url}
              alt={current.caption || "Teknik görsel"}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
            />
          </div>

          {/* Bottom: caption + nav */}
          <div className="flex-shrink-0 pb-safe-bottom pb-6">
            {current.caption && (
              <p className="text-center text-white/80 text-sm px-6 mb-4">
                {current.caption}
              </p>
            )}

            {/* Dot indicators */}
            {images.length > 1 && (
              <div className="flex justify-center gap-1.5 mb-4">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    className={`rounded-full transition-all ${
                      i === index
                        ? "w-5 h-2 bg-white"
                        : "w-2 h-2 bg-white/30"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Prev / Next */}
            {images.length > 1 && (
              <div className="flex justify-center gap-4">
                <button
                  onClick={goPrev}
                  className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20"
                >
                  <ChevronLeft className="w-7 h-7 text-white" />
                </button>
                <button
                  onClick={goNext}
                  className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20"
                >
                  <ChevronRight className="w-7 h-7 text-white" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
