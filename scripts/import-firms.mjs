import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";

const SUPABASE_URL = "https://rcftoxsnfyjjgdimzdux.supabase.co";
const SERVICE_KEY = "sb_publishable_9G7wY3YODH6I3cT0BvaCmw_4v7bIyRq";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const wb = XLSX.readFile("FIRMS.xlsx");
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

const seen = new Set();
const firms = rows
  .map((r) => {
    const name = r[0]?.toString().trim();
    if (!name) return null;
    const isLocked = r[1]?.toString().trim().toUpperCase() === "X";
    return {
      name,
      is_locked: isLocked,
      lock_reason: isLocked ? "Borç" : null,
    };
  })
  .filter((f) => {
    if (!f) return false;
    if (seen.has(f.name)) return false;
    seen.add(f.name);
    return true;
  });

console.log(`Importing ${firms.length} firms (${firms.filter((f) => f.is_locked).length} locked)...`);

const { data, error } = await supabase
  .from("firms")
  .upsert(firms, { onConflict: "name", ignoreDuplicates: false })
  .select("id");

if (error) {
  console.error("Import error:", error.message);
  process.exit(1);
} else {
  console.log(`Successfully upserted ${data.length} firms.`);
}
