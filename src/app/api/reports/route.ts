import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import type {
  ReportRetailStats,
  ReportKasa,
  ReportLeaderboardRow,
  ReportProductRow,
} from "@/types";

export const dynamic = "force-dynamic";

interface RawRetailItem {
  product_id: string;
  product_name: string;
  brand_name: string | null;
  variation_label: string | null;
  quantity: number;
  returned_quantity: number;
  unit_price_try: number;
}

interface RawRetailSale {
  id: string;
  employee_username: string;
  discount_amount: number;
  total: number;
  payment_method: "cash" | "card";
  status: "completed" | "returned" | "partially_returned";
  items: RawRetailItem[];
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "date_from and date_to are required" },
        { status: 400 }
      );
    }

    // ── Query 1: retail_sales with items ──────────────────────
    const { data: retailSales, error: retailErr } = await supabaseAdmin
      .from("retail_sales")
      .select(
        "id, employee_username, discount_amount, total, payment_method, status, items:retail_sale_items(product_id, product_name, brand_name, variation_label, quantity, returned_quantity, unit_price_try)"
      )
      .gte("created_at", dateFrom + "T00:00:00")
      .lte("created_at", dateTo + "T23:59:59");

    if (retailErr) throw retailErr;

    // ── Query 2: b2b_sales light for leaderboard ──────────────
    const { data: b2bSales, error: b2bErr } = await supabaseAdmin
      .from("b2b_sales")
      .select("employee_username, status")
      .gte("created_at", dateFrom + "T00:00:00")
      .lte("created_at", dateTo + "T23:59:59")
      .neq("status", "returned");

    if (b2bErr) throw b2bErr;

    // ── Aggregate retailStats + kasa ──────────────────────────
    let total_revenue = 0;
    let total_transactions = 0;
    let total_discount = 0;
    let return_count = 0;
    let cash_in = 0;
    let cash_out = 0;
    let card_revenue = 0;

    // Leaderboard retail map
    const retailByEmp = new Map<string, { revenue: number; txns: number }>();
    // Product performance map
    const productMap = new Map<
      string,
      ReportProductRow
    >();

    for (const sale of (retailSales as RawRetailSale[]) || []) {
      const isCash = sale.payment_method === "cash";
      const items = sale.items || [];

      if (sale.status === "returned") {
        return_count++;
        // Cash was received then fully refunded — cash_in and cash_out cancel
        if (isCash) {
          cash_in += Number(sale.total);
          cash_out += Number(sale.total);
        }
        // Don't count in revenue or transactions
        continue;
      }

      if (sale.status === "partially_returned") {
        return_count++;
      }

      total_transactions++;
      total_discount += Number(sale.discount_amount);

      // Actual revenue for this sale
      let saleRevenue: number;
      if (sale.status === "completed") {
        saleRevenue = Number(sale.total);
      } else {
        // partially_returned: item-level sum (discount not re-applied, acceptable simplification)
        saleRevenue = items.reduce((sum, item) => {
          const activeQty = Number(item.quantity) - Number(item.returned_quantity);
          return sum + Number(item.unit_price_try) * activeQty;
        }, 0);
        saleRevenue = Math.round(saleRevenue * 100) / 100;
      }

      total_revenue += saleRevenue;

      if (isCash) {
        // Full checkout amount was collected; cash_out covers any returned items
        cash_in += Number(sale.total);
        const returnedCash = items.reduce((sum, item) => {
          return sum + Number(item.unit_price_try) * Number(item.returned_quantity);
        }, 0);
        cash_out += Math.round(returnedCash * 100) / 100;
      } else {
        card_revenue += saleRevenue;
      }

      // Leaderboard retail
      const empRetail = retailByEmp.get(sale.employee_username) ?? { revenue: 0, txns: 0 };
      empRetail.revenue += Number(sale.total); // use sale.total for ranking (simpler)
      empRetail.txns += 1;
      retailByEmp.set(sale.employee_username, empRetail);

      // Product performance (skip fully returned sales above via continue)
      for (const item of items) {
        const activeQty = Number(item.quantity) - Number(item.returned_quantity);
        if (activeQty <= 0 && Number(item.returned_quantity) === 0) continue;

        const key = `${item.product_id}:${item.variation_label ?? ""}`;
        const itemRevenue = Math.round(Number(item.unit_price_try) * Math.max(0, activeQty) * 100) / 100;
        const hasReturn = Number(item.returned_quantity) > 0;

        const curr = productMap.get(key) ?? {
          product_id: item.product_id,
          product_name: item.product_name,
          brand_name: item.brand_name,
          variation_label: item.variation_label,
          units_sold: 0,
          revenue: 0,
          return_count: 0,
        };
        curr.units_sold += Math.max(0, activeQty);
        curr.revenue = Math.round((curr.revenue + itemRevenue) * 100) / 100;
        if (hasReturn) curr.return_count += 1;
        productMap.set(key, curr);
      }
    }

    const net_cash_revenue = Math.round((cash_in - cash_out) * 100) / 100;

    const retailStats: ReportRetailStats = {
      total_revenue: Math.round(total_revenue * 100) / 100,
      total_transactions,
      cash_total: net_cash_revenue,
      card_total: Math.round(card_revenue * 100) / 100,
      total_discount: Math.round(total_discount * 100) / 100,
      return_count,
      avg_transaction_value:
        total_transactions > 0
          ? Math.round((total_revenue / total_transactions) * 100) / 100
          : 0,
    };

    const kasa: ReportKasa = {
      cash_in: Math.round(cash_in * 100) / 100,
      cash_out: Math.round(cash_out * 100) / 100,
      net_kasa: net_cash_revenue,
      card_total: Math.round(card_revenue * 100) / 100,
    };

    // ── Leaderboard ───────────────────────────────────────────
    const b2bByEmp = new Map<string, number>();
    for (const sale of b2bSales || []) {
      b2bByEmp.set(
        sale.employee_username,
        (b2bByEmp.get(sale.employee_username) ?? 0) + 1
      );
    }

    const allUsernames = new Set([
      ...retailByEmp.keys(),
      ...b2bByEmp.keys(),
    ]);

    const leaderboard: ReportLeaderboardRow[] = Array.from(allUsernames)
      .map((username) => ({
        rank: 0,
        employee_username: username,
        retail_revenue: retailByEmp.get(username)?.revenue ?? 0,
        retail_transaction_count: retailByEmp.get(username)?.txns ?? 0,
        b2b_order_count: b2bByEmp.get(username) ?? 0,
      }))
      .sort((a, b) => b.retail_revenue - a.retail_revenue)
      .map((row, i) => ({ ...row, rank: i + 1 }));

    // ── Products ──────────────────────────────────────────────
    const products: ReportProductRow[] = Array.from(productMap.values())
      .filter((p) => p.units_sold > 0)
      .sort((a, b) => b.units_sold - a.units_sold)
      .slice(0, 20);

    return NextResponse.json({
      retailStats,
      kasa,
      leaderboard,
      products,
      date_from: dateFrom,
      date_to: dateTo,
    });
  } catch (err) {
    console.error("Reports GET error:", err);
    return NextResponse.json(
      { error: "Failed to load report data" },
      { status: 500 }
    );
  }
}
