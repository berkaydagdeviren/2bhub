"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Truck,
  Clock,
  Package,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

interface Supplier {
  id: string;
  name: string;
  contact_info: string | null;
  vade_days: number;
  notes: string | null;
}

interface CurrentProduct {
  id: string;
  name: string;
  image_url: string | null;
  list_price: number;
  discount_percent: number;
  currency: string;
  netsis_code?: string | null;
  brand?: { name: string } | null;
}

interface ProductLink {
  id: string;
  product_id: string;
  list_price: number;
  discount_percent: number;
  is_current: boolean;
  notes: string | null;
  product: { id: string; name: string; image_url: string | null } | null;
}

export default function SupplierDetailPage() {
  const params = useParams();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [currentProducts, setCurrentProducts] = useState<CurrentProduct[]>([]);
  const [allLinks, setAllLinks] = useState<ProductLink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/suppliers/${supplierId}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.supplier) setSupplier(data.supplier);
      if (data.current_products) setCurrentProducts(data.current_products);
      if (data.all_product_links) setAllLinks(data.all_product_links);
    } catch (err) {
      console.error("Failed to fetch supplier:", err);
    }
    setLoading(false);
  }, [supplierId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currencySymbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-hub-muted" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="card p-12 text-center">
        <Truck className="w-10 h-10 text-hub-muted/40 mx-auto mb-3" />
        <p className="text-hub-secondary">Tedarikçi bulunamadı.</p>
        <Link
          href="/dashboard/suppliers"
          className="text-sm text-hub-accent mt-2 font-medium inline-block"
        >
          Tedarikçilere dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/suppliers"
          className="p-2 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-hub-primary truncate">
            {supplier.name}
          </h1>
          {supplier.vade_days > 0 && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-hub-warning bg-hub-warning/10 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              {supplier.vade_days} gün vade
            </span>
          )}
        </div>
      </div>

      {/* Info card */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-hub-primary uppercase tracking-wider mb-4 flex items-center gap-2">
          <Truck className="w-4 h-4 text-hub-accent" />
          Tedarikçi Bilgisi
        </h2>
        <div className="space-y-3">
          {supplier.contact_info && (
            <div className="flex justify-between text-sm">
              <span className="text-hub-secondary">İletişim</span>
              <span className="text-hub-primary font-medium text-right max-w-xs whitespace-pre-wrap">
                {supplier.contact_info}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-hub-secondary">Vade</span>
            <span className="text-hub-primary font-medium">
              {supplier.vade_days > 0 ? `${supplier.vade_days} gün` : "Peşin"}
            </span>
          </div>
          {supplier.notes && (
            <div className="flex justify-between text-sm">
              <span className="text-hub-secondary flex-shrink-0 mr-4">Notlar</span>
              <span className="text-hub-primary font-medium text-right whitespace-pre-wrap">
                {supplier.notes}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Current Products */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-hub-primary uppercase tracking-wider mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-hub-accent" />
          Aktif Ürünler
          <span className="text-[10px] font-semibold text-hub-accent bg-hub-accent/10 px-2 py-0.5 rounded-full">
            {currentProducts.length}
          </span>
        </h2>

        {currentProducts.length === 0 ? (
          <p className="text-sm text-hub-muted text-center py-6">
            Bu tedarikçiye bağlı aktif ürün yok.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hub-border/30">
                  <th className="text-left py-2 pr-3 text-[10px] font-semibold text-hub-secondary uppercase tracking-wider">
                    Ürün
                  </th>
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-hub-secondary uppercase tracking-wider">
                    Liste Fiyatı
                  </th>
                  <th className="text-right py-2 pl-3 text-[10px] font-semibold text-hub-secondary uppercase tracking-wider">
                    İskonto
                  </th>
                  <th className="py-2 pl-3" />
                </tr>
              </thead>
              <tbody>
                {currentProducts.map((p) => {
                  const sym = currencySymbols[p.currency] || "₺";
                  return (
                    <tr key={p.id} className="border-b border-hub-border/20 last:border-0 hover:bg-hub-bg/30 transition-colors">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-hub-bg overflow-hidden flex-shrink-0">
                            {p.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-3.5 h-3.5 text-hub-muted/40" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-hub-primary">{p.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-hub-primary">
                        {sym}{Number(p.list_price).toFixed(2)}
                      </td>
                      <td className="py-3 pl-3 text-right text-hub-secondary">
                        {Number(p.discount_percent) > 0
                          ? `%${p.discount_percent}`
                          : "—"}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <Link
                          href={`/dashboard/products/${p.id}`}
                          className="inline-flex items-center gap-1 text-[11px] text-hub-accent hover:text-hub-accent-hover"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Supplier Links */}
      {allLinks.length > 0 && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-hub-primary uppercase tracking-wider mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4 text-hub-accent" />
            Tüm Ürün Bağlantıları
            <span className="text-[10px] font-semibold text-hub-accent bg-hub-accent/10 px-2 py-0.5 rounded-full">
              {allLinks.length}
            </span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hub-border/30">
                  <th className="text-left py-2 pr-3 text-[10px] font-semibold text-hub-secondary uppercase tracking-wider">
                    Ürün
                  </th>
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-hub-secondary uppercase tracking-wider">
                    Liste Fiyatı
                  </th>
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-hub-secondary uppercase tracking-wider">
                    İskonto
                  </th>
                  <th className="text-center py-2 px-3 text-[10px] font-semibold text-hub-secondary uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="text-left py-2 pl-3 text-[10px] font-semibold text-hub-secondary uppercase tracking-wider">
                    Not
                  </th>
                </tr>
              </thead>
              <tbody>
                {allLinks.map((link) => (
                  <tr
                    key={link.id}
                    className={`border-b border-hub-border/20 last:border-0 hover:bg-hub-bg/30 transition-colors ${
                      link.is_current ? "bg-hub-accent/5" : ""
                    }`}
                  >
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        {link.product ? (
                          <Link
                            href={`/dashboard/products/${link.product.id}`}
                            className="font-medium text-hub-primary hover:text-hub-accent transition-colors"
                          >
                            {link.product.name}
                          </Link>
                        ) : (
                          <span className="text-hub-muted">Silinmiş ürün</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-hub-primary">
                      ₺{Number(link.list_price).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-hub-secondary">
                      {Number(link.discount_percent) > 0
                        ? `%${link.discount_percent}`
                        : "—"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {link.is_current ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-hub-success bg-hub-success/10 px-1.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Aktif
                        </span>
                      ) : (
                        <span className="text-[9px] text-hub-muted">—</span>
                      )}
                    </td>
                    <td className="py-3 pl-3 text-hub-secondary text-xs">
                      {link.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
