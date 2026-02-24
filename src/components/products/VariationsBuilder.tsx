"use client";

import { useState } from "react";
import {
  Plus,
  X,
  Layers,
  Sparkles,
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  DollarSign,
} from "lucide-react";

export interface VariationGroupInput {
  name: string;
  values: string[];
}

export interface VariationInput {
  variation_label: string;
  has_custom_price: boolean;
  list_price: string;
  discount_percent: string;
  list_price2: string;
  discount_percent2: string;
  sku: string;
}

interface VariationsBuilderProps {
  groups: VariationGroupInput[];
  variations: VariationInput[];
  onGroupsChange: (groups: VariationGroupInput[]) => void;
  onVariationsChange: (variations: VariationInput[]) => void;
  currencySymbol: string;
  hasPrice2: boolean;
  price2Label: string;
}

export default function VariationsBuilder({
  groups,
  variations,
  onGroupsChange,
  onVariationsChange,
  currencySymbol,
  hasPrice2,
  price2Label,
}: VariationsBuilderProps) {
  const [expanded, setExpanded] = useState(true);
  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>(
    {}
  );
  const [manualLabel, setManualLabel] = useState("");

  // ── Group Management ───────────────────────────────────
  function addGroup() {
    onGroupsChange([...groups, { name: "", values: [] }]);
  }

  function updateGroupName(index: number, name: string) {
    const updated = [...groups];
    updated[index] = { ...updated[index], name };
    onGroupsChange(updated);
  }

  function removeGroup(index: number) {
    const updated = groups.filter((_, i) => i !== index);
    onGroupsChange(updated);
  }

  function addValueToGroup(groupIndex: number) {
    const val = (newValueInputs[groupIndex] || "").trim();
    if (!val) return;

    // Prevent duplicates
    if (groups[groupIndex].values.includes(val)) return;

    const updated = [...groups];
    updated[groupIndex] = {
      ...updated[groupIndex],
      values: [...updated[groupIndex].values, val],
    };
    onGroupsChange(updated);
    setNewValueInputs((prev) => ({ ...prev, [groupIndex]: "" }));
  }

  function removeValueFromGroup(groupIndex: number, valueIndex: number) {
    const updated = [...groups];
    updated[groupIndex] = {
      ...updated[groupIndex],
      values: updated[groupIndex].values.filter((_, i) => i !== valueIndex),
    };
    onGroupsChange(updated);
  }

  function handleValueKeyDown(
    e: React.KeyboardEvent,
    groupIndex: number
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      addValueToGroup(groupIndex);
    }
  }

  // ── Generate Combinations ──────────────────────────────
  function generateCombinations() {
    const validGroups = groups.filter(
      (g) => g.name.trim() && g.values.length > 0
    );

    if (validGroups.length === 0) return;

    // Cartesian product of all group values
    const combine = (arrays: string[][]): string[][] => {
      if (arrays.length === 0) return [[]];
      const [first, ...rest] = arrays;
      const restCombos = combine(rest);
      return first.flatMap((val) => restCombos.map((combo) => [val, ...combo]));
    };

    const valueArrays = validGroups.map((g) => g.values);
    const combos = combine(valueArrays);

    // Build labels: if 1 group → just value, if multiple → "val1 x val2"
    const newVariations: VariationInput[] = combos.map((combo) => ({
      variation_label:
        combo.length === 1 ? combo[0] : combo.join(" × "),
      has_custom_price: false,
      list_price: "",
      discount_percent: "",
      list_price2: "",
      discount_percent2: "",
      sku: "",
    }));

    onVariationsChange(newVariations);
  }

  // ── Manual Variation ───────────────────────────────────
  function addManualVariation() {
    if (!manualLabel.trim()) return;
    if (variations.some((v) => v.variation_label === manualLabel.trim())) return;

    onVariationsChange([
      ...variations,
      {
        variation_label: manualLabel.trim(),
        has_custom_price: false,
        list_price: "",
        discount_percent: "",
        list_price2: "",
        discount_percent2: "",
        sku: "",
      },
    ]);
    setManualLabel("");
  }

  function removeVariation(index: number) {
    onVariationsChange(variations.filter((_, i) => i !== index));
  }

  function updateVariation(index: number, field: keyof VariationInput, value: string | boolean) {
    const updated = [...variations];
    updated[index] = { ...updated[index], [field]: value };
    onVariationsChange(updated);
  }

  function clearAllVariations() {
    if (variations.length > 0 && !confirm("Remove all variations?")) return;
    onVariationsChange([]);
  }

  // ── Counts ─────────────────────────────────────────────
  const validGroups = groups.filter(
    (g) => g.name.trim() && g.values.length > 0
  );
  const possibleCombos = validGroups.reduce(
    (acc, g) => acc * g.values.length,
    validGroups.length > 0 ? 1 : 0
  );

  return (
    <div className="card p-6 space-y-5">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-hub-accent" />
          <h2 className="text-sm font-semibold text-hub-primary uppercase tracking-wider">
            Variations
          </h2>
          {variations.length > 0 && (
            <span className="text-[10px] font-semibold text-hub-accent bg-hub-accent/10 px-2 py-0.5 rounded-full">
              {variations.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-hub-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-hub-secondary" />
        )}
      </button>

      {expanded && (
        <div className="space-y-6">
          {/* ── Variation Groups ──────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-hub-secondary">
                Define variation axes (e.g., Diameter, Length, Number)
              </p>
              <button
                type="button"
                onClick={addGroup}
                className="flex items-center gap-1 text-xs font-medium text-hub-accent hover:text-hub-accent-hover transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Group
              </button>
            </div>

            {groups.map((group, gi) => (
              <div
                key={gi}
                className="border border-hub-border/50 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="w-3.5 h-3.5 text-hub-muted" />
                  <input
                    type="text"
                    value={group.name}
                    onChange={(e) => updateGroupName(gi, e.target.value)}
                    className="flex-1 text-sm font-medium text-hub-primary bg-transparent border-none outline-none placeholder:text-hub-muted"
                    placeholder="Group name (e.g., Diameter)"
                  />
                  <button
                    type="button"
                    onClick={() => removeGroup(gi)}
                    className="p-1 text-hub-secondary hover:text-hub-error rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Values */}
                <div className="flex flex-wrap gap-1.5">
                  {group.values.map((val, vi) => (
                    <span
                      key={vi}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-hub-bg rounded-lg text-xs font-medium text-hub-primary"
                    >
                      {val}
                      <button
                        type="button"
                        onClick={() => removeValueFromGroup(gi, vi)}
                        className="text-hub-muted hover:text-hub-error transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add value input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newValueInputs[gi] || ""}
                    onChange={(e) =>
                      setNewValueInputs((prev) => ({
                        ...prev,
                        [gi]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => handleValueKeyDown(e, gi)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-hub-border/50 bg-hub-bg/30 text-sm text-hub-primary placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent/20"
                    placeholder="Type value, press Enter"
                  />
                  <button
                    type="button"
                    onClick={() => addValueToGroup(gi)}
                    className="px-3 py-1.5 text-xs font-medium text-hub-accent hover:bg-hub-accent/10 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}

            {/* Generate Button */}
            {validGroups.length > 0 && (
              <button
                type="button"
                onClick={generateCombinations}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-hub-accent/30 text-sm font-medium text-hub-accent hover:bg-hub-accent/5 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Generate {possibleCombos} Combination
                {possibleCombos !== 1 ? "s" : ""}
              </button>
            )}
          </div>

          {/* ── Divider ──────────────────────────────── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-hub-border/30" />
            <span className="text-[10px] uppercase tracking-wider text-hub-muted font-medium">
              or add manually
            </span>
            <div className="flex-1 border-t border-hub-border/30" />
          </div>

          {/* ── Manual Add ───────────────────────────── */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={manualLabel}
              onChange={(e) => setManualLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addManualVariation();
                }
              }}
              className="input-base flex-1"
              placeholder="e.g. 12x160, M10, No.3..."
            />
            <button
              type="button"
              onClick={addManualVariation}
              className="btn-primary py-3"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* ── Variations List ───────────────────────── */}
          {variations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-hub-secondary">
                  {variations.length} variation
                  {variations.length !== 1 ? "s" : ""}
                </p>
                <button
                  type="button"
                  onClick={clearAllVariations}
                  className="flex items-center gap-1 text-[11px] text-hub-error/70 hover:text-hub-error transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear all
                </button>
              </div>

              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                {variations.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-hub-bg/50 border border-hub-border/30 group"
                  >
                    {/* Label */}
                    <span className="text-sm font-medium text-hub-primary flex-1 min-w-0 truncate">
                      {v.variation_label}
                    </span>

                    {/* SKU */}
                    <input
                      type="text"
                      value={v.sku}
                      onChange={(e) =>
                        updateVariation(i, "sku", e.target.value)
                      }
                      className="w-20 px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-[11px] text-hub-secondary placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent/20"
                      placeholder="SKU"
                    />

                    {/* Custom Price Toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        updateVariation(
                          i,
                          "has_custom_price",
                          !v.has_custom_price
                        )
                      }
                      className={`p-1.5 rounded-lg transition-colors ${
                        v.has_custom_price
                          ? "bg-hub-accent/10 text-hub-accent"
                          : "text-hub-muted hover:text-hub-secondary"
                      }`}
                      title="Custom price"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                    </button>

                    {/* Custom Price Fields */}
                    {v.has_custom_price && (
  <>
    <div className="flex items-center gap-1">
      <input
        type="number"
        step="0.01"
        min="0"
        value={v.list_price}
        onChange={(e) =>
          updateVariation(i, "list_price", e.target.value)
        }
        className="w-20 px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-[11px] text-hub-primary placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent/20"
        placeholder={`${currencySymbol} P1`}
      />
      <input
        type="number"
        step="0.01"
        min="0"
        max="100"
        value={v.discount_percent}
        onChange={(e) =>
          updateVariation(i, "discount_percent", e.target.value)
        }
        className="w-16 px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-[11px] text-hub-primary placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent/20"
        placeholder="D1%"
      />
    </div>
    {hasPrice2 && (
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.01"
          min="0"
          value={v.list_price2}
          onChange={(e) =>
            updateVariation(i, "list_price2", e.target.value)
          }
          className="w-20 px-2 py-1 rounded-lg border border-hub-accent/20 bg-hub-accent/5 text-[11px] text-hub-primary placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent/20"
          placeholder={`${currencySymbol} P2`}
        />
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={v.discount_percent2}
          onChange={(e) =>
            updateVariation(i, "discount_percent2", e.target.value)
          }
          className="w-16 px-2 py-1 rounded-lg border border-hub-accent/20 bg-hub-accent/5 text-[11px] text-hub-primary placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent/20"
          placeholder="D2%"
        />
      </div>
    )}
  </>
)}

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeVariation(i)}
                      className="p-1 text-hub-muted hover:text-hub-error rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}