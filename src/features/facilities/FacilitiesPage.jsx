import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";
import {
  getFacilities,
  createFacility,
  updateFacility,
  deleteFacility,
  getCentres,
} from "../../services/bookingsAPI.js";
import { formatNaira } from "../reports/reportsUtils.js";

// ─── Helpers ──────────────────────────────────────────────
function extractList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

function getCentreName(facility, centresMap) {
  const c = facility.centre;
  if (!c) return "—";
  if (typeof c === "object" && c !== null) return c.name ?? `Centre #${c.id}`;
  return centresMap.get(c) ?? `Centre #${c}`;
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
    <div className="mp-overlay" role="dialog" aria-modal="true" aria-labelledby="fc-confirm-title">
      <div className="mp-modal mp-modal--sm">
        <h2 className="mp-modal-title" id="fc-confirm-title">{title}</h2>
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

// ─── Facility Form ────────────────────────────────────────
const EMPTY_FORM = {
  name: "", type: "", centre: "", hourly_rate: "", event_fee: "", capacity: "", is_available: true,
};

function FacilityFormModal({ open, facility, centres, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const firstRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (facility) {
      const centreId = facility.centre && typeof facility.centre === "object"
        ? facility.centre.id : facility.centre ?? "";
      setForm({
        name: facility.name ?? "",
        type: facility.type ?? "",
        centre: centreId != null ? String(centreId) : "",
        hourly_rate: facility.hourly_rate ?? facility.price_per_hour ?? "",
        event_fee: facility.event_fee ?? "",
        capacity: facility.capacity ?? "",
        is_available: facility.is_available ?? true,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setServerError(null);
    setTimeout(() => firstRef.current?.focus(), 60);
  }, [open, facility]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (form.hourly_rate !== "" && (Number.isNaN(Number(form.hourly_rate)) || Number(form.hourly_rate) < 0))
      e.hourly_rate = "Must be a non-negative number.";
    if (form.event_fee !== "" && (Number.isNaN(Number(form.event_fee)) || Number(form.event_fee) < 0))
      e.event_fee = "Must be a non-negative number.";
    if (form.capacity !== "" && (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 0))
      e.capacity = "Must be a non-negative integer.";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const payload = {
      name: form.name.trim(),
      type: form.type.trim() || null,
      centre: form.centre ? Number(form.centre) : null,
      hourly_rate: form.hourly_rate !== "" ? Number(form.hourly_rate) : null,
      event_fee: form.event_fee !== "" ? Number(form.event_fee) : null,
      capacity: form.capacity !== "" ? Number(form.capacity) : null,
      is_available: form.is_available,
    };

    setSubmitting(true);
    setServerError(null);
    try {
      if (facility?.id) {
        await updateFacility(facility.id, payload);
      } else {
        await createFacility(payload);
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
    <div className="mp-overlay" role="dialog" aria-modal="true" aria-labelledby="fc-form-title">
      <div className="mp-modal mp-modal--lg">
        <div className="mp-modal-header">
          <h2 className="mp-modal-title" id="fc-form-title">{facility ? "Edit Facility" : "Add Facility"}</h2>
          <button className="mp-modal-close" onClick={onClose} type="button" aria-label="Close" disabled={submitting}><X size={18} /></button>
        </div>

        {serverError && (
          <div className="mp-form-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" /> {serverError}
          </div>
        )}

        <form className="mp-form" onSubmit={handleSubmit} noValidate>
          <div className="mp-field">
            <label className="mp-label" htmlFor="fc-name">
              Name <span className="mp-required" aria-hidden="true">*</span>
            </label>
            <input
              ref={firstRef}
              id="fc-name"
              className={`mp-input${errors.name ? " mp-input--err" : ""}`}
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
            {errors.name && <span className="mp-field-err">{errors.name}</span>}
          </div>

          <div className="mp-field-row">
            <div className="mp-field">
              <label className="mp-label" htmlFor="fc-type">Type</label>
              <input
                id="fc-type"
                className="mp-input"
                type="text"
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                placeholder="e.g. gym, court, studio"
              />
            </div>
            <div className="mp-field">
              <label className="mp-label" htmlFor="fc-centre">Centre</label>
              <div className="mp-select-wrap">
                <select
                  id="fc-centre"
                  className="mp-input mp-select"
                  value={form.centre}
                  onChange={(e) => set("centre", e.target.value)}
                >
                  <option value="">— None —</option>
                  {centres.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
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
              <label className="mp-label" htmlFor="fc-rate">Hourly rate (₦)</label>
              <input
                id="fc-rate"
                className={`mp-input${errors.hourly_rate ? " mp-input--err" : ""}`}
                type="number" min="0" step="0.01"
                value={form.hourly_rate}
                onChange={(e) => set("hourly_rate", e.target.value)}
              />
              {errors.hourly_rate && <span className="mp-field-err">{errors.hourly_rate}</span>}
            </div>
            <div className="mp-field">
              <label className="mp-label" htmlFor="fc-event-fee">Event fee (₦)</label>
              <input
                id="fc-event-fee"
                className={`mp-input${errors.event_fee ? " mp-input--err" : ""}`}
                type="number" min="0" step="0.01"
                value={form.event_fee}
                onChange={(e) => set("event_fee", e.target.value)}
              />
              {errors.event_fee && <span className="mp-field-err">{errors.event_fee}</span>}
            </div>
          </div>

          <div className="mp-field-row">
            <div className="mp-field">
              <label className="mp-label" htmlFor="fc-capacity">Capacity</label>
              <input
                id="fc-capacity"
                className={`mp-input${errors.capacity ? " mp-input--err" : ""}`}
                type="number" min="0" step="1"
                value={form.capacity}
                onChange={(e) => set("capacity", e.target.value)}
              />
              {errors.capacity && <span className="mp-field-err">{errors.capacity}</span>}
            </div>
            <div className="mp-field" style={{ justifyContent: "flex-end" }}>
              <label className="mp-check-label" htmlFor="fc-available" style={{ marginTop: 22 }}>
                <input
                  id="fc-available"
                  type="checkbox"
                  className="mp-checkbox"
                  checked={form.is_available}
                  onChange={(e) => set("is_available", e.target.checked)}
                />
                Available for booking
              </label>
            </div>
          </div>

          <div className="mp-modal-actions">
            <button className="mp-btn mp-btn--ghost" type="button" onClick={onClose} disabled={submitting}>Cancel</button>
            <button className="mp-btn mp-btn--primary" type="submit" disabled={submitting}>
              {submitting && <Loader2 size={14} className="mp-spin" aria-hidden="true" />}
              {facility ? "Save changes" : "Add facility"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function FacilitiesPage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  const [facilities, setFacilities] = useState([]);
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRef = useRef(false);

  const loadData = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const [fData, cData] = await Promise.all([getFacilities(), getCentres().catch(() => [])]);
      setFacilities(extractList(fData));
      setCentres(extractList(cData));
    } catch (err) {
      setError(err.message || "Failed to load facilities.");
    } finally {
      setLoading(false);
      fetchRef.current = false;
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const centresMap = new Map(centres.map((c) => [c.id, c.name]));

  function showToast(type, message) { setToast({ type, message }); }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFacility(deleteTarget.id);
      setDeleteTarget(null);
      showToast("success", `"${deleteTarget.name}" deleted.`);
      await loadData();
    } catch (err) {
      setDeleteTarget(null);
      showToast("error", err.message || "Failed to delete facility.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleFormSaved() {
    setFormOpen(false);
    setEditTarget(null);
    showToast("success", editTarget ? "Facility updated." : "Facility created.");
    await loadData();
  }

  return (
    <section className="mp-page" aria-labelledby="fc-page-title">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <div className="mp-page-header">
        <div>
          <h1 className="mp-page-title" id="fc-page-title">Facilities</h1>
          <p className="mp-page-subtitle">
            {isManager ? "Manage the facility catalogue." : "Browse available facilities and book a space."}
          </p>
        </div>
        {isManager && (
          <button
            className="mp-btn mp-btn--primary"
            type="button"
            onClick={() => { setEditTarget(null); setFormOpen(true); }}
          >
            <Plus size={15} aria-hidden="true" /> Add facility
          </button>
        )}
      </div>

      {loading && (
        <div className="mp-state-center" aria-busy="true">
          <Loader2 size={24} className="mp-spin" aria-hidden="true" />
          <span>Loading facilities…</span>
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
      {!loading && !error && facilities.length === 0 && (
        <div className="mp-state-center">
          <MapPin size={32} color="#b8c9c2" aria-hidden="true" />
          <span className="mp-empty-heading">No facilities found</span>
          <span className="mp-empty-body">
            {isManager ? "Add the first facility using the button above." : "No facilities are listed yet."}
          </span>
        </div>
      )}
      {!loading && !error && facilities.length > 0 && (
        <div className="data-table-wrap" style={{ marginTop: 24 }}>
          <table className="data-table" aria-label="Facilities">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Centre</th>
                <th scope="col">Rate / hr</th>
                <th scope="col">Event fee</th>
                <th scope="col">Capacity</th>
                <th scope="col">Available</th>
                {isManager && <th scope="col">Actions</th>}
                {!isManager && <th scope="col">Book</th>}
              </tr>
            </thead>
            <tbody>
              {facilities.map((f) => (
                <tr key={f.id}>
                  <td className="data-table-primary">{f.name}</td>
                  <td>{f.type ?? "—"}</td>
                  <td>{getCentreName(f, centresMap)}</td>
                  <td>{f.hourly_rate != null ? formatNaira(f.hourly_rate) : "—"}</td>
                  <td>{f.event_fee != null ? formatNaira(f.event_fee) : "—"}</td>
                  <td>{f.capacity ?? "—"}</td>
                  <td>
                    <span className={`status-chip status-chip-${f.is_available ? "success" : "neutral"}`}>
                      {f.is_available ? "Yes" : "No"}
                    </span>
                  </td>
                  {isManager ? (
                    <td>
                      <div className="refund-actions">
                        <button
                          className="secondary-button refund-action"
                          type="button"
                          onClick={() => { setEditTarget(f); setFormOpen(true); }}
                          aria-label={`Edit ${f.name}`}
                        >
                          <Pencil size={13} aria-hidden="true" /> Edit
                        </button>
                        <button
                          className="secondary-button refund-action refund-action-danger"
                          type="button"
                          onClick={() => setDeleteTarget(f)}
                          aria-label={`Delete ${f.name}`}
                        >
                          <Trash2 size={13} aria-hidden="true" /> Delete
                        </button>
                      </div>
                    </td>
                  ) : (
                    <td>
                      <Link
                        className="secondary-button refund-action"
                        to="/bookings"
                      >
                        Book
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FacilityFormModal
        open={formOpen}
        facility={editTarget}
        centres={centres}
        onClose={() => setFormOpen(false)}
        onSaved={handleFormSaved}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Facility"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}
