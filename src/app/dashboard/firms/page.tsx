"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Building2,
  X,
  Check,
  ArrowLeft,
  Lock,
  Unlock,
  ChevronRight,
  ShoppingCart,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface FirmWithCount {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_number: string | null;
  tax_office: string | null;
  is_locked: boolean;
  lock_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sale_count: number;
}

interface FormData {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  tax_number: string;
  tax_office: string;
  notes: string;
}

const EMPTY_FORM: FormData = {
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  tax_number: "",
  tax_office: "",
  notes: "",
};

export default function FirmsPage() {
  const [firms, setFirms] = useState<FirmWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FirmWithCount | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Lock modal
  const [lockingFirm, setLockingFirm] = useState<FirmWithCount | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [lockProcessing, setLockProcessing] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchFirms = useCallback(async () => {
    try {
      const res = await fetch("/api/firms", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.firms) setFirms(data.firms);
    } catch (err) {
      console.error("Failed to fetch firms:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFirms();
  }, [fetchFirms]);

  function openCreate() {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(firm: FirmWithCount) {
    setEditing(firm);
    setFormData({
      name: firm.name,
      contact_person: firm.contact_person || "",
      phone: firm.phone || "",
      email: firm.email || "",
      address: firm.address || "",
      tax_number: firm.tax_number || "",
      tax_office: firm.tax_office || "",
      notes: firm.notes || "",
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
      setFormError("Firm name is required");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const url = editing ? `/api/firms/${editing.id}` : "/api/firms";
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
      fetchFirms();
    } catch {
      setFormError("Something went wrong");
    }
    setSaving(false);
  }

  async function handleDelete(firm: FirmWithCount) {
    if (firm.sale_count > 0) {
      alert(
        `Cannot delete "${firm.name}" — it has ${firm.sale_count} sale records. Lock it instead.`
      );
      return;
    }
    if (!confirm(`Delete firm "${firm.name}"?`)) return;

    setDeletingId(firm.id);
    try {
      const res = await fetch(`/api/firms/${firm.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Delete failed");
      } else {
        fetchFirms();
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
    setDeletingId(null);
  }

  async function handleLockToggle(firm: FirmWithCount) {
    if (firm.is_locked) {
      // Unlock directly
      setLockProcessing(true);
      try {
        await fetch(`/api/firms/${firm.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unlock" }),
        });
        fetchFirms();
      } catch (err) {
        console.error("Unlock failed:", err);
      }
      setLockProcessing(false);
    } else {
      // Show lock modal
      setLockingFirm(firm);
      setLockReason("");
    }
  }

  async function confirmLock() {
    if (!lockingFirm) return;
    setLockProcessing(true);
    try {
      await fetch(`/api/firms/${lockingFirm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lock",
          lock_reason: lockReason.trim() || "Payment issue",
        }),
      });
      setLockingFirm(null);
      fetchFirms();
    } catch (err) {
      console.error("Lock failed:", err);
    }
    setLockProcessing(false);
  }

  const filtered = firms.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const lockedCount = firms.filter((f) => f.is_locked).length;

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
          <h1 className="text-2xl font-semibold text-hub-primary">Firms</h1>
          <p className="text-sm text-hub-secondary mt-0.5">
            {firms.length} firm{firms.length !== 1 ? "s" : ""}
            {lockedCount > 0 && (
              <span className="text-hub-error ml-1">
                · {lockedCount} locked
              </span>
            )}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Firm
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
          placeholder="Search firms..."
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
                  {editing ? "Edit Firm" : "New Firm"}
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
                <div className="sm:col-span-2">
                  <label className="label-base">Firm Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, name: e.target.value }))
                    }
                    className="input-base"
                    placeholder="e.g. Dorlion, ABC Makina..."
                    autoFocus
                  />
                </div>

                <div>
                  <label className="label-base">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        contact_person: e.target.value,
                      }))
                    }
                    className="input-base"
                    placeholder="Name"
                  />
                </div>

                <div>
                  <label className="label-base">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, phone: e.target.value }))
                    }
                    className="input-base"
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label className="label-base">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, email: e.target.value }))
                    }
                    className="input-base"
                    placeholder="Email"
                  />
                </div>

                <div>
                  <label className="label-base">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, address: e.target.value }))
                    }
                    className="input-base"
                    placeholder="Address"
                  />
                </div>

                <div>
                  <label className="label-base">Tax Number (VKN)</label>
                  <input
                    type="text"
                    value={formData.tax_number}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, tax_number: e.target.value }))
                    }
                    className="input-base"
                    placeholder="Tax number"
                  />
                </div>

                <div>
                  <label className="label-base">Tax Office</label>
                  <input
                    type="text"
                    value={formData.tax_office}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, tax_office: e.target.value }))
                    }
                    className="input-base"
                    placeholder="Tax office"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="label-base">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, notes: e.target.value }))
                    }
                    className="input-base min-h-[60px] resize-y"
                    placeholder="Internal notes..."
                  />
                </div>
              </div>

              {formError && (
                <p className="text-xs text-hub-error">{formError}</p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="btn-secondary"
                >
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

      {/* Firms List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-hub-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-10 h-10 text-hub-muted/40 mx-auto mb-3" />
          <p className="text-hub-secondary">
            {search ? "No firms match your search" : "No firms yet"}
          </p>
          {!search && (
            <button
              onClick={openCreate}
              className="text-sm text-hub-accent hover:text-hub-accent-hover mt-2 font-medium"
            >
              Add your first firm
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((firm) => (
            <motion.div
              key={firm.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card overflow-hidden transition-all duration-300 group ${
                firm.is_locked
                  ? "border-hub-error/30 bg-hub-error/[0.02]"
                  : "hover:shadow-hub-md"
              }`}
            >
              <div className="p-4 flex items-center gap-4">
                {/* Icon */}
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    firm.is_locked
                      ? "bg-hub-error/10"
                      : "bg-hub-accent/10"
                  }`}
                >
                  {firm.is_locked ? (
                    <Lock className="w-5 h-5 text-hub-error" />
                  ) : (
                    <Building2 className="w-5 h-5 text-hub-accent" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-[15px] font-semibold truncate ${
                        firm.is_locked
                          ? "text-hub-error/80"
                          : "text-hub-primary"
                      }`}
                    >
                      {firm.name}
                    </h3>
                    {firm.is_locked && (
                      <span className="text-[9px] font-semibold uppercase text-hub-error bg-hub-error/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        Locked
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-hub-secondary">
                      <ShoppingCart className="w-3 h-3 text-hub-muted" />
                      {firm.sale_count} sale{firm.sale_count !== 1 ? "s" : ""}
                    </span>
                    {firm.contact_person && (
                      <span className="text-xs text-hub-muted truncate max-w-[150px]">
                        {firm.contact_person}
                      </span>
                    )}
                    {firm.phone && (
                      <span className="text-xs text-hub-muted truncate max-w-[120px]">
                        {firm.phone}
                      </span>
                    )}
                  </div>
                  {firm.is_locked && firm.lock_reason && (
                    <p className="text-[11px] text-hub-error/70 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {firm.lock_reason}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleLockToggle(firm)}
                    disabled={lockProcessing}
                    className={`p-1.5 rounded-lg transition-colors ${
                      firm.is_locked
                        ? "text-hub-success hover:text-hub-success hover:bg-hub-success/10"
                        : "text-hub-secondary hover:text-hub-error hover:bg-hub-error/5"
                    }`}
                    title={firm.is_locked ? "Unlock firm" : "Lock firm"}
                  >
                    {firm.is_locked ? (
                      <Unlock className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(firm)}
                    className="p-1.5 text-hub-secondary hover:text-hub-primary rounded-lg hover:bg-hub-bg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(firm)}
                    disabled={deletingId === firm.id}
                    className="p-1.5 text-hub-secondary hover:text-hub-error rounded-lg hover:bg-hub-error/5 transition-colors"
                    title="Delete"
                  >
                    {deletingId === firm.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <Link
                    href={`/dashboard/firms/${firm.id}`}
                    className="p-1.5 text-hub-secondary hover:text-hub-accent rounded-lg hover:bg-hub-accent/5 transition-colors"
                    title="View details & sales"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Lock Confirmation Modal */}
      <AnimatePresence>
        {lockingFirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLockingFirm(null)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[80]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-hub-lg z-[90] p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-hub-error/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-hub-error" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-hub-primary">
                    Lock Firm
                  </h3>
                  <p className="text-xs text-hub-secondary">
                    {lockingFirm.name}
                  </p>
                </div>
              </div>

              <p className="text-sm text-hub-secondary">
                Locked firms cannot receive any B2B orders. Employees will see a
                warning and won&apos;t be able to create sales for this firm.
              </p>

              <div>
                <label className="label-base">Reason (optional)</label>
                <input
                  type="text"
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  className="input-base"
                  placeholder="e.g. Missed payment, overdue balance..."
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setLockingFirm(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLock}
                  disabled={lockProcessing}
                  className="flex-1 py-3 px-6 bg-hub-error hover:bg-hub-error/90 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {lockProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  Lock Firm
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}