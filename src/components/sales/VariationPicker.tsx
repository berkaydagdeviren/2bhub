"use client";

import { useMemo, useEffect, useState } from "react";
import { Layers } from "lucide-react";
import type { Product, ProductVariation, VariationGroup } from "@/types";

interface VariationPickerProps {
  product: Product;
  selected: ProductVariation | null;
  onChange: (variation: ProductVariation | null) => void;
}

/**
 * Cascade variation picker.
 * - Multi-group products (e.g. Çap × Boy): shows grouped selectors in sequence.
 *   Subsequent groups are filtered to only show values that exist in combination
 *   with the already-selected earlier groups.
 * - Single-group or no-group products: flat button wrap.
 *
 * State is fully controlled by the parent via `selected` + `onChange`.
 * Internal `pendingGroupValues` tracks partial cascade selections (e.g. Group 1
 * picked, Group 2 not yet chosen).
 */
export default function VariationPicker({
  product,
  selected,
  onChange,
}: VariationPickerProps) {
  const activeVariations = useMemo(
    () => (product.variations || []).filter((v) => v.is_active),
    [product.variations]
  );

  const sortedGroups: VariationGroup[] = useMemo(
    () =>
      [...(product.variation_groups || [])].sort(
        (a, b) => a.sort_order - b.sort_order
      ),
    [product.variation_groups]
  );

  const hasGroups = sortedGroups.length > 1;

  // ── Internal pending state for cascade partial selections ──────────────────
  // Synced from `selected` when it changes (parent-driven update).
  const [pendingValues, setPendingValues] = useState<Record<string, string>>(
    () => {
      if (selected && sortedGroups.length > 0) {
        const parts = selected.variation_label.split(" × ");
        return Object.fromEntries(
          sortedGroups.map((g, i) => [g.name, parts[i] ?? ""])
        );
      }
      return {};
    }
  );

  // Sync pendingValues whenever the parent changes `selected`
  useEffect(() => {
    if (selected && sortedGroups.length > 0) {
      const parts = selected.variation_label.split(" × ");
      setPendingValues(
        Object.fromEntries(
          sortedGroups.map((g, i) => [g.name, parts[i] ?? ""])
        )
      );
    } else if (!selected) {
      setPendingValues({});
    }
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cascade helpers ────────────────────────────────────────────────────────

  /** Available values for groupIndex given the prior group selections. */
  function getAvailableValues(groupIndex: number): string[] {
    const validSet = new Set(
      activeVariations
        .filter((v) => {
          const parts = v.variation_label.split(" × ");
          for (let i = 0; i < groupIndex; i++) {
            const sel = pendingValues[sortedGroups[i]?.name];
            if (sel && parts[i] !== sel) return false;
          }
          return true;
        })
        .map((v) => v.variation_label.split(" × ")[groupIndex])
        .filter(Boolean)
    );
    // Return in the order defined in variation_groups.values
    return (sortedGroups[groupIndex]?.values ?? []).filter((val) =>
      validSet.has(val)
    );
  }

  function handleGroupSelect(groupIndex: number, value: string) {
    const groupName = sortedGroups[groupIndex].name;

    // Update this group; clear all subsequent selections
    const next: Record<string, string> = {};
    for (let i = 0; i < groupIndex; i++) {
      const gn = sortedGroups[i].name;
      if (pendingValues[gn]) next[gn] = pendingValues[gn];
    }
    next[groupName] = value;
    setPendingValues(next);

    // If all groups filled, find and emit the matching variation
    if (sortedGroups.length === groupIndex + 1) {
      const label = sortedGroups.map((g, i) => (i === groupIndex ? value : next[g.name])).join(" × ");
      const found = activeVariations.find((v) => v.variation_label === label) ?? null;
      onChange(found);
    } else {
      // Partial — no complete variation selected yet
      onChange(null);
    }
  }

  // ── Flat picker (no groups, or single group) ───────────────────────────────
  if (!hasGroups) {
    return (
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <Layers className="w-3.5 h-3.5 text-hub-accent" />
          <span className="label-base mb-0">Variation *</span>
        </div>
        <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto">
          {activeVariations
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((v) => {
              const isSelected = selected?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onChange(isSelected ? null : v)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    isSelected
                      ? "border-hub-accent bg-hub-accent/10 text-hub-accent"
                      : "border-hub-border/50 text-hub-secondary hover:border-hub-accent/30"
                  }`}
                >
                  {v.variation_label}
                  {v.sku && (
                    <span className="text-[9px] text-hub-muted block leading-none mt-0.5">
                      {v.sku}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>
    );
  }

  // ── Cascade picker (multiple groups) ──────────────────────────────────────
  return (
    <div className="space-y-4">
      {sortedGroups.map((group, groupIndex) => {
        const available = getAvailableValues(groupIndex);
        const selectedVal = pendingValues[group.name] ?? "";
        const isUnlocked = groupIndex === 0 || !!pendingValues[sortedGroups[groupIndex - 1].name];

        return (
          <div key={group.id}>
            {/* Group header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="flex-1 border-t border-hub-border/40" />
              <span
                className={`text-[10px] font-semibold uppercase tracking-widest px-1 ${
                  isUnlocked ? "text-hub-accent" : "text-hub-muted"
                }`}
              >
                {group.name}
              </span>
              <span className="flex-1 border-t border-hub-border/40" />
            </div>

            {/* Values */}
            <div className={`flex flex-wrap gap-2 ${!isUnlocked ? "opacity-40 pointer-events-none" : ""}`}>
              {available.length === 0 ? (
                <p className="text-xs text-hub-muted italic">
                  {isUnlocked ? "No options available" : "Select above first"}
                </p>
              ) : (
                available.map((val) => {
                  const isSelected = selectedVal === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleGroupSelect(groupIndex, val)}
                      className={`min-h-[44px] min-w-[52px] px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                        isSelected
                          ? "border-hub-accent bg-hub-accent/10 text-hub-accent"
                          : "border-hub-border/50 text-hub-secondary hover:border-hub-accent/30"
                      }`}
                    >
                      {val}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
