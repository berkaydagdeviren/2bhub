"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Tag,
  Package,
  X,
  Check,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import type { Brand } from "@/types";

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create / Edit state
  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formName, setFormName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch("/api/brands", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.brands) setBrands(data.brands);
    } catch (err) {
      console.error("Failed to fetch brands:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  function openCreate() {
    setEditingBrand(null);
    setFormName("");
    setFormError("");
    setShowForm(true);
  }

  function openEdit(brand: Brand) {
    setEditingBrand(brand);
    setFormName(brand.name);
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingBrand(null);
    setFormName("");
    setFormError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Brand name is required");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const url = editingBrand
        ? `/api/brands/${editingBrand.id}`
        : "/api/brands";
      const method = editingBrand ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Something went wrong");
        setSaving(false);
        return;
      }

      closeForm();
      fetchBrands();
    } catch {
      setFormError("Something went wrong");
    }
    setSaving(false);
  }

  async function handleDelete(brand: Brand) {
    if (brand.product_count && brand.product_count > 0) {
      if (
        !confirm(
          `"${brand.name}" has ${brand.product_count} product(s). Products will lose their brand assignment. Continue?`
        )
      )
        return;
    } else {
      if (!confirm(`Delete brand "${brand.name}"?`)) return;
    }

    setDeletingId(brand.id);
    try {
      await fetch(`/api/brands/${brand.id}`, { method: "DELETE" });
      fetchBrands();
    } catch (err) {
      console.error("Delete failed:", err);
    }
    setDeletingId(null);
  }

  const filtered = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalProducts = brands.reduce(
    (sum, b) => sum + (b.product_count || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-hub-primary">Brands</h1>
          <p className="text-sm text-hub-secondary mt-0.5">
            {brands.length} brand{brands.length !== 1 ? "s" : ""} &middot;{" "}
            {totalProducts} total product{totalProducts !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Brand
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-hub-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base pl-11"
          placeholder="Search brands..."
        />
      </div>

      {/* Create / Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSubmit}
              className="card p-5 flex items-end gap-3"
            >
              <div className="flex-1">
                <label className="label-base">
                  {editingBrand ? "Edit Brand Name" : "New Brand Name"}
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input-base"
                  placeholder="e.g. Bosch, Makita, Somafix..."
                  autoFocus
                />
                {formError && (
                  <p className="text-xs text-hub-error mt-1.5">{formError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {editingBrand ? "Update" : "Create"}
              </button>
              <button type="button" onClick={closeForm} className="btn-secondary">
                <X className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brand List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-hub-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Tag className="w-10 h-10 text-hub-muted/40 mx-auto mb-3" />
          <p className="text-hub-secondary">
            {search ? "No brands match your search" : "No brands yet"}
          </p>
          {!search && (
            <button
              onClick={openCreate}
              className="text-sm text-hub-accent hover:text-hub-accent-hover mt-2 font-medium"
            >
              Create your first brand
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((brand) => (
            <motion.div
              key={brand.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card p-4 flex items-center gap-4 group hover:shadow-hub-md transition-all duration-300"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-hub-accent/10 flex items-center justify-center flex-shrink-0">
                <Tag className="w-4 h-4 text-hub-accent" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-hub-primary truncate">
                  {brand.name}
                </h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <Package className="w-3 h-3 text-hub-muted" />
                  <span className="text-xs text-hub-secondary">
                    {brand.product_count || 0} product
                    {brand.product_count !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(brand)}
                  className="p-1.5 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(brand)}
                  disabled={deletingId === brand.id}
                  className="p-1.5 text-hub-secondary hover:text-hub-error rounded-lg hover:bg-hub-error/5 transition-colors"
                  title="Delete"
                >
                  {deletingId === brand.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}