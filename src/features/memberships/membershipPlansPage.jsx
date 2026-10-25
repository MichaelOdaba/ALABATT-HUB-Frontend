import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle,
  ChevronDown,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../auth/useAuth.js";
import {
  createMembership,
  createMembershipType,
  deleteMembershipType,
  getMembershipTypes,
  updateMembershipType,
} from "../../services/membershipAPI.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
    .format(n)
    .replace("NGN", "₦");
}

function resolvePrice(specific, general) {
  // null-aware: 0 is valid, only null/undefined falls back
  if (specific !== null && specific !== undefined) return specific;
  return general;
}

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => onDismiss(), 5000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      className={`mp-toast mp-toast--${toast.type}`}
      role="alert"
      aria-live="assertive"
    >
      {toast.type === "success" ? (
        <CheckCircle size={16} aria-hidden="true" />
      ) : (
        <AlertCircle size={16} aria-hidden="true" />
      )}
      <span>{toast.message}</span>
      <button
        className="mp-toast-close"
        onClick={onDismiss}
        type="button"
        aria-label="Dismiss notification"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ open, title, description, onConfirm, onCancel, busy }) {
  if (!open) return null;
  return (
    <div className="mp-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="mp-modal mp-modal--sm">
        <h2 className="mp-modal-title" id="confirm-title">
          {title}
        </h2>
        <p className="mp-modal-body">{description}</p>
        <div className="mp-modal-actions">
          <button
            className="mp-btn mp-btn--ghost"
            onClick={onCancel}
            disabled={busy}
            type="button"
          >
            Cancel
          </button>
          <button
            className="mp-btn mp-btn--danger"
            onClick={onConfirm}
            disabled={busy}
            type="button"
          >
            {busy ? <Loader2 size={14} className="mp-spin" aria-hidden="true" /> : null}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Plan Form Modal ──────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  student_price: "",
  staff_price: "",
  external_price: "",
  duration_days: "",
  access_level: "",
  is_active: true,
};

function PlanFormModal({ open, plan, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const firstRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (plan) {
      setForm({
        name: plan.name ?? "",
        description: plan.description ?? "",
        price: plan.price ?? "",
        student_price: plan.student_price ?? "",
        staff_price: plan.staff_price ?? "",
        external_price: plan.external_price ?? "",
        duration_days: plan.duration_days ?? "",
        access_level: plan.access_level ?? "",
        is_active: plan.is_active ?? true,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setServerError(null);
    setTimeout(() => firstRef.current?.focus(), 60);
  }, [open, plan]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Plan name is required.";
    if (form.price === "" || form.price === null)
      e.price = "General price is required.";
    else if (Number.isNaN(Number(form.price)) || Number(form.price) < 0)
      e.price = "Must be a non-negative number.";
    if (form.duration_days === "" || form.duration_days === null)
      e.duration_days = "Duration is required.";
    else if (!Number.isInteger(Number(form.duration_days)) || Number(form.duration_days) <= 0)
      e.duration_days = "Must be a positive integer.";

    ["student_price", "staff_price", "external_price"].forEach((f) => {
      const v = form[f];
      if (v !== "" && v !== null && (Number.isNaN(Number(v)) || Number(v) < 0)) {
        e[f] = "Must be a non-negative number, or leave blank to use general price.";
      }
    });

    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      student_price: form.student_price !== "" ? Number(form.student_price) : null,
      staff_price: form.staff_price !== "" ? Number(form.staff_price) : null,
      external_price: form.external_price !== "" ? Number(form.external_price) : null,
      duration_days: Number(form.duration_days),
      access_level: form.access_level.trim() || null,
      is_active: form.is_active,
    };

    setSubmitting(true);
    setServerError(null);
    try {
      if (plan?.id) {
        await updateMembershipType(plan.id, payload);
      } else {
        await createMembershipType(payload);
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
    <div className="mp-overlay" role="dialog" aria-modal="true" aria-labelledby="plan-form-title">
      <div className="mp-modal mp-modal--lg">
        <div className="mp-modal-header">
          <h2 className="mp-modal-title" id="plan-form-title">
            {plan ? "Edit plan" : "Add plan"}
          </h2>
          <button
            className="mp-modal-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
            disabled={submitting}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {serverError && (
          <div className="mp-form-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            {serverError}
          </div>
        )}

        <form className="mp-form" onSubmit={handleSubmit} noValidate>
          <div className="mp-field">
            <label htmlFor="pf-name" className="mp-label">
              Plan name <span className="mp-required" aria-hidden="true">*</span>
            </label>
            <input
              ref={firstRef}
              id="pf-name"
              className={`mp-input${errors.name ? " mp-input--err" : ""}`}
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              autoComplete="off"
            />
            {errors.name && <span className="mp-field-err">{errors.name}</span>}
          </div>

          <div className="mp-field">
            <label htmlFor="pf-description" className="mp-label">
              Description
            </label>
            <textarea
              id="pf-description"
              className="mp-input mp-textarea"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="mp-field-row">
            <div className="mp-field">
              <label htmlFor="pf-price" className="mp-label">
                General price (₦) <span className="mp-required" aria-hidden="true">*</span>
              </label>
              <input
                id="pf-price"
                className={`mp-input${errors.price ? " mp-input--err" : ""}`}
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
              />
              {errors.price && <span className="mp-field-err">{errors.price}</span>}
            </div>
            <div className="mp-field">
              <label htmlFor="pf-duration" className="mp-label">
                Duration (days) <span className="mp-required" aria-hidden="true">*</span>
              </label>
              <input
                id="pf-duration"
                className={`mp-input${errors.duration_days ? " mp-input--err" : ""}`}
                type="number"
                min="1"
                step="1"
                value={form.duration_days}
                onChange={(e) => set("duration_days", e.target.value)}
              />
              {errors.duration_days && (
                <span className="mp-field-err">{errors.duration_days}</span>
              )}
            </div>
          </div>

          <div className="mp-field-row">
            <div className="mp-field">
              <label htmlFor="pf-student" className="mp-label">
                Student price (₦)
              </label>
              <input
                id="pf-student"
                className={`mp-input${errors.student_price ? " mp-input--err" : ""}`}
                type="number"
                min="0"
                step="0.01"
                placeholder="Leave blank to use general price"
                value={form.student_price}
                onChange={(e) => set("student_price", e.target.value)}
              />
              {errors.student_price && (
                <span className="mp-field-err">{errors.student_price}</span>
              )}
            </div>
            <div className="mp-field">
              <label htmlFor="pf-staff" className="mp-label">
                Staff price (₦)
              </label>
              <input
                id="pf-staff"
                className={`mp-input${errors.staff_price ? " mp-input--err" : ""}`}
                type="number"
                min="0"
                step="0.01"
                placeholder="Leave blank to use general price"
                value={form.staff_price}
                onChange={(e) => set("staff_price", e.target.value)}
              />
              {errors.staff_price && (
                <span className="mp-field-err">{errors.staff_price}</span>
              )}
            </div>
          </div>

          <div className="mp-field-row">
            <div className="mp-field">
              <label htmlFor="pf-external" className="mp-label">
                External price (₦)
              </label>
              <input
                id="pf-external"
                className={`mp-input${errors.external_price ? " mp-input--err" : ""}`}
                type="number"
                min="0"
                step="0.01"
                placeholder="Leave blank to use general price"
                value={form.external_price}
                onChange={(e) => set("external_price", e.target.value)}
              />
              {errors.external_price && (
                <span className="mp-field-err">{errors.external_price}</span>
              )}
            </div>
            <div className="mp-field">
              <label htmlFor="pf-access" className="mp-label">
                Access level
              </label>
              <input
                id="pf-access"
                className="mp-input"
                type="text"
                value={form.access_level}
                onChange={(e) => set("access_level", e.target.value)}
                placeholder="e.g. full, gym-only"
              />
            </div>
          </div>

          <div className="mp-field mp-field--check">
            <label className="mp-check-label" htmlFor="pf-active">
              <input
                id="pf-active"
                type="checkbox"
                className="mp-checkbox"
                checked={form.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
              />
              Active plan (visible to members)
            </label>
          </div>

          <div className="mp-modal-actions">
            <button
              className="mp-btn mp-btn--ghost"
              type="button"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              className="mp-btn mp-btn--primary"
              type="submit"
              disabled={submitting}
            >
              {submitting && (
                <Loader2 size={14} className="mp-spin" aria-hidden="true" />
              )}
              {plan ? "Save changes" : "Create plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Choose Plan Dialog ───────────────────────────────────────────────────────

function ChoosePlanDialog({ open, plan, onClose, onSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    if (open) setServerError(null);
  }, [open]);

  async function handleConfirm() {
    setSubmitting(true);
    setServerError(null);
    try {
      await createMembership({ membership_type: plan.id });
      onSuccess();
    } catch (err) {
      setServerError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !plan) return null;

  const studentPrice = resolvePrice(plan.student_price, plan.price);
  const staffPrice = resolvePrice(plan.staff_price, plan.price);
  const externalPrice = resolvePrice(plan.external_price, plan.price);

  return (
    <div className="mp-overlay" role="dialog" aria-modal="true" aria-labelledby="choose-title">
      <div className="mp-modal mp-modal--sm">
        <div className="mp-modal-header">
          <h2 className="mp-modal-title" id="choose-title">
            Confirm membership request
          </h2>
          <button
            className="mp-modal-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
            disabled={submitting}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="mp-modal-body">
          You are requesting the <strong>{plan.name}</strong> plan.
        </p>

        <table className="mp-price-table mp-price-table--confirm" aria-label="Pricing summary">
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Student</td>
              <td>{formatPrice(studentPrice) ?? "—"}</td>
            </tr>
            <tr>
              <td>Staff</td>
              <td>{formatPrice(staffPrice) ?? "—"}</td>
            </tr>
            <tr>
              <td>External</td>
              <td>{formatPrice(externalPrice) ?? "—"}</td>
            </tr>
          </tbody>
        </table>

        <p className="mp-notice">
          Payment is not available yet. Submitting this request will reserve
          your place and payment instructions will follow.
        </p>

        {serverError && (
          <div className="mp-form-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            {serverError}
          </div>
        )}

        <div className="mp-modal-actions">
          <button
            className="mp-btn mp-btn--ghost"
            onClick={onClose}
            disabled={submitting}
            type="button"
          >
            Cancel
          </button>
          <button
            className="mp-btn mp-btn--primary"
            onClick={handleConfirm}
            disabled={submitting}
            type="button"
          >
            {submitting && (
              <Loader2 size={14} className="mp-spin" aria-hidden="true" />
            )}
            Request membership
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, isManager, onChoose, onEdit, onDelete }) {
  const studentPrice = resolvePrice(plan.student_price, plan.price);
  const staffPrice = resolvePrice(plan.staff_price, plan.price);
  const externalPrice = resolvePrice(plan.external_price, plan.price);

  return (
    <article
      className={`mp-plan-card${!plan.is_active ? " mp-plan-card--inactive" : ""}`}
      aria-label={`${plan.name} membership plan`}
    >
      {!plan.is_active && (
        <span className="mp-plan-badge mp-plan-badge--inactive">Inactive</span>
      )}

      <div className="mp-plan-card-header">
        <h2 className="mp-plan-name">{plan.name}</h2>
        {plan.duration_days && (
          <span className="mp-plan-duration">
            {plan.duration_days} day{plan.duration_days !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {plan.description && (
        <p className="mp-plan-description">{plan.description}</p>
      )}

      {plan.access_level && (
        <div className="mp-plan-access">
          <BadgeCheck size={13} aria-hidden="true" />
          <span>{plan.access_level}</span>
        </div>
      )}

      <table className="mp-price-table" aria-label={`${plan.name} pricing`}>
        <thead>
          <tr>
            <th scope="col">Member</th>
            <th scope="col">Price</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Student</td>
            <td>{formatPrice(studentPrice) ?? "—"}</td>
          </tr>
          <tr>
            <td>Staff</td>
            <td>{formatPrice(staffPrice) ?? "—"}</td>
          </tr>
          <tr>
            <td>External</td>
            <td>{formatPrice(externalPrice) ?? "—"}</td>
          </tr>
        </tbody>
      </table>

      <div className="mp-plan-actions">
        {isManager ? (
          <>
            <button
              className="mp-btn mp-btn--ghost mp-btn--sm"
              type="button"
              onClick={() => onEdit(plan)}
              aria-label={`Edit ${plan.name}`}
            >
              <Pencil size={13} aria-hidden="true" />
              Edit
            </button>
            <button
              className="mp-btn mp-btn--ghost-danger mp-btn--sm"
              type="button"
              onClick={() => onDelete(plan)}
              aria-label={`Delete ${plan.name}`}
            >
              <Trash2 size={13} aria-hidden="true" />
              Delete
            </button>
            <button
              className="mp-btn mp-btn--primary mp-btn--choose"
              type="button"
              onClick={() => onChoose(plan)}
              disabled={!plan.is_active}
            >
              Choose plan
            </button>
          </>
        ) : (
          <button
            className="mp-btn mp-btn--primary mp-btn--choose"
            type="button"
            onClick={() => onChoose(plan)}
          >
            Choose plan
          </button>
        )}
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MembershipPlansPage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editPlan, setEditPlan] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [choosePlan, setChoosePlan] = useState(null);

  const fetchRef = useRef(false);

  const loadPlans = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await getMembershipTypes();
      const list = extractList(data);
      const visible = isManager ? list : list.filter((p) => p.is_active === true);
      setPlans(visible);
    } catch (err) {
      setError(err.message || "Failed to load membership plans.");
    } finally {
      setLoading(false);
      fetchRef.current = false;
    }
  }, [isManager]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  function showToast(type, message) {
    setToast({ type, message });
  }

  function handleEditOpen(plan) {
    setEditPlan(plan);
    setFormOpen(true);
  }

  function handleAddOpen() {
    setEditPlan(null);
    setFormOpen(true);
  }

  async function handleFormSaved() {
    setFormOpen(false);
    setEditPlan(null);
    showToast("success", editPlan ? "Plan updated successfully." : "Plan created successfully.");
    await loadPlans();
  }

  function handleDeleteRequest(plan) {
    setDeleteTarget(plan);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMembershipType(deleteTarget.id);
      setDeleteTarget(null);
      showToast("success", `"${deleteTarget.name}" was deleted.`);
      await loadPlans();
    } catch (err) {
      setDeleteTarget(null);
      showToast("error", err.message || "Failed to delete plan.");
    } finally {
      setDeleting(false);
    }
  }

  function handleChooseOpen(plan) {
    setChoosePlan(plan);
  }

  function handleChooseSuccess() {
    setChoosePlan(null);
    showToast("success", "Membership requested. Payment coming soon");
  }

  return (
    <section className="mp-page" aria-labelledby="mp-page-title">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <div className="mp-page-header">
        <div>
          <h1 className="mp-page-title" id="mp-page-title">
            Membership Plans
          </h1>
          <p className="mp-page-subtitle">
            Choose a plan that fits your needs.
          </p>
        </div>
        {isManager && (
          <button
            className="mp-btn mp-btn--primary"
            type="button"
            onClick={handleAddOpen}
          >
            <Plus size={15} aria-hidden="true" />
            Add plan
          </button>
        )}
      </div>

      {loading && (
        <div className="mp-state-center" aria-busy="true" aria-live="polite">
          <Loader2 size={26} className="mp-spin" aria-hidden="true" />
          <span>Loading plans…</span>
        </div>
      )}

      {!loading && error && (
        <div className="mp-state-center mp-state--error" role="alert">
          <AlertCircle size={24} aria-hidden="true" />
          <span>{error}</span>
          <button
            className="mp-btn mp-btn--ghost"
            type="button"
            onClick={loadPlans}
          >
            <RefreshCw size={14} aria-hidden="true" />
            Try again
          </button>
        </div>
      )}

      {!loading && !error && plans.length === 0 && (
        <div className="mp-state-center">
          <BadgeCheck size={32} aria-hidden="true" className="mp-empty-icon" />
          <span className="mp-empty-heading">No plans available</span>
          <span className="mp-empty-body">
            There are no active membership plans at the moment.
          </span>
        </div>
      )}

      {!loading && !error && plans.length > 0 && (
        <div className="mp-plans-grid" role="list">
          {plans.map((plan) => (
            <div key={plan.id} role="listitem">
              <PlanCard
                plan={plan}
                isManager={isManager}
                onChoose={handleChooseOpen}
                onEdit={handleEditOpen}
                onDelete={handleDeleteRequest}
              />
            </div>
          ))}
        </div>
      )}

      <PlanFormModal
        open={formOpen}
        plan={editPlan}
        onClose={() => setFormOpen(false)}
        onSaved={handleFormSaved}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete plan"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        busy={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <ChoosePlanDialog
        open={!!choosePlan}
        plan={choosePlan}
        onClose={() => setChoosePlan(null)}
        onSuccess={handleChooseSuccess}
      />
    </section>
  );
}
