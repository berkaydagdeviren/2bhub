"use client";

import { useState, useRef, useCallback } from "react";
import {
  Clipboard,
  X,
  Loader2,
  ImageIcon,
  GripVertical,
  Trash2,
} from "lucide-react";
import ImageLightbox from "@/components/ui/ImageLightbox";
interface SpecImage {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
}

interface SpecImageUploaderProps {
  productId?: string;
  images: SpecImage[];
  onImagesChange: (images: SpecImage[]) => void;
  // For new products that don't have an ID yet
  pendingImages: PendingImage[];
  onPendingChange: (images: PendingImage[]) => void;
}

export interface PendingImage {
  id: string;
  dataUrl: string;
  caption: string;
}

export default function SpecImageUploader({
  productId,
  images,
  onImagesChange,
  pendingImages,
  onPendingChange,
}: SpecImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pasteZoneRef = useRef<HTMLDivElement>(null);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = async (ev) => {
            const dataUrl = ev.target?.result as string;
            if (!dataUrl) return;

            if (productId) {
              // Upload immediately for existing products
              await uploadImage(dataUrl);
            } else {
              // Queue for new products
              const newPending: PendingImage = {
                id: crypto.randomUUID(),
                dataUrl,
                caption: "",
              };
              onPendingChange([...pendingImages, newPending]);
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    },
    [productId, pendingImages, onPendingChange]
  );

  async function uploadImage(dataUrl: string, caption?: string) {
    if (!productId) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/products/${productId}/spec-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_data: dataUrl,
          caption: caption || null,
        }),
      });

      const data = await res.json();
      if (data.image) {
        onImagesChange([...images, data.image]);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    }
    setUploading(false);
  }

  async function deleteImage(imageId: string) {
    if (!productId) return;
    setDeletingId(imageId);
    try {
      await fetch(
        `/api/products/${productId}/spec-images?image_id=${imageId}`,
        { method: "DELETE" }
      );
      onImagesChange(images.filter((img) => img.id !== imageId));
    } catch (err) {
      console.error("Delete failed:", err);
    }
    setDeletingId(null);
  }

  function removePending(id: string) {
    onPendingChange(pendingImages.filter((p) => p.id !== id));
  }

  const allImages = [
    ...images.map((img) => ({
      id: img.id,
      src: img.image_url,
      caption: img.caption,
      isPending: false,
    })),
    ...pendingImages.map((p) => ({
      id: p.id,
      src: p.dataUrl,
      caption: p.caption,
      isPending: true,
    })),
  ];

  return (
    <div className="space-y-4">
      {/* Paste Zone */}
      <div
        ref={pasteZoneRef}
        onPaste={handlePaste}
        tabIndex={0}
        className="relative border-2 border-dashed border-hub-border/50 rounded-xl p-6 text-center
                   hover:border-hub-accent/30 focus:border-hub-accent/50 focus:outline-none
                   transition-colors cursor-pointer group"
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-hub-accent" />
            <span className="text-xs text-hub-secondary">Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-hub-bg flex items-center justify-center group-hover:bg-hub-accent/10 transition-colors">
              <Clipboard className="w-5 h-5 text-hub-muted group-hover:text-hub-accent transition-colors" />
            </div>
            <div>
              <p className="text-sm font-medium text-hub-secondary">
                Click here & paste screenshot
              </p>
              <p className="text-[11px] text-hub-muted mt-0.5">
                Ctrl+V spec tables, technical sheets from manufacturer sites
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Image List */}
      {allImages.length > 0 && (
        <div className="space-y-3">
          {allImages.map((img) => (
            <div
              key={img.id}
              className="group relative rounded-xl overflow-hidden border border-hub-border/30 bg-white"
            >
              {/* Image */}
              <div className="relative">
                <ImageLightbox
  src={img.src}
  alt={img.caption || "Spec image"}
  caption={img.caption}
  className="max-h-[400px]"
/>

                {/* Overlay controls */}
                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.isPending && (
                    <span className="text-[10px] font-medium bg-hub-warning/90 text-white px-2 py-1 rounded-lg">
                      Pending upload
                    </span>
                  )}
                  <button
                    onClick={() =>
                      img.isPending
                        ? removePending(img.id)
                        : deleteImage(img.id)
                    }
                    disabled={deletingId === img.id}
                    className="p-1.5 bg-white/90 hover:bg-hub-error/10 text-hub-secondary hover:text-hub-error rounded-lg shadow-sm transition-all"
                  >
                    {deletingId === img.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Caption */}
              {img.caption && (
                <div className="px-3 py-2 border-t border-hub-border/20">
                  <p className="text-[11px] text-hub-secondary">
                    {img.caption}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}