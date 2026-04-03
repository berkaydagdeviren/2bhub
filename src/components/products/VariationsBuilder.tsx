"use client";

import { useState, useMemo } from "react";
import {
  Plus, X, Layers, Sparkles, GripVertical, Trash2,
  ChevronDown, ChevronUp, DollarSign, ClipboardPaste,
  Check, Table2, LayoutList, ArrowRight, Filter,
} from "lucide-react";

export interface VariationGroupInput { name: string; values: string[] }
export interface VariationInput {
  variation_label: string; has_custom_price: boolean;
  list_price: string; discount_percent: string;
  list_price2: string; discount_percent2: string; sku: string;
}
interface VariationsBuilderProps {
  groups: VariationGroupInput[]; variations: VariationInput[];
  onGroupsChange: (g: VariationGroupInput[]) => void;
  onVariationsChange: (v: VariationInput[]) => void;
  currencySymbol: string; hasPrice2: boolean; price2Label: string;
}

type ColRole = "ignore" | "label" | "label2" | "price1" | "price2";
type PasteMode = "row" | "cross";
type PasteStep = "input" | "map" | "preview";
type DataFormat = "tab" | "space";
interface PreviewRow { label: string; price1: string; price2: string }

const COL_ROLE_OPTIONS: { value: ColRole; label: string }[] = [
  { value: "ignore", label: "Ignore" }, { value: "label", label: "Label" },
  { value: "label2", label: "+Label" }, { value: "price1", label: "Price 1" },
  { value: "price2", label: "Price 2" },
];

// ── Helpers ────────────────────────────────────────────

function naturalSort(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/** Normalize Turkish price string: "1.025,31" → "1025.31", "0,24" → "0.24" */
function parseTurkishPrice(s: string): string {
  const t = s.trim();
  if (!t) return "";
  if (t.includes(",")) return t.replace(/\./g, "").replace(",", ".");
  return t.replace(/[^\d.]/g, "");
}

/** Parse tab-separated text into grid */
function parseTabGrid(text: string): string[][] {
  return text.split("\n").map(r => r.trimEnd()).filter(r => r.trim())
    .map(r => r.split("\t"));
}

/** Detect format: ≥30% of non-empty lines contain a tab → tab-separated */
function detectFormat(text: string): DataFormat {
  const lines = text.split("\n").filter(l => l.trim());
  const tabCount = lines.filter(l => l.includes("\t")).length;
  return tabCount / Math.max(lines.length, 1) > 0.3 ? "tab" : "space";
}

// ── Tab-mode helpers ───────────────────────────────────

function isNumericCol(rows: string[][], ci: number) {
  const vals = rows.map(r => (r[ci] || "").trim().replace(",", ".")).filter(v => v);
  if (!vals.length) return false;
  return vals.filter(v => !isNaN(parseFloat(v))).length / vals.length > 0.6;
}
function hasDecimalValues(rows: string[][], ci: number) {
  const vals = rows.map(r => (r[ci] || "").trim()).filter(v => v);
  if (!vals.length) return false;
  return vals.filter(v => /[.,]\d+/.test(v)).length / vals.length > 0.2;
}
function autoDetectRoles(rows: string[][]): ColRole[] {
  if (!rows.length) return [];
  const numCols = Math.max(...rows.map(r => r.length));
  const roles: ColRole[] = Array(numCols).fill("ignore");
  let labelSet = false;
  for (let i = 0; i < numCols; i++) {
    if (!isNumericCol(rows, i)) { roles[i] = "label"; labelSet = true; break; }
  }
  if (!labelSet) roles[0] = "label";
  const decCols: number[] = [], anyCols: number[] = [];
  for (let i = numCols - 1; i >= 0; i--) {
    if (roles[i] !== "ignore") continue;
    if (isNumericCol(rows, i)) {
      anyCols.push(i);
      if (hasDecimalValues(rows, i)) decCols.push(i);
    }
  }
  const pc = decCols.length > 0 ? decCols : anyCols;
  if (pc.length >= 1) roles[pc[0]] = "price1";
  if (pc.length >= 2) roles[pc[1]] = "price2";
  return roles;
}

function applyRowMapping(
  rawRows: string[][], colRoles: ColRole[],
  opts: { labelSuffix: string; labelSep: string; findFrom: string; findTo: string;
          normDecimals: boolean; skipFirstRow: boolean; filterJunk: boolean }
): PreviewRow[] {
  const rows = opts.skipFirstRow ? rawRows.slice(1) : rawRows;
  const priceColIdxs = colRoles.map((r, i) => (r === "price1" || r === "price2") ? i : -1).filter(i => i >= 0);
  return rows.map(row => {
    let lp1 = "", lp2 = "", p1 = "", p2 = "";
    colRoles.forEach((role, i) => {
      const cell = (row[i] || "").trim();
      if (role === "label") lp1 = cell;
      else if (role === "label2") lp2 = cell;
      else if (role === "price1") p1 = parseTurkishPrice(cell);
      else if (role === "price2") p2 = parseTurkishPrice(cell);
    });
    if (opts.filterJunk && priceColIdxs.length > 0) {
      const ok = priceColIdxs.some(ci => {
        const raw = parseTurkishPrice((row[ci] || "").trim());
        return raw && !isNaN(parseFloat(raw));
      });
      if (!ok) return null;
    }
    let label = lp2 ? `${lp1}${opts.labelSep}${lp2}` : lp1;
    if (opts.normDecimals) label = label.replace(/^(\d+),(\d+)(.*)$/, "$1.$2$3");
    if (opts.findFrom) label = label.split(opts.findFrom).join(opts.findTo);
    label = (label + opts.labelSuffix).trim();
    return label ? { label, price1: p1, price2: p2 } : null;
  }).filter((r): r is PreviewRow => r !== null);
}

function applyTabCrossMapping(
  rawRows: string[][], opts: { sep: string; colFirst: boolean; skipFirstRow: number;
    pairedPrices: boolean; normalizeHeaders: boolean; colOffset: number }
): PreviewRow[] {
  if (rawRows.length <= opts.skipFirstRow) return [];
  const headerRow = rawRows[opts.skipFirstRow - 1] || rawRows[0];
  const dataRows = rawRows.slice(opts.skipFirstRow);
  const norm = (h: string) => opts.normalizeHeaders ? h.trim().replace(/\s+/g, "") : h.trim();
  const results: PreviewRow[] = [];
  if (opts.pairedPrices) {
    for (const row of dataRows) {
      const rowLabel = (row[0] || "").trim(); if (!rowLabel) continue;
      let ci = 1, hi = 1 - opts.colOffset;
      while (hi < headerRow.length) {
        const colLabel = norm(headerRow[hi] || "");
        if (colLabel) {
          const p1 = parseTurkishPrice(row[ci] || "");
          const p2 = parseTurkishPrice(row[ci + 1] || "");
          if (p1 || p2) {
            const label = opts.colFirst ? `${colLabel}${opts.sep}${rowLabel}` : `${rowLabel}${opts.sep}${colLabel}`;
            results.push({ label, price1: p1, price2: p2 });
          }
        }
        ci += 2; hi += 2;
      }
    }
  } else {
    for (const row of dataRows) {
      const rowLabel = (row[0] || "").trim(); if (!rowLabel) continue;
      for (let ci = 1; ci < row.length; ci++) {
        const hi = ci - opts.colOffset;
        const colLabel = norm(headerRow[hi] || ""); if (!colLabel) continue;
        const price = parseTurkishPrice(row[ci] || ""); if (!price) continue;
        const label = opts.colFirst ? `${colLabel}${opts.sep}${rowLabel}` : `${rowLabel}${opts.sep}${colLabel}`;
        results.push({ label, price1: price, price2: "" });
      }
    }
  }
  return results.sort((a, b) => naturalSort(a.label, b.label));
}

// ── Space-separated parsers ────────────────────────────

/**
 * Space-separated row-per-variation parser (PDF extract).
 * Supports two label patterns per line:
 *   • "N x N mm" — SDS bits, taps, reamers, etc.  e.g. "4 x 110 mm", "5,5 x 210 mm", "14x 1000 mm"
 *   • "N.N mm"   — plain decimal diameter           e.g. "0.8 mm", "5,5 mm"
 * Price = last Turkish/US decimal number after the label. Junk lines are skipped.
 */
function parseSpaceRows(
  text: string,
  opts: { labelSuffix: string; findFrom: string; findTo: string }
): PreviewRow[] {
  const results: PreviewRow[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    let label = "";
    let afterLabel = "";

    // Pattern 1: "N x N mm" or "NxN mm"
    const crossMmMatch = line.match(/(\d+(?:[.,]\d+)?)\s*[xX]\s*(\d+(?:[.,]\d+)?)\s*mm/i);
    if (crossMmMatch) {
      const dim = crossMmMatch[1].replace(",", ".");
      const len = crossMmMatch[2].replace(",", ".");
      label = `${dim}x${len}`;
      afterLabel = line.slice(line.indexOf(crossMmMatch[0]) + crossMmMatch[0].length);
    } else {
      // Pattern 2: "N.N mm" — decimal diameter only
      const simpleMmMatch = line.match(/(\d+[.,]\d+)\s*mm/i);
      if (!simpleMmMatch) continue;
      label = simpleMmMatch[1].replace(",", ".");
      afterLabel = line.slice(line.indexOf(simpleMmMatch[0]) + simpleMmMatch[0].length);
    }

    // Last price: Turkish decimal (1.234,56 / 0,85) or US decimal (0.85)
    const priceMatches = [...afterLabel.matchAll(/(\d{1,3}(?:\.\d{3})*,\d+|\d+,\d+|\d+\.\d+)/g)];
    if (!priceMatches.length) continue;
    const priceRaw = priceMatches[priceMatches.length - 1][1];
    const price = parseTurkishPrice(priceRaw);
    if (!price || isNaN(parseFloat(price))) continue;

    label = (label + opts.labelSuffix).trim();
    if (opts.findFrom) label = label.split(opts.findFrom).join(opts.findTo);
    if (!label) continue;
    results.push({ label, price1: price, price2: "" });
  }
  return results;
}

/**
 * Space-separated cross-table (PDF extract):
 *   Header: any line with ≥2 "letters+number" tokens — e.g. "M 5 M 6 …", "DIN6 DIN8 …"
 *   Data:   integer row label followed by left-aligned prices.
 * Multi-page tables (repeated header lines) are merged automatically.
 * WARNING: sparse tables (rows where leading column values are absent) will
 * misalign because PDF text has no column-position info. For accurate sparse
 * tables, paste tab-separated data from a spreadsheet (Excel / LibreOffice).
 */
function parseSpaceCrossTable(
  text: string,
  opts: { sep: string; colFirst: boolean }
): PreviewRow[] {
  const results: PreviewRow[] = [];
  let headers: string[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    // Header: ≥2 tokens matching "ASCII-letters + digits"  (M5, M 6, DIN8, A36 …)
    const hdrMatches = [...line.matchAll(/([A-Za-z]+)\s*(\d+)/g)];
    if (hdrMatches.length >= 2) {
      headers = hdrMatches.map(m => m[1].toUpperCase().replace(/\s+/g, "") + m[2]);
      continue;
    }
    if (!headers.length) continue;
    // Data line: first token must be a plain integer (row dimension / length)
    const tokens = line.split(/\s+/);
    const rowLabel = tokens[0];
    if (!rowLabel || isNaN(Number(rowLabel))) continue;
    const prices = tokens.slice(1);
    for (let i = 0; i < prices.length && i < headers.length; i++) {
      const price = parseTurkishPrice(prices[i]);
      if (!price || isNaN(parseFloat(price))) continue;
      const colLabel = headers[i];
      const label = opts.colFirst
        ? `${colLabel}${opts.sep}${rowLabel}`
        : `${rowLabel}${opts.sep}${colLabel}`;
      results.push({ label, price1: price, price2: "" });
    }
  }
  return results.sort((a, b) => naturalSort(a.label, b.label));
}

/** Returns true when any data row has fewer prices than detected headers (sparse table). */
function detectSparseCrossTable(text: string): boolean {
  let headers: string[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const hdrMatches = [...line.matchAll(/([A-Za-z]+)\s*(\d+)/g)];
    if (hdrMatches.length >= 2) { headers = hdrMatches.map(m => m[0]); continue; }
    if (!headers.length) continue;
    const tokens = line.split(/\s+/);
    if (isNaN(Number(tokens[0]))) continue;
    if (tokens.slice(1).filter(t => t).length < headers.length) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────

export default function VariationsBuilder({
  groups, variations, onGroupsChange, onVariationsChange,
  currencySymbol, hasPrice2, price2Label,
}: VariationsBuilderProps) {
  const [expanded, setExpanded] = useState(true);
  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>({});
  const [manualLabel, setManualLabel] = useState("");

  // Paste panel
  const [showPastePanel, setShowPastePanel] = useState(false);
  const [pasteMode, setPasteMode] = useState<PasteMode>("row");
  const [pasteStep, setPasteStep] = useState<PasteStep>("input");
  const [pasteText, setPasteText] = useState("");
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [rawText, setRawText] = useState("");
  const [dataFormat, setDataFormat] = useState<DataFormat>("tab");

  // Row-mode options (tab)
  const [colRoles, setColRoles] = useState<ColRole[]>([]);
  const [labelSuffix, setLabelSuffix] = useState("");
  const [labelSep, setLabelSep] = useState(" × ");
  const [labelFindFrom, setLabelFindFrom] = useState("");
  const [labelFindTo, setLabelFindTo] = useState("");
  const [normDecimals, setNormDecimals] = useState(false);
  const [skipFirstRow, setSkipFirstRow] = useState(false);
  const [filterJunk, setFilterJunk] = useState(true);

  // Cross-mode options (tab)
  const [crossSep, setCrossSep] = useState("X");
  const [crossColFirst, setCrossColFirst] = useState(true);
  const [crossHeaderRows, setCrossHeaderRows] = useState(1);
  const [crossPairedPrices, setCrossPairedPrices] = useState(false);
  const [crossNormalizeHeaders, setCrossNormalizeHeaders] = useState(true);
  const [crossColOffset, setCrossColOffset] = useState(0);

  // Space-mode options
  const [spaceSuffix, setSpaceSuffix] = useState(" MM");
  const [spaceFindFrom, setSpaceFindFrom] = useState("");
  const [spaceFindTo, setSpaceFindTo] = useState("");
  const [spaceSep, setSpaceSep] = useState("X");
  const [spaceColFirst, setSpaceColFirst] = useState(true);

  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [importAsPrice2, setImportAsPrice2] = useState(false);
  const [lastImportInfo, setLastImportInfo] = useState<{ count: number; mode: "add" | "update" } | null>(null);
  const [bulkD1, setBulkD1] = useState("");
  const [bulkD2, setBulkD2] = useState("");

  // Column previews for tab row mode
  const colPreviews = useMemo(() => {
    const dataRows = skipFirstRow ? rawRows.slice(1) : rawRows;
    if (!dataRows.length) return [];
    const n = Math.max(...rawRows.map(r => r.length));
    return Array.from({ length: n }, (_, i) => (dataRows[0]?.[i] || "").trim());
  }, [rawRows, skipFirstRow]);

  // Detect sparse space cross-table (misalignment risk)
  const spaceTableIsSparse = useMemo(
    () => dataFormat === "space" && pasteMode === "cross" && rawText
      ? detectSparseCrossTable(rawText)
      : false,
    [dataFormat, pasteMode, rawText]
  );

  // Live preview (first 5)
  const livePreview = useMemo<PreviewRow[]>(() => {
    if (pasteStep !== "map") return [];
    if (dataFormat === "space") {
      if (pasteMode === "row")
        return parseSpaceRows(rawText, { labelSuffix: spaceSuffix, findFrom: spaceFindFrom, findTo: spaceFindTo }).slice(0, 5);
      else
        return parseSpaceCrossTable(rawText, { sep: spaceSep, colFirst: spaceColFirst }).slice(0, 5);
    }
    if (pasteMode === "row")
      return applyRowMapping(rawRows, colRoles, {
        labelSuffix, labelSep, findFrom: labelFindFrom,
        findTo: labelFindTo, normDecimals, skipFirstRow, filterJunk,
      }).slice(0, 5);
    return applyTabCrossMapping(rawRows, {
      sep: crossSep, colFirst: crossColFirst, skipFirstRow: crossHeaderRows,
      pairedPrices: crossPairedPrices, normalizeHeaders: crossNormalizeHeaders,
      colOffset: crossColOffset,
    }).slice(0, 5);
  }, [
    pasteStep, pasteMode, dataFormat, rawText, rawRows, colRoles,
    labelSuffix, labelSep, labelFindFrom, labelFindTo, normDecimals, skipFirstRow, filterJunk,
    crossSep, crossColFirst, crossHeaderRows, crossPairedPrices, crossNormalizeHeaders, crossColOffset,
    spaceSuffix, spaceFindFrom, spaceFindTo, spaceSep, spaceColFirst,
  ]);

  // ── Group management ───────────────────────────────
  function addGroup() { onGroupsChange([...groups, { name: "", values: [] }]); }
  function updateGroupName(i: number, name: string) {
    const u = [...groups]; u[i] = { ...u[i], name }; onGroupsChange(u);
  }
  function removeGroup(i: number) { onGroupsChange(groups.filter((_, j) => j !== i)); }
  function addValueToGroup(gi: number) {
    const val = (newValueInputs[gi] || "").trim();
    if (!val || groups[gi].values.includes(val)) return;
    const u = [...groups]; u[gi] = { ...u[gi], values: [...u[gi].values, val] };
    onGroupsChange(u); setNewValueInputs(p => ({ ...p, [gi]: "" }));
  }
  function removeValueFromGroup(gi: number, vi: number) {
    const u = [...groups]; u[gi] = { ...u[gi], values: u[gi].values.filter((_, j) => j !== vi) };
    onGroupsChange(u);
  }
  function handleValueKeyDown(e: React.KeyboardEvent, gi: number) {
    if (e.key === "Enter") { e.preventDefault(); addValueToGroup(gi); }
  }

  // ── Generate combinations ──────────────────────────
  function generateCombinations() {
    const vg = groups.filter(g => g.name.trim() && g.values.length);
    if (!vg.length) return;
    const combine = (arrs: string[][]): string[][] => {
      if (!arrs.length) return [[]];
      const [first, ...rest] = arrs;
      return first.flatMap(v => combine(rest).map(c => [v, ...c]));
    };
    onVariationsChange(
      combine(vg.map(g => g.values)).map(c => ({
        variation_label: c.length === 1 ? c[0] : c.join(" × "),
        has_custom_price: false, list_price: "", discount_percent: "",
        list_price2: "", discount_percent2: "", sku: "",
      })).sort((a, b) => naturalSort(a.variation_label, b.variation_label))
    );
  }

  // ── Manual variation ───────────────────────────────
  function addManualVariation() {
    if (!manualLabel.trim() || variations.some(v => v.variation_label === manualLabel.trim())) return;
    onVariationsChange([
      ...variations,
      { variation_label: manualLabel.trim(), has_custom_price: false, list_price: "", discount_percent: "", list_price2: "", discount_percent2: "", sku: "" },
    ].sort((a, b) => naturalSort(a.variation_label, b.variation_label)));
    setManualLabel("");
  }
  function removeVariation(i: number) { onVariationsChange(variations.filter((_, j) => j !== i)); }
  function updateVariation(i: number, field: keyof VariationInput, value: string | boolean) {
    const u = [...variations]; u[i] = { ...u[i], [field]: value }; onVariationsChange(u);
  }
  function clearAllVariations() {
    if (variations.length && !confirm("Remove all variations?")) return;
    onVariationsChange([]);
  }
  function applyBulkDiscount() {
    if (!bulkD1 && !bulkD2) return;
    onVariationsChange(variations.map(v => {
      if (!v.has_custom_price) return v;
      return {
        ...v,
        ...(bulkD1 ? { discount_percent: bulkD1 } : {}),
        ...(bulkD2 ? { discount_percent2: bulkD2 } : {}),
      };
    }));
  }

  // ── Paste helpers ──────────────────────────────────
  function resetPastePanel() {
    setPasteText(""); setRawRows([]); setRawText(""); setColRoles([]);
    setPreviewRows([]); setPasteStep("input"); setImportAsPrice2(false);
    setLabelSuffix(""); setLabelFindFrom(""); setLabelFindTo("");
    setNormDecimals(false); setSkipFirstRow(false); setFilterJunk(true);
    setSpaceSuffix(" MM"); setSpaceFindFrom(""); setSpaceFindTo("");
  }

  function doParse(text: string) {
    if (!text.trim()) return;
    setLastImportInfo(null);
    const fmt = detectFormat(text);
    setDataFormat(fmt);
    setRawText(text);
    if (fmt === "tab") {
      const grid = parseTabGrid(text);
      setRawRows(grid);
      if (pasteMode === "row") setColRoles(autoDetectRoles(grid));
    } else {
      setRawRows([]);
      if (pasteMode === "row") {
        // "N x N mm" → SDS/tap style, dim×len already in label
        if (/\d+(?:[.,]\d+)?\s*[xX]\s*\d+(?:[.,]\d+)?\s*mm/i.test(text)) {
          setSpaceSuffix("");
        } else if (/\d+[.,]\d+\s*mm/i.test(text)) {
          // plain decimal drill bit → append unit
          setSpaceSuffix(" MM");
        }
      }
    }
    setPasteStep("map");
  }

  function buildPreviewRows() {
    let rows: PreviewRow[];
    if (dataFormat === "space") {
      if (pasteMode === "row")
        rows = parseSpaceRows(rawText, { labelSuffix: spaceSuffix, findFrom: spaceFindFrom, findTo: spaceFindTo });
      else
        rows = parseSpaceCrossTable(rawText, { sep: spaceSep, colFirst: spaceColFirst });
    } else if (pasteMode === "row") {
      rows = applyRowMapping(rawRows, colRoles, {
        labelSuffix, labelSep, findFrom: labelFindFrom,
        findTo: labelFindTo, normDecimals, skipFirstRow, filterJunk,
      });
    } else {
      rows = applyTabCrossMapping(rawRows, {
        sep: crossSep, colFirst: crossColFirst, skipFirstRow: crossHeaderRows,
        pairedPrices: crossPairedPrices, normalizeHeaders: crossNormalizeHeaders,
        colOffset: crossColOffset,
      });
    }
    setPreviewRows(rows);
    setPasteStep("preview");
  }

  function updatePreviewRow(i: number, field: keyof PreviewRow, val: string) {
    const u = [...previewRows]; u[i] = { ...u[i], [field]: val }; setPreviewRows(u);
  }
  function removePreviewRow(i: number) { setPreviewRows(previewRows.filter((_, j) => j !== i)); }

  function importPreviewRows() {
    let count = 0;
    const mode: "add" | "update" = importAsPrice2 ? "update" : "add";
    if (importAsPrice2) {
      const map = new Map(previewRows.map(r => [r.label.trim(), r.price1 || r.price2]));
      count = variations.filter(v => map.has(v.variation_label)).length;
      onVariationsChange(variations.map(v => {
        const p2 = map.get(v.variation_label);
        return p2 ? { ...v, has_custom_price: true, list_price2: p2 } : v;
      }));
    } else {
      const existing = new Set(variations.map(v => v.variation_label));
      const toAdd: VariationInput[] = previewRows
        .filter(r => r.label.trim() && !existing.has(r.label.trim()))
        .map(r => ({
          variation_label: r.label.trim(), has_custom_price: !!(r.price1 || r.price2),
          list_price: r.price1, discount_percent: "",
          list_price2: r.price2, discount_percent2: "", sku: "",
        }));
      count = toAdd.length;
      if (toAdd.length > 0) {
        onVariationsChange(
          [...variations, ...toAdd].sort((a, b) => naturalSort(a.variation_label, b.variation_label))
        );
      }
    }
    setLastImportInfo({ count, mode });
    resetPastePanel(); // goes back to input step — panel stays open for next batch
  }

  const validGroups = groups.filter(g => g.name.trim() && g.values.length);
  const possibleCombos = validGroups.reduce((a, g) => a * g.values.length, validGroups.length > 0 ? 1 : 0);
  const crossHeaderPreview = rawRows[crossHeaderRows - 1] || [];

  // ── Render ─────────────────────────────────────────
  return (
    <div className="card p-6 space-y-5">
      <button type="button" onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-hub-accent" />
          <h2 className="text-sm font-semibold text-hub-primary uppercase tracking-wider">Variations</h2>
          {variations.length > 0 && (
            <span className="text-[10px] font-semibold text-hub-accent bg-hub-accent/10 px-2 py-0.5 rounded-full">{variations.length}</span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-hub-secondary" /> : <ChevronDown className="w-4 h-4 text-hub-secondary" />}
      </button>

      {expanded && (
        <div className="space-y-6">
          {/* Groups */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-hub-secondary">Define variation axes (e.g., Diameter, Length, Number)</p>
              <button type="button" onClick={addGroup} className="flex items-center gap-1 text-xs font-medium text-hub-accent hover:text-hub-accent-hover transition-colors">
                <Plus className="w-3 h-3" /> Add Group
              </button>
            </div>
            {groups.map((group, gi) => (
              <div key={gi} className="border border-hub-border/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-3.5 h-3.5 text-hub-muted" />
                  <input type="text" value={group.name} onChange={e => updateGroupName(gi, e.target.value)}
                    className="flex-1 text-sm font-medium text-hub-primary bg-transparent border-none outline-none placeholder:text-hub-muted"
                    placeholder="Group name (e.g., Diameter)" />
                  <button type="button" onClick={() => removeGroup(gi)} className="p-1 text-hub-secondary hover:text-hub-error rounded transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.values.map((val, vi) => (
                    <span key={vi} className="inline-flex items-center gap-1 px-2.5 py-1 bg-hub-bg rounded-lg text-xs font-medium text-hub-primary">
                      {val}
                      <button type="button" onClick={() => removeValueFromGroup(gi, vi)} className="text-hub-muted hover:text-hub-error transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input type="text" value={newValueInputs[gi] || ""} onChange={e => setNewValueInputs(p => ({ ...p, [gi]: e.target.value }))}
                    onKeyDown={e => handleValueKeyDown(e, gi)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-hub-border/50 bg-hub-bg/30 text-sm text-hub-primary placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent/20"
                    placeholder="Type value, press Enter" />
                  <button type="button" onClick={() => addValueToGroup(gi)} className="px-3 py-1.5 text-xs font-medium text-hub-accent hover:bg-hub-accent/10 rounded-lg transition-colors">Add</button>
                </div>
              </div>
            ))}
            {validGroups.length > 0 && (
              <button type="button" onClick={generateCombinations}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-hub-accent/30 text-sm font-medium text-hub-accent hover:bg-hub-accent/5 transition-all">
                <Sparkles className="w-4 h-4" /> Generate {possibleCombos} Combination{possibleCombos !== 1 ? "s" : ""}
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-hub-border/30" />
            <span className="text-[10px] uppercase tracking-wider text-hub-muted font-medium">or add manually</span>
            <div className="flex-1 border-t border-hub-border/30" />
          </div>

          {/* Manual add */}
          <div className="flex items-center gap-2">
            <input type="text" value={manualLabel} onChange={e => setManualLabel(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addManualVariation(); } }}
              className="input-base flex-1" placeholder="e.g. 12x160, M10, No.3..." />
            <button type="button" onClick={addManualVariation} className="btn-primary py-3"><Plus className="w-4 h-4" /></button>
          </div>

          {/* ── Paste panel ─────────────────────────── */}
          <div>
            <button type="button" onClick={() => { setShowPastePanel(!showPastePanel); if (showPastePanel) resetPastePanel(); }}
              className="flex items-center gap-1.5 text-xs font-medium text-hub-secondary hover:text-hub-accent transition-colors">
              <ClipboardPaste className="w-3.5 h-3.5" />
              {showPastePanel ? "Hide" : "Paste from spreadsheet / PDF table"}
            </button>

            {showPastePanel && (
              <div className="mt-3 border border-hub-border/50 rounded-xl overflow-hidden">
                {/* Mode tabs */}
                <div className="flex border-b border-hub-border/50">
                  {(["row", "cross"] as PasteMode[]).map(m => (
                    <button key={m} type="button" onClick={() => { setPasteMode(m); resetPastePanel(); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${pasteMode === m ? "bg-hub-accent/5 text-hub-accent border-b-2 border-hub-accent" : "text-hub-secondary hover:text-hub-primary"}`}>
                      {m === "row" ? <><LayoutList className="w-3.5 h-3.5" /> Row per variation</> : <><Table2 className="w-3.5 h-3.5" /> Cross-table (bolts)</>}
                    </button>
                  ))}
                </div>

                <div className="p-4 space-y-4">

                  {/* Step: input */}
                  {pasteStep === "input" && (
                    <>
                      {lastImportInfo ? (
                        <div className="flex items-center justify-between gap-2 text-[11px] text-hub-success bg-hub-success/5 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 flex-shrink-0" />
                            {lastImportInfo.mode === "add"
                              ? `${lastImportInfo.count} variation${lastImportInfo.count !== 1 ? "s" : ""} added — paste next batch, or close when done.`
                              : `Price 2 updated on ${lastImportInfo.count} row${lastImportInfo.count !== 1 ? "s" : ""} — paste next batch, or close when done.`}
                          </div>
                          <button type="button" onClick={() => { setShowPastePanel(false); setLastImportInfo(null); }}
                            className="flex-shrink-0 text-hub-secondary hover:text-hub-primary transition-colors" title="Close">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-[11px] text-hub-muted leading-relaxed">
                          {pasteMode === "row"
                            ? "Copy rows from Excel or PDF and paste. Works with tabs (Excel) or spaces (PDF)."
                            : "Paste the full cross-table — headers and all data rows. Multi-page tables: paste each sheet separately."}
                        </p>
                      )}
                      <textarea value={pasteText} onChange={e => { setPasteText(e.target.value); if (lastImportInfo) setLastImportInfo(null); }}
                        onPaste={e => { setTimeout(() => { const v = (e.target as HTMLTextAreaElement).value; if (v.trim()) doParse(v); }, 60); }}
                        className="w-full h-28 px-3 py-2 rounded-lg border border-hub-border/50 bg-hub-bg/30 text-xs font-mono text-hub-primary placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent/20 resize-none"
                        placeholder={pasteMode === "row" ? "Paste rows here…" : "Paste cross-table here…"} />
                      <button type="button" onClick={() => doParse(pasteText)} disabled={!pasteText.trim()}
                        className="w-full py-2 rounded-xl border border-hub-accent/30 text-sm font-medium text-hub-accent hover:bg-hub-accent/5 transition-all disabled:opacity-40">
                        Parse →
                      </button>
                    </>
                  )}

                  {/* Step: map — space row mode */}
                  {pasteStep === "map" && pasteMode === "row" && dataFormat === "space" && (
                    <>
                      <div className="flex items-center gap-2 text-[11px] text-hub-success bg-hub-success/5 rounded-lg px-3 py-2">
                        <Check className="w-3.5 h-3.5 flex-shrink-0" />
                        PDF format detected — label from "N.N mm" (drill bits) or "N x N mm" (SDS / taps / reamers), price from last number per row. Junk lines skipped automatically.
                      </div>

                      <div className="space-y-2.5 border-t border-hub-border/30 pt-3">
                        <p className="text-[10px] font-semibold text-hub-secondary uppercase tracking-wider">Label options</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-hub-muted block mb-1">Suffix (appended after number)</label>
                            <input type="text" value={spaceSuffix} onChange={e => setSpaceSuffix(e.target.value)}
                              className="w-full px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-xs text-hub-primary focus:outline-none focus:ring-1 focus:ring-hub-accent/20"
                              placeholder=" MM" />
                          </div>
                          <div>
                            <label className="text-[10px] text-hub-muted block mb-1">Find → Replace</label>
                            <div className="flex items-center gap-1">
                              <input type="text" value={spaceFindFrom} onChange={e => setSpaceFindFrom(e.target.value)}
                                className="flex-1 px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-xs text-hub-primary focus:outline-none focus:ring-1 focus:ring-hub-accent/20" placeholder="Find" />
                              <ArrowRight className="w-3 h-3 text-hub-muted flex-shrink-0" />
                              <input type="text" value={spaceFindTo} onChange={e => setSpaceFindTo(e.target.value)}
                                className="flex-1 px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-xs text-hub-primary focus:outline-none focus:ring-1 focus:ring-hub-accent/20" placeholder="Replace" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {livePreview.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5"><Filter className="w-3 h-3 text-hub-muted" /><p className="text-[10px] font-semibold text-hub-muted uppercase tracking-wider">Preview (first {livePreview.length})</p></div>
                          {livePreview.map((row, i) => (
                            <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-hub-bg/50 text-xs">
                              <span className="flex-1 font-medium text-hub-primary">{row.label}</span>
                              {row.price1 && <span className="text-hub-success font-medium">{currencySymbol}{row.price1}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button type="button" onClick={() => setPasteStep("input")} className="px-3 py-2 rounded-xl border border-hub-border/50 text-xs font-medium text-hub-secondary hover:text-hub-primary transition-colors">← Back</button>
                        <button type="button" onClick={buildPreviewRows} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-hub-accent text-white text-xs font-medium hover:bg-hub-accent-hover transition-colors">Preview & Edit →</button>
                      </div>
                    </>
                  )}

                  {/* Step: map — space cross mode */}
                  {pasteStep === "map" && pasteMode === "cross" && dataFormat === "space" && (
                    <>
                      <div className="flex items-center gap-2 text-[11px] text-hub-success bg-hub-success/5 rounded-lg px-3 py-2">
                        <Check className="w-3.5 h-3.5 flex-shrink-0" />
                        PDF format detected — column headers auto-detected (M5, M6… or any letter+number pattern), prices left-aligned per row. Multi-page tables merged.
                      </div>
                      {spaceTableIsSparse && (
                        <div className="flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                          <span className="flex-shrink-0 mt-0.5">⚠</span>
                          <span>Sparse table detected — some rows have fewer values than headers. PDF text has no column alignment, so prices may shift to the wrong size. For accurate results, paste tab-separated data from a spreadsheet instead.</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-hub-muted block mb-1">Separator</label>
                          <input type="text" value={spaceSep} onChange={e => setSpaceSep(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-xs text-hub-primary focus:outline-none focus:ring-1 focus:ring-hub-accent/20" placeholder="X" />
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={spaceColFirst} onChange={e => setSpaceColFirst(e.target.checked)} className="rounded border-hub-border/50 text-hub-accent" />
                            <span className="text-[11px] text-hub-secondary">Column first (M5X10)</span>
                          </label>
                        </div>
                      </div>

                      {livePreview.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-hub-muted uppercase tracking-wider">Preview (first {livePreview.length})</p>
                          {livePreview.map((row, i) => (
                            <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-hub-bg/50 text-xs">
                              <span className="flex-1 font-medium text-hub-primary">{row.label}</span>
                              {row.price1 && <span className="text-hub-success font-medium">{currencySymbol}{row.price1}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button type="button" onClick={() => setPasteStep("input")} className="px-3 py-2 rounded-xl border border-hub-border/50 text-xs font-medium text-hub-secondary hover:text-hub-primary transition-colors">← Back</button>
                        <button type="button" onClick={buildPreviewRows} disabled={!rawText.trim()}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-hub-accent text-white text-xs font-medium hover:bg-hub-accent-hover transition-colors disabled:opacity-40">
                          Preview & Edit →
                        </button>
                      </div>
                    </>
                  )}

                  {/* Step: map — tab row mode */}
                  {pasteStep === "map" && pasteMode === "row" && dataFormat === "tab" && (
                    <>
                      <p className="text-[11px] text-hub-secondary">{rawRows.length} rows · {colPreviews.length} columns. Assign roles:</p>
                      <div className="overflow-x-auto pb-1">
                        <div className="flex gap-2 min-w-max">
                          {colPreviews.map((preview, ci) => (
                            <div key={ci} className={`flex flex-col gap-1.5 p-2 rounded-lg border text-center min-w-[72px] ${colRoles[ci] === "ignore" ? "border-hub-border/30 bg-hub-bg/20 opacity-50" : colRoles[ci] === "label" || colRoles[ci] === "label2" ? "border-hub-accent/40 bg-hub-accent/5" : "border-hub-success/40 bg-hub-success/5"}`}>
                              <span className="text-[10px] text-hub-muted font-mono truncate max-w-[72px]" title={preview}>{preview || "—"}</span>
                              <select value={colRoles[ci] || "ignore"} onChange={e => { const u = [...colRoles]; u[ci] = e.target.value as ColRole; setColRoles(u); }}
                                className="text-[10px] rounded border border-hub-border/40 bg-white text-hub-primary focus:outline-none py-0.5">
                                {COL_ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2.5 pt-1 border-t border-hub-border/30">
                        <p className="text-[10px] font-semibold text-hub-secondary uppercase tracking-wider">Label options</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className="text-[10px] text-hub-muted block mb-1">Suffix</label>
                            <input type="text" value={labelSuffix} onChange={e => setLabelSuffix(e.target.value)} className="w-full px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-xs text-hub-primary focus:outline-none focus:ring-1 focus:ring-hub-accent/20" placeholder=" MM" />
                          </div>
                          <div><label className="text-[10px] text-hub-muted block mb-1">+Label separator</label>
                            <input type="text" value={labelSep} onChange={e => setLabelSep(e.target.value)} className="w-full px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-xs text-hub-primary focus:outline-none focus:ring-1 focus:ring-hub-accent/20" placeholder=" × " />
                          </div>
                        </div>
                        <div><label className="text-[10px] text-hub-muted block mb-1">Find → Replace</label>
                          <div className="flex items-center gap-1.5">
                            <input type="text" value={labelFindFrom} onChange={e => setLabelFindFrom(e.target.value)} className="flex-1 px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-xs text-hub-primary focus:outline-none focus:ring-1 focus:ring-hub-accent/20" placeholder="Find" />
                            <ArrowRight className="w-3.5 h-3.5 text-hub-muted flex-shrink-0" />
                            <input type="text" value={labelFindTo} onChange={e => setLabelFindTo(e.target.value)} className="flex-1 px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-xs text-hub-primary focus:outline-none focus:ring-1 focus:ring-hub-accent/20" placeholder="Replace" />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                          {[{ checked: normDecimals, set: setNormDecimals, label: "Normalize decimals (1,0→1.0)" },
                            { checked: skipFirstRow, set: setSkipFirstRow, label: "Skip first row (header)" },
                            { checked: filterJunk, set: setFilterJunk, label: "Skip rows without price" }].map(({ checked, set, label }) => (
                            <label key={label} className="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={checked} onChange={e => set(e.target.checked)} className="rounded border-hub-border/50 text-hub-accent" />
                              <span className="text-[11px] text-hub-secondary">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {livePreview.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5"><Filter className="w-3 h-3 text-hub-muted" /><p className="text-[10px] font-semibold text-hub-muted uppercase tracking-wider">Preview (first {livePreview.length})</p></div>
                          {livePreview.map((row, i) => (
                            <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-hub-bg/50 text-xs">
                              <span className="flex-1 font-medium text-hub-primary">{row.label}</span>
                              {row.price1 && <span className="text-hub-success font-medium">{currencySymbol}{row.price1}</span>}
                              {row.price2 && <span className="text-hub-accent/70 font-medium">{currencySymbol}{row.price2}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setPasteStep("input")} className="px-3 py-2 rounded-xl border border-hub-border/50 text-xs font-medium text-hub-secondary hover:text-hub-primary transition-colors">← Back</button>
                        <button type="button" onClick={buildPreviewRows} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-hub-accent text-white text-xs font-medium hover:bg-hub-accent-hover transition-colors">Preview & Edit →</button>
                      </div>
                    </>
                  )}

                  {/* Step: map — tab cross mode */}
                  {pasteStep === "map" && pasteMode === "cross" && dataFormat === "tab" && (
                    <>
                      <p className="text-[11px] text-hub-secondary">{rawRows.length} rows · {rawRows[0]?.length || 0} columns detected.</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-[10px] text-hub-muted block mb-1">Separator</label>
                          <input type="text" value={crossSep} onChange={e => setCrossSep(e.target.value)} className="w-full px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-xs text-hub-primary focus:outline-none focus:ring-1 focus:ring-hub-accent/20" placeholder="X" />
                        </div>
                        <div><label className="text-[10px] text-hub-muted block mb-1">Header rows to skip</label>
                          <input type="number" min={1} max={5} value={crossHeaderRows} onChange={e => setCrossHeaderRows(Number(e.target.value))} className="w-full px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-xs text-hub-primary focus:outline-none focus:ring-1 focus:ring-hub-accent/20" />
                        </div>
                      </div>
                      <div><label className="text-[10px] text-hub-muted block mb-1">Column alignment</label>
                        <select value={crossColOffset} onChange={e => setCrossColOffset(Number(e.target.value))} className="w-full px-2 py-1.5 rounded-lg border border-hub-border/30 bg-white text-xs text-hub-primary focus:outline-none focus:ring-1 focus:ring-hub-accent/20">
                          <option value={0}>Standard (header col 1 = data col 1)</option>
                          <option value={1}>Shifted (header starts at col 0, data at col 1)</option>
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {[{ checked: crossColFirst, set: setCrossColFirst, label: "Column first (M5X10)" },
                          { checked: crossNormalizeHeaders, set: setCrossNormalizeHeaders, label: 'Strip spaces ("M 5"→"M5")' },
                          { checked: crossPairedPrices, set: setCrossPairedPrices, label: "Paired prices (P1+P2)" }].map(({ checked, set, label }) => (
                          <label key={label} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={checked} onChange={e => set(e.target.checked)} className="rounded border-hub-border/50 text-hub-accent" />
                            <span className="text-[11px] text-hub-secondary">{label}</span>
                          </label>
                        ))}
                      </div>
                      {crossHeaderPreview.length > 0 && (
                        <div className="overflow-x-auto pb-1">
                          <div className="flex gap-1 min-w-max">
                            {crossHeaderPreview.map((h, i) => (
                              <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-medium ${i === 0 && crossColOffset === 0 ? "bg-hub-bg text-hub-muted" : "bg-hub-accent/10 text-hub-accent"}`}>
                                {crossNormalizeHeaders ? h.replace(/\s+/g, "") || "—" : h || "—"}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {livePreview.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-hub-muted uppercase tracking-wider">Preview (first {livePreview.length})</p>
                          {livePreview.map((row, i) => (
                            <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-hub-bg/50 text-xs">
                              <span className="flex-1 font-medium text-hub-primary">{row.label}</span>
                              {row.price1 && <span className="text-hub-success font-medium">{currencySymbol}{row.price1}</span>}
                              {row.price2 && <span className="text-hub-accent/70 font-medium">{currencySymbol}{row.price2}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setPasteStep("input")} className="px-3 py-2 rounded-xl border border-hub-border/50 text-xs font-medium text-hub-secondary hover:text-hub-primary transition-colors">← Back</button>
                        <button type="button" onClick={buildPreviewRows} disabled={rawRows.length === 0}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-hub-accent text-white text-xs font-medium hover:bg-hub-accent-hover transition-colors disabled:opacity-40">
                          Preview & Edit →
                        </button>
                      </div>
                    </>
                  )}

                  {/* Step: preview / edit */}
                  {pasteStep === "preview" && (
                    <>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-[11px] text-hub-secondary">{previewRows.length} rows — edit before importing.</p>
                        {variations.length > 0 && (
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={importAsPrice2} onChange={e => setImportAsPrice2(e.target.checked)} className="rounded border-hub-border/50 text-hub-accent" />
                            <span className="text-[11px] text-hub-secondary font-medium">Update Price 2 on existing</span>
                          </label>
                        )}
                      </div>
                      {importAsPrice2 && (
                        <p className="text-[11px] text-hub-success bg-hub-success/5 rounded-lg px-3 py-2">
                          Matches labels and sets Price 2 on existing variations.
                        </p>
                      )}
                      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                        <div className="grid gap-2 px-1" style={{ gridTemplateColumns: "1fr 5rem 5rem 1.5rem" }}>
                          <span className="text-[10px] font-semibold text-hub-muted uppercase tracking-wider">Label</span>
                          <span className="text-[10px] font-semibold text-hub-muted uppercase tracking-wider">{importAsPrice2 ? "Price 2" : "Price 1"}</span>
                          <span className="text-[10px] font-semibold text-hub-muted uppercase tracking-wider">{importAsPrice2 ? "—" : (hasPrice2 ? price2Label || "Price 2" : "Price 2")}</span>
                          <span />
                        </div>
                        {previewRows.map((row, i) => (
                          <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: "1fr 5rem 5rem 1.5rem" }}>
                            <input type="text" value={row.label} onChange={e => updatePreviewRow(i, "label", e.target.value)}
                              className="px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-xs text-hub-primary focus:outline-none focus:ring-1 focus:ring-hub-accent/20" />
                            <input type="text" value={row.price1} onChange={e => updatePreviewRow(i, "price1", e.target.value)}
                              className="px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-xs text-hub-primary focus:outline-none focus:ring-1 focus:ring-hub-accent/20" placeholder={currencySymbol} />
                            <input type="text" value={row.price2} onChange={e => updatePreviewRow(i, "price2", e.target.value)}
                              className="px-2 py-1 rounded-lg border border-hub-accent/20 bg-hub-accent/5 text-xs text-hub-primary focus:outline-none focus:ring-1 focus:ring-hub-accent/20" placeholder={currencySymbol} />
                            <button type="button" onClick={() => removePreviewRow(i)} className="p-1 text-hub-muted hover:text-hub-error rounded transition-colors"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => setPasteStep("map")} className="px-3 py-2 rounded-xl border border-hub-border/50 text-xs font-medium text-hub-secondary hover:text-hub-primary transition-colors">← Back</button>
                        <button type="button" onClick={importPreviewRows} disabled={previewRows.length === 0}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-hub-accent text-white text-xs font-medium hover:bg-hub-accent-hover transition-colors disabled:opacity-40">
                          <Check className="w-3.5 h-3.5" />
                          {importAsPrice2 ? `Update Price 2 on ${previewRows.length} rows` : `Import ${previewRows.length} row${previewRows.length !== 1 ? "s" : ""}`} & paste more
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Variations list */}
          {variations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-medium text-hub-secondary">{variations.length} variation{variations.length !== 1 ? "s" : ""}</p>
                <div className="flex items-center gap-1.5">
                  <input type="number" min="0" max="100" step="0.1" value={bulkD1} onChange={e => setBulkD1(e.target.value)}
                    className="w-16 px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-[11px] text-hub-primary placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent/20"
                    placeholder="D1%" />
                  {hasPrice2 && (
                    <input type="number" min="0" max="100" step="0.1" value={bulkD2} onChange={e => setBulkD2(e.target.value)}
                      className="w-16 px-2 py-1 rounded-lg border border-hub-accent/20 bg-hub-accent/5 text-[11px] text-hub-primary placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent/20"
                      placeholder="D2%" />
                  )}
                  <button type="button" onClick={applyBulkDiscount} disabled={!bulkD1 && !bulkD2}
                    className="px-2 py-1 rounded-lg text-[11px] font-medium text-hub-accent hover:bg-hub-accent/10 transition-colors disabled:opacity-40">
                    Apply all
                  </button>
                  <div className="w-px h-3 bg-hub-border/50" />
                  <button type="button" onClick={clearAllVariations} className="flex items-center gap-1 text-[11px] text-hub-error/70 hover:text-hub-error transition-colors">
                    <Trash2 className="w-3 h-3" /> Clear all
                  </button>
                </div>
              </div>
              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                {variations.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-hub-bg/50 border border-hub-border/30 group">
                    <span className="text-sm font-medium text-hub-primary flex-1 min-w-0 truncate">{v.variation_label}</span>
                    <input type="text" value={v.sku} onChange={e => updateVariation(i, "sku", e.target.value)}
                      className="w-20 px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-[11px] text-hub-secondary placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent/20" placeholder="SKU" />
                    <button type="button" onClick={() => updateVariation(i, "has_custom_price", !v.has_custom_price)}
                      className={`p-1.5 rounded-lg transition-colors ${v.has_custom_price ? "bg-hub-accent/10 text-hub-accent" : "text-hub-muted hover:text-hub-secondary"}`} title="Custom price">
                      <DollarSign className="w-3.5 h-3.5" />
                    </button>
                    {v.has_custom_price && (
                      <>
                        <div className="flex items-center gap-1">
                          <input type="number" step="0.01" min="0" value={v.list_price} onChange={e => updateVariation(i, "list_price", e.target.value)}
                            className="w-20 px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-[11px] text-hub-primary placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent/20" placeholder={`${currencySymbol} P1`} />
                          <input type="number" step="0.01" min="0" max="100" value={v.discount_percent} onChange={e => updateVariation(i, "discount_percent", e.target.value)}
                            className="w-16 px-2 py-1 rounded-lg border border-hub-border/30 bg-white text-[11px] text-hub-primary placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent/20" placeholder="D1%" />
                        </div>
                        {hasPrice2 && (
                          <div className="flex items-center gap-1">
                            <input type="number" step="0.01" min="0" value={v.list_price2} onChange={e => updateVariation(i, "list_price2", e.target.value)}
                              className="w-20 px-2 py-1 rounded-lg border border-hub-accent/20 bg-hub-accent/5 text-[11px] text-hub-primary placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent/20" placeholder={`${currencySymbol} P2`} />
                            <input type="number" step="0.01" min="0" max="100" value={v.discount_percent2} onChange={e => updateVariation(i, "discount_percent2", e.target.value)}
                              className="w-16 px-2 py-1 rounded-lg border border-hub-accent/20 bg-hub-accent/5 text-[11px] text-hub-primary placeholder:text-hub-muted focus:outline-none focus:ring-1 focus:ring-hub-accent/20" placeholder="D2%" />
                          </div>
                        )}
                      </>
                    )}
                    <button type="button" onClick={() => removeVariation(i)} className="p-1 text-hub-muted hover:text-hub-error rounded transition-colors opacity-0 group-hover:opacity-100">
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
