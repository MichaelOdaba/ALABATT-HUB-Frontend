import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Dumbbell,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../auth/useAuth.js";
import {
  getEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  createEquipmentLoan,
} from "../../services/bookingsAPI.js";
import { formatNaira } from "../reports/reportsUtils.js";

// ─── Helpers ──────────────────────────────────────────────
function extractList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

// ─── Toast ────────────────────────────────────────────────
function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => onDismiss(), 5000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);
  if (!toast) return null;
  return (
    <div className={`mp-toast mp-toast--${toast.type}`} role="alert" aria-live="assertive">
      {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      <span>{toast.message}</span>
      <button className="mp-toast-close" onClick={onDismiss} type="button" aria-label="Dismiss"><X size={14} /></button>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────
function ConfirmDialog({ open, title, description, onConfirm, onCancel, busy }) {
  if (!open) return null;
  return (
    <div className="mp-overlay" role="dialog" aria-modal="true" aria-labelledby="eq-confirm-title">
      <div className="mp-modal mp-modal--sm">
        <h2 className="mp-modal-title" id="eq-confirm-title">{title}</h2>
        <p className="mp-modal-body">{description}</p>
        <div className="mp-modal-actions">
          <button className="mp-btn mp-btn--ghost" onClick={onCancel} disabled={busy} type="button">Cancel</button>
          <button className="mp-btn mp-btn--danger" onClick={onConfirm} disabled={busy} type="button">
            {busy && <Loader2 size={14} className="mp-spin" aria-hidden="true" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Loan Request Dialog ──────────────────────────────────
function LoanRequestDialog({ open, equipment, onClose, onSuccess }) {
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    if (open) { setQty(1); setServerError(null); }
  }, [open]);

  async function handleConfirm() {
    setSubmitting(true);
    setServerError(null);
    try {
      await createEquipmentLoan({ equipment: equipment.id, quantity: qty });
      onSuccess();
    } catch (err) {
      setServerError(err.message || "Failed to request loan.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !equipment) return null;

  const maxQty = equipment.available_quantity ?? equipment.quantity ?? 1;

  return (
    <div className="mp-overlay" role="dialog" aria-modal="true" aria-labelledby="loan-req-title">
      <div className="mp-modal mp-modal--sm">
        <div className="mp-modal-header">
          <h2 className="mp-modal-title" id="loan-req-title">Request Loan</h2>
          <button className="mp-modal-close" onClick={onClose} type="button" aria-label="Close" disabled={submitting}><X size={18} /></button>
        </div>
        <p className="mp-modal-body">
          Requesting: <strong>{equipment.name}</strong>
        </p>
        {equipment.deposit_amount != null && (
          <p className="mp-notice">Deposit required: <strong>{formatNaira(equipment.deposit_amount)}</strong></p>
        )}
        <div className="mp-field">
          <label className="mp-label" htmlFor="loan-qty">Quantity</label>
          <input
            id="loan-qty"
            className="mp-input"
            type="number"
            min="1"
            max={maxQty}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value))))}
          />
        </div>
        {serverError && (
          <div className="mp-form-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" /> {serverError}
          </div>
        )}
        <div className="mp-modal-actions">
          <button className="mp-btn mp-btn--ghost" onClick={onClose} disabled={submitting} type="button">Cancel</button>
          <button className="mp-btn mp-btn--primary" onClick={handleConfirm} disabled={submitting} type="button">
            {submitting && <Loader2 size={14} className="mp-spin" aria-hidden="true" />}
            Request loan
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Equipment Form Modal ─────────────────────────────────
const EMPTY_FORM = {
  name: "", description: "", category: "", total_quantity: "",
  available_quantity: "", deposit_amount: "", condition: "", is_available: true,
};

const CONDITIONS = ["excellent", "good", "fair", "poor"];

function EquipmentFormModal({ open, equipment, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const firstRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (equipment) {
      setForm({
        name: equipment.name ?? "",
        description: equipment.description ?? "",
        category: equipment.category ?? "",
        total_quantity: equipment.total_quantity ?? equipment.quantity ?? "",
        available_quantity: equipment.available_quantity ?? "",
        deposit_amount: equipment.deposit_amount ?? "",
        condition: equipment.condition ?? "",
        is_available: equipment.is_available ?? true,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setServerError(null);
    setTimeout(() => firstRef.current?.focus(), 60);
  }, [open, equipment]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required.";
    const checkQty = (f, label) => {
      if (form[f] !== "" && (!Number.isInteger(Number(form[f])) || Number(form[f]) < 0))
        e[f] = `${label} must be a non-negative integer.`;
    };
    checkQty("total_quantity", "Total quantity");
    checkQty("available_quantity", "Available quantity");
    if (form.deposit_amount !== "" && (Number.isNaN(Number(form.deposit_amount)) || Number(form.deposit_amount) < 0))
      e.deposit_amount = "Must be a non-negative number.";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      total_quantity: form.total_quantity !== "" ? Number(form.total_quantity) : null,
      available_quantity: form.available_quantity !== "" ? Number(form.available_quantity) : null,
      deposit_amount: form.deposit_amount !== "" ? Number(form.deposit_amount) : null,
      condition: form.condition || null,
      is_available: form.is_available,
    };

    setSubmitting(true);
    setServerError(null);
    try {
      if (equipment?.id) {
        await updateEquipment(equipment.id, payload);
      } else {
        await createEquipment(payload);
      }
      onSaved();
    } catch (err) {
      setServerError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="mp-overlay" role="dialog" aria-modal="true" aria-labelledby="eq-form-title">
      <div className="mp-modal mp-modal--lg">
        <div className="mp-modal-header">
          <h2 className="mp-modal-title" id="eq-form-title">{equipment ? "Edit Equipment" : "Add Equipment"}</h2>
          <button className="mp-modal-close" onClick={onClose} type="button" aria-label="Close" disabled={submitting}><X size={18} /></button>
        </div>

        {serverError && (
          <div className="mp-form-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" /> {serverError}
          </div>
        )}

        <form className="mp-form" onSubmit={handleSubmit} noValidate>
          <div className="mp-field">
            <label className="mp-label" htmlFor="eq-name">
              Name <span className="mp-required" aria-hidden="true">*</span>
            </label>
            <input
              ref={firstRef}
              id="eq-name"
              className={`mp-input${errors.name ? " mp-input--err" : ""}`}
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
            {errors.name && <span className="mp-field-err">{errors.name}</span>}
          </div>

          <div className="mp-field">
            <label className="mp-label" htmlFor="eq-desc">Description</label>
            <textarea
              id="eq-desc"
              className="mp-input mp-textarea"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
            />
          </div>

          <div className="mp-field-row">
            <div className="mp-field">
              <label className="mp-label" htmlFor="eq-category">Category</label>
              <input
                id="eq-category"
                className="mp-input"
                type="text"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="e.g. weights, cardio"
              />
            </div>
            <div className="mp-field">
              <label className="mp-label" htmlFor="eq-condition">Condition</label>
              <div className="mp-select-wrap">
                <select
                  id="eq-condition"
                  className="mp-input mp-select"
                  value={form.condition}
                  onChange={(e) => set("condition", e.target.value)}
                >
                  <option value="">— Select —</option>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
                <span className="mp-select-arrow" aria-hidden="true">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          <div className="mp-field-row">
            <div className="mp-field">
              <label className="mp-label" htmlFor="eq-total">Total quantity</label>
              <input
                id="eq-total"
                className={`mp-input${errors.total_quantity ? " mp-input--err" : ""}`}
                type="number" min="0" step="1"
                value={form.total_quantity}
                onChange={(e) => set("total_quantity", e.target.value)}
              />
              {errors.total_quantity && <span className="mp-field-err">{errors.total_quantity}</span>}
            </div>
            <div className="mp-field">
              <label className="mp-label" htmlFor="eq-avail-qty">Available quantity</label>
              <input
                id="eq-avail-qty"
                className={`mp-input${errors.available_quantity ? " mp-input--err" : ""}`}
                type="number" min="0" step="1"
                value={form.available_quantity}
                onChange={(e) => set("available_quantity", e.target.value)}
              />
              {errors.available_quantity && <span className="mp-field-err">{errors.available_quantity}</span>}
            </div>
          </div>

          <div className="mp-field-row">
            <div className="mp-field">
              <label className="mp-label" htmlFor="eq-deposit">Deposit (₦)</label>
              <input
                id="eq-deposit"
                className={`mp-input${errors.deposit_amount ? " mp-input--err" : ""}`}
                type="number" min="0" step="0.01"
                value={form.deposit_amount}
                onChange={(e) => set("deposit_amount", e.target.value)}
              />
              {errors.deposit_amount && <span className="mp-field-err">{errors.deposit_amount}</span>}
            </div>
            <div className="mp-field" style={{ justifyContent: "flex-end" }}>
              <label className="mp-check-label" htmlFor="eq-is-avail" style={{ marginTop: 22 }}>
                <input
                  id="eq-is-avail"
                  type="checkbox"
                  className="mp-checkbox"
                  checked={form.is_available}
                  onChange={(e) => set("is_available", e.target.checked)}
                />
                Available for loan
              </label>
            </div>
          </div>

          <div className="mp-modal-actions">
            <button className="mp-btn mp-btn--ghost" type="button" onClick={onClose} disabled={submitting}>Cancel</button>
            <button className="mp-btn mp-btn--primary" type="submit" disabled={submitting}>
              {submitting && <Loader2 size={14} className="mp-spin" aria-hidden="true" />}
              {equipment ? "Save changes" : "Add equipment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Equipment Card ───────────────────────────────────────
function EquipmentCard({ item, isManager, onLoanRequest, onEdit, onDelete }) {
  const availQty = item.available_quantity ?? item.quantity;
  const totalQty = item.total_quantity;
  const canLoan = item.is_available !== false && (availQty == null || availQty > 0);

  const conditionColor = {
    excellent: "success", good: "success", fair: "warning", poor: "danger",
  }[item.condition?.toLowerCase()] ?? "neutral";

  return (
    <article className="eq-card" aria-label={`${item.name} equipment`}>
      <div className="eq-card-header">
        <div className="eq-card-icon" aria-hidden="true">
          <Dumbbell size={20} />
        </div>
        <div className="eq-card-meta">
          {item.category && <span className="eq-card-category">{item.category}</span>}
          {item.condition && (
            <span className={`status-chip status-chip-${conditionColor}`}>
              {item.condition}
            </span>
          )}
        </div>
      </div>

      <h3 className="eq-card-name">{item.name}</h3>
      {item.description && <p className="eq-card-desc">{item.description}</p>}

      <div className="eq-card-stats">
        {availQty != null && (
          <div className="eq-card-stat">
            <span>Available</span>
            <strong>{availQty}{totalQty != null ? ` / ${totalQty}` : ""}</strong>
          </div>
        )}
        {item.deposit_amount != null && (
          <div className="eq-card-stat">
            <span>Deposit</span>
            <strong>{formatNaira(item.deposit_amount)}</strong>
          </div>
        )}
      </div>

      <div className="eq-card-actions">
        {isManager ? (
          <>
            <button
              className="mp-btn mp-btn--ghost mp-btn--sm"
              type="button"
              onClick={() => onEdit(item)}
              aria-label={`Edit ${item.name}`}
            >
              <Pencil size={13} aria-hidden="true" /> Edit
            </button>
            <button
              className="mp-btn mp-btn--ghost-danger mp-btn--sm"
              type="button"
              onClick={() => onDelete(item)}
              aria-label={`Delete ${item.name}`}
            >
              <Trash2 size={13} aria-hidden="true" /> Delete
            </button>
          </>
        ) : (
          <button
            className="mp-btn mp-btn--primary"
            style={{ width: "100%" }}
            type="button"
            onClick={() => onLoanRequest(item)}
            disabled={!canLoan}
          >
            {canLoan ? "Request Loan" : "Unavailable"}
          </button>
        )}
      </div>
    </article>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function EquipmentPage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loanTarget, setLoanTarget] = useState(null);

  const fetchRef = useRef(false);

  const loadData = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await getEquipment();
      setEquipment(extractList(data));
    } catch (err) {
      setError(err.message || "Failed to load equipment.");
    } finally {
      setLoading(false);
      fetchRef.current = false;
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function showToast(type, message) { setToast({ type, message }); }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEquipment(deleteTarget.id);
      setDeleteTarget(null);
      showToast("success", `"${deleteTarget.name}" deleted.`);
      await loadData();
    } catch (err) {
      setDeleteTarget(null);
      showToast("error", err.message || "Failed to delete equipment.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="mp-page" aria-labelledby="eq-page-title">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <div className="mp-page-header">
        <div>
          <h1 className="mp-page-title" id="eq-page-title">Equipment Loans</h1>
          <p className="mp-page-subtitle">
            {isManager ? "Manage the equipment catalogue." : "Browse available equipment and request a loan."}
          </p>
        </div>
        {isManager && (
          <button
            className="mp-btn mp-btn--primary"
            type="button"
            onClick={() => { setEditTarget(null); setFormOpen(true); }}
          >
            <Plus size={15} aria-hidden="true" /> Add equipment
          </button>
        )}
      </div>

      {loading && (
        <div className="mp-state-center" aria-busy="true">
          <Loader2 size={24} className="mp-spin" aria-hidden="true" />
          <span>Loading equipment…</span>
        </div>
      )}
      {!loading && error && (
        <div className="mp-state-center mp-state--error" role="alert">
          <AlertCircle size={20} aria-hidden="true" />
          <span>{error}</span>
          <button className="secondary-button" type="button" onClick={loadData}>
            <RefreshCw size={14} aria-hidden="true" /> Try again
          </button>
        </div>
      )}
      {!loading && !error && equipment.length === 0 && (
        <div className="mp-state-center">
          <Dumbbell size={32} color="#b8c9c2" aria-hidden="true" />
          <span className="mp-empty-heading">No equipment listed</span>
          <span className="mp-empty-body">
            {isManager ? "Add equipment using the button above." : "No equipment is available at the moment."}
          </span>
        </div>
      )}
      {!loading && !error && equipment.length > 0 && (
        <div className="eq-grid">
          {equipment.map((item) => (
            <EquipmentCard
              key={item.id}
              item={item}
              isManager={isManager}
              onLoanRequest={(i) => setLoanTarget(i)}
              onEdit={(i) => { setEditTarget(i); setFormOpen(true); }}
              onDelete={(i) => setDeleteTarget(i)}
            />
          ))}
        </div>
      )}

      <EquipmentFormModal
        open={formOpen}
        equipment={editTarget}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          setEditTarget(null);
          showToast("success", editTarget ? "Equipment updated." : "Equipment added.");
          loadData();
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Equipment"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <LoanRequestDialog
        open={!!loanTarget}
        equipment={loanTarget}
        onClose={() => setLoanTarget(null)}
        onSuccess={() => {
          setLoanTarget(null);
          showToast("success", "Loan request submitted.");
          loadData();
        }}
      />
    </section>
  );
}
