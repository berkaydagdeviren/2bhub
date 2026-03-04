"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  AlertCircle,
  Banknote,
  CreditCard,
  RotateCcw,
  Users,
  Package,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { ReportData } from "@/types";

// ── Helpers ────────────────────────────────────────────────────

function fmt(amount: number): string {
  return (
    "₺" +
    amount.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function fmtInt(n: number): string {
  return n.toLocaleString("tr-TR");
}

function getDefaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().split("T")[0];
}

function getDefaultDateTo(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Stat Tile ──────────────────────────────────────────────────

function StatTile({
  label,
  value,
  valueClass = "text-hub-accent",
  icon: Icon,
}: {
  label: string;
  value: string;
  valueClass?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="p-4 rounded-xl bg-hub-bg/60 border border-hub-border/40 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-hub-secondary" />}
        <span className="text-[10px] font-semibold text-hub-secondary uppercase tracking-wider">
          {label}
        </span>
      </div>
      <span className={`text-xl font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}

// ── Loading Skeleton ───────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card p-5 animate-pulse">
          <div className="h-4 bg-hub-border/50 rounded w-40 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-16 bg-hub-border/30 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom);
  const [dateTo, setDateTo] = useState(getDefaultDateTo);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      const res = await fetch(`/api/reports?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Yüklenemedi");
      setData(json as ReportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rapor yüklenemedi");
    }
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dateLabel =
    data
      ? `${formatDate(data.date_from + "T12:00:00")} – ${formatDate(data.date_to + "T12:00:00")}`
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 rounded-lg hover:bg-hub-border/30 text-hub-secondary hover:text-hub-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-hub-primary">Raporlar</h1>
          <p className="text-sm text-hub-secondary mt-0.5">
            Satış analizi ve personel performansı
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label-base">Başlangıç</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-base"
            />
          </div>
          <div>
            <label className="label-base">Bitiş</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-base"
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="btn-primary flex items-center gap-2 self-end"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Calendar className="w-4 h-4" />
            )}
            {loading ? "Yükleniyor…" : "Getir"}
          </button>
        </div>
        {dateLabel && (
          <p className="text-xs text-hub-muted mt-3 pt-3 border-t border-hub-border/50">
            Gösterilen dönem: <span className="font-medium text-hub-secondary">{dateLabel}</span>
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-hub-error text-sm p-4 bg-red-50 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <Skeleton />}

      {/* Data */}
      {!loading && data && (
        <div className="space-y-4">
          {/* Section 1 — Retail Satış Özeti */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-hub-accent" />
              <h2 className="font-semibold text-hub-primary">Perakende Satış Özeti</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatTile
                label="Toplam Ciro"
                value={fmt(data.retailStats.total_revenue)}
                valueClass="text-hub-accent"
              />
              <StatTile
                label="İşlem Sayısı"
                value={fmtInt(data.retailStats.total_transactions)}
                valueClass="text-hub-primary"
              />
              <StatTile
                label="Ort. İşlem Tutarı"
                value={fmt(data.retailStats.avg_transaction_value)}
                valueClass="text-hub-primary"
              />
              <StatTile
                label="Nakit Ciro"
                value={fmt(data.retailStats.cash_total)}
                valueClass="text-hub-success"
                icon={Banknote}
              />
              <StatTile
                label="Kart Ciro"
                value={fmt(data.retailStats.card_total)}
                valueClass="text-blue-600"
                icon={CreditCard}
              />
              <StatTile
                label="İade Sayısı"
                value={fmtInt(data.retailStats.return_count)}
                valueClass={
                  data.retailStats.return_count > 0
                    ? "text-hub-error"
                    : "text-hub-muted"
                }
                icon={RotateCcw}
              />
            </div>
            {data.retailStats.total_discount > 0 && (
              <p className="text-xs text-hub-secondary mt-3 pt-3 border-t border-hub-border/50">
                Toplam iskonto:{" "}
                <span className="font-semibold text-hub-primary">
                  {fmt(data.retailStats.total_discount)}
                </span>
              </p>
            )}
          </div>

          {/* Section 2 — Kasa */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Banknote className="w-4 h-4 text-hub-accent" />
              <h2 className="font-semibold text-hub-primary">Kasa Durumu</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile
                label="Nakit Giriş"
                value={fmt(data.kasa.cash_in)}
                valueClass="text-hub-success"
              />
              <StatTile
                label="Nakit Çıkış (İade)"
                value={fmt(data.kasa.cash_out)}
                valueClass={
                  data.kasa.cash_out > 0 ? "text-hub-error" : "text-hub-muted"
                }
              />
              <StatTile
                label="Net Kasa"
                value={fmt(data.kasa.net_kasa)}
                valueClass={
                  data.kasa.net_kasa >= 0 ? "text-hub-success" : "text-hub-error"
                }
              />
              <StatTile
                label="Kart Toplam (ref.)"
                value={fmt(data.kasa.card_total)}
                valueClass="text-blue-600"
              />
            </div>
            <p className="text-[10px] text-hub-muted mt-3 pt-3 border-t border-hub-border/50 italic">
              Nakit Giriş: tahsilat toplamı · Nakit Çıkış: iade ödemeleri · Net Kasa = Giriş − Çıkış
            </p>
          </div>

          {/* Section 3 — Personel Sıralaması */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-hub-accent" />
              <h2 className="font-semibold text-hub-primary">Personel Sıralaması</h2>
            </div>
            {data.leaderboard.length === 0 ? (
              <p className="text-sm text-hub-muted text-center py-8">
                Bu dönemde kayıt bulunamadı.
              </p>
            ) : (
              <div className="rounded-xl overflow-hidden border border-hub-border/40">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-hub-bg/60 border-b border-hub-border/40">
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold text-hub-secondary uppercase tracking-[0.8px] w-10">
                        #
                      </th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold text-hub-secondary uppercase tracking-[0.8px]">
                        Personel
                      </th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-bold text-hub-secondary uppercase tracking-[0.8px]">
                        Perakende Ciro
                      </th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-bold text-hub-secondary uppercase tracking-[0.8px] w-24">
                        İşlem
                      </th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-bold text-hub-secondary uppercase tracking-[0.8px] w-28">
                        B2B Sipariş
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leaderboard.map((row) => (
                      <tr
                        key={row.employee_username}
                        className={`border-b border-hub-border/20 last:border-0 transition-colors ${
                          row.rank === 1
                            ? "bg-hub-accent/5"
                            : "hover:bg-hub-bg/30"
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-hub-secondary">
                          {row.rank === 1 ? (
                            <span className="text-hub-accent">1</span>
                          ) : (
                            row.rank
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-hub-primary">
                          {row.employee_username}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-hub-accent">
                          {row.retail_revenue > 0
                            ? fmt(row.retail_revenue)
                            : <span className="text-hub-muted font-normal">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-hub-secondary">
                          {fmtInt(row.retail_transaction_count)}
                        </td>
                        <td className="px-4 py-3 text-right text-hub-secondary">
                          {fmtInt(row.b2b_order_count)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 4 — Ürün Performansı */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-hub-accent" />
                <h2 className="font-semibold text-hub-primary">Ürün Performansı</h2>
              </div>
              <span className="text-xs text-hub-muted">
                Satış adedine göre Top 20
              </span>
            </div>
            {data.products.length === 0 ? (
              <p className="text-sm text-hub-muted text-center py-8">
                Bu dönemde satış bulunamadı.
              </p>
            ) : (
              <div className="rounded-xl overflow-hidden border border-hub-border/40">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-hub-bg/60 border-b border-hub-border/40">
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold text-hub-secondary uppercase tracking-[0.8px] w-10">
                        #
                      </th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold text-hub-secondary uppercase tracking-[0.8px]">
                        Ürün
                      </th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold text-hub-secondary uppercase tracking-[0.8px] w-28 hidden sm:table-cell">
                        Marka
                      </th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-bold text-hub-secondary uppercase tracking-[0.8px] w-20">
                        Adet
                      </th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-bold text-hub-secondary uppercase tracking-[0.8px] w-28">
                        Ciro
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.map((p, idx) => (
                      <tr
                        key={`${p.product_id}:${p.variation_label ?? ""}`}
                        className="border-b border-hub-border/20 last:border-0 hover:bg-hub-bg/20 transition-colors"
                      >
                        <td className="px-4 py-3 text-xs text-hub-muted">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <div>
                              <p className="font-medium text-hub-primary">
                                {p.product_name}
                              </p>
                              {p.variation_label && (
                                <p className="text-xs text-hub-secondary mt-0.5">
                                  {p.variation_label}
                                </p>
                              )}
                            </div>
                            {p.return_count > 0 && (
                              <span className="flex-shrink-0 mt-0.5 text-[9px] text-hub-error bg-red-50 px-1.5 py-0.5 rounded-full font-semibold">
                                {p.return_count} iade
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-hub-secondary hidden sm:table-cell">
                          {p.brand_name || (
                            <span className="text-hub-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-hub-primary">
                          {fmtInt(p.units_sold)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-hub-accent">
                          {fmt(p.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state — no data yet */}
      {!loading && !data && !error && (
        <div className="card p-14 text-center">
          <TrendingUp className="w-12 h-12 text-hub-muted mx-auto mb-4" />
          <p className="text-hub-secondary font-medium">
            Tarih aralığı seçin ve Getir&apos;e tıklayın.
          </p>
        </div>
      )}
    </div>
  );
}
