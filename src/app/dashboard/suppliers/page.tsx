"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Truck,
  Package,
  X,
  Check,
  ArrowLeft,
  Clock,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import type { Supplier } from "@/types";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_info: "",
    vade_days: 0,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/suppliers", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.suppliers) setSuppliers(data.suppliers);
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  function openCreate() {
    setEditing(null);
    setFormData({ name: "", contact_info: "", vade_days: 0, notes: "" });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setFormData({
      name: supplier.name,
      contact_info: supplier.contact_info || "",
      vade_days: supplier.vade_days || 0,
      notes: supplier.notes || "",
    });
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setFormError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Supplier name is required");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const url = editing
        ? `/api/suppliers/${editing.id}`
        : "/api/suppliers";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Something went wrong");
        setSaving(false);
        return;
      }

      closeForm();
      fetchSuppliers();
    } catch {
      setFormError("Something went wrong");
    }
    setSaving(false);
  }

  async function handleDelete(supplier: Supplier) {
    if (supplier.product_count && supplier.product_count > 0) {
      if (
        !confirm(
          `"${supplier.name}" supplies ${supplier.product_count} product(s). Products will lose their supplier assignment. Continue?`
        )
      )
        return;
    } else {
      if (!confirm(`Delete supplier "${supplier.name}"?`)) return;
    }

    setDeletingId(supplier.id);
    try {
      await fetch(`/api/suppliers/${supplier.id}`, { method: "DELETE" });
      fetchSuppliers();
    } catch (err) {
      console.error("Delete failed:", err);
    }
    setDeletingId(null);
  }

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="text-2xl font-semibold text-hub-primary">Suppliers</h1>
          <p className="text-sm text-hub-secondary mt-0.5">
            {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Supplier
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
          placeholder="Search suppliers..."
        />
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-hub-primary">
                  {editing ? "Edit Supplier" : "New Supplier"}
                </h3>
                <button
                  type="button"
                  onClick={closeForm}
                  className="p-1.5 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="label-base">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, name: e.target.value }))
                    }
                    className="input-base"
                    placeholder="e.g. Metar, Özipekler..."
                    autoFocus
                  />
                </div>

                {/* Vade Days */}
                <div>
                  <label className="label-base">Vade (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.vade_days || ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        vade_days: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="input-base"
                    placeholder="0"
                  />
                </div>

                {/* Contact */}
                <div>
                  <label className="label-base">Contact Info</label>
                  <input
                    type="text"
                    value={formData.contact_info}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, contact_info: e.target.value }))
                    }
                    className="input-base"
                    placeholder="Phone, email, address..."
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="label-base">Notes</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, notes: e.target.value }))
                    }
                    className="input-base"
                    placeholder="Internal notes..."
                  />
                </div>
              </div>

              {formError && (
                <p className="text-xs text-hub-error">{formError}</p>
              )}

              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeForm} className="btn-secondary">
                  Cancel
                </button>
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
                  {editing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Supplier List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-hub-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Truck className="w-10 h-10 text-hub-muted/40 mx-auto mb-3" />
          <p className="text-hub-secondary">
            {search ? "No suppliers match your search" : "No suppliers yet"}
          </p>
          {!search && (
            <button
              onClick={openCreate}
              className="text-sm text-hub-accent hover:text-hub-accent-hover mt-2 font-medium"
            >
              Add your first supplier
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((supplier) => (
            <motion.div
              key={supplier.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-4 hover:shadow-hub-md transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="w-11 h-11 rounded-xl bg-hub-accent/10 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5 text-hub-accent" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-hub-primary truncate">
                      {supplier.name}
                    </h3>
                    {supplier.vade_days > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-hub-warning bg-hub-warning/10 px-2 py-0.5 rounded-full flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {supplier.vade_days}d vade
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-hub-secondary">
                      <Package className="w-3 h-3 text-hub-muted" />
                      {supplier.product_count || 0} product
                      {supplier.product_count !== 1 ? "s" : ""}
                    </span>
                    {supplier.contact_info && (
                      <span className="text-xs text-hub-muted truncate max-w-[200px]">
                        {supplier.contact_info}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(supplier)}
                    className="p-1.5 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier)}
                    disabled={deletingId === supplier.id}
                    className="p-1.5 text-hub-secondary hover:text-hub-error rounded-lg hover:bg-hub-error/5 transition-colors"
                    title="Delete"
                  >
                    {deletingId === supplier.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <Link
                    href={`/dashboard/suppliers/${supplier.id}`}
                    className="p-1.5 text-hub-secondary hover:text-hub-accent rounded-lg hover:bg-hub-accent/5 transition-colors"
                    title="View details"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Notes row */}
              {supplier.notes && (
                <p className="text-xs text-hub-muted mt-2 pl-15 ml-[60px]">
                  {supplier.notes}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}