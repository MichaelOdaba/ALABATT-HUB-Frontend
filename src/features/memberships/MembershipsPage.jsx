import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";
import {
  getMemberships,
  updateMembership,
} from "../../services/membershipAPI.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPlanName(membership) {
  const mt = membership.membership_type;
  if (!mt) return "—";
  if (typeof mt === "object" && mt !== null) return mt.name ?? String(mt.id);
  return String(mt);
}

function getUserDisplay(membership) {
  const u = membership.user;
  if (!u) return "—";
  if (typeof u === "object" && u !== null) {
    return u.full_name ?? u.username ?? `User ${u.id}`;
  }
  return String(u);
}

// ─── Status Chips ─────────────────────────────────────────────────────────────

const MEMBERSHIP_STATUS_CLASS = {
  active: "mp-chip mp-chip--green",
  pending: "mp-chip mp-chip--amber",
  expired: "mp-chip mp-chip--red",
  inactive: "mp-chip mp-chip--neutral",
};

const PAYMENT_STATUS_CLASS = {
  paid: "mp-chip mp-chip--green",
  unpaid: "mp-chip mp-chip--amber",
  partial: "mp-chip mp-chip--blue",
};

function StatusChip({ value, map, label }) {
  const cls = (value && map[value.toLowerCase()]) || "mp-chip mp-chip--neutral";
  return (
    <span className={cls} aria-label={`${label}: ${value ?? "unknown"}`}>
      {value ?? "unknown"}
    </span>
  );
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

// ─── Review Modal ─────────────────────────────────────────────────────────────

const MEMBERSHIP_STATUS_OPTIONS = ["pending", "active", "inactive", "expired"];
const PAYMENT_STATUS_OPTIONS = ["unpaid", "paid", "partial"];

function ReviewModal({ open, membership, onClose, onSaved }) {
  const [form, setForm] = useState({ status: "", payment_status: "" });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const firstRef = useRef(null);

  useEffect(() => {
    if (!open || !membership) return;
    setForm({
      status: membership.status ?? "",
      payment_status: membership.payment_status ?? "",
    });
    setServerError(null);
    setTimeout(() => firstRef.current?.focus(), 60);
  }, [open, membership]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setServerError(null);
    try {
      await updateMembership(membership.id, {
        status: form.status || undefined,
        payment_status: form.payment_status || undefined,
      });
      onSaved();
    } catch (err) {
      setServerError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !membership) return null;

  return (
    <div className="mp-overlay" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <div className="mp-modal mp-modal--sm">
        <div className="mp-modal-header">
          <h2 className="mp-modal-title" id="review-title">
            Review membership
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

        <dl className="mp-review-dl">
          <div className="mp-review-row">
            <dt>Member</dt>
            <dd>{getUserDisplay(membership)}</dd>
          </div>
          <div className="mp-review-row">
            <dt>Plan</dt>
            <dd>{getPlanName(membership)}</dd>
          </div>
          <div className="mp-review-row">
            <dt>Start date</dt>
            <dd>{formatDate(membership.start_date)}</dd>
          </div>
          <div className="mp-review-row">
            <dt>End date</dt>
            <dd>{formatDate(membership.end_date)}</dd>
          </div>
        </dl>

        {serverError && (
          <div className="mp-form-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            {serverError}
          </div>
        )}

        <form className="mp-form" onSubmit={handleSubmit} noValidate>
          <div className="mp-field">
            <label htmlFor="rv-status" className="mp-label">
              Membership status
            </label>
            <div className="mp-select-wrap">
              <select
                ref={firstRef}
                id="rv-status"
                className="mp-input mp-select"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="">— unchanged —</option>
                {MEMBERSHIP_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              <span className="mp-select-arrow" aria-hidden="true">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
          </div>

          <div className="mp-field">
            <label htmlFor="rv-payment" className="mp-label">
              Payment status
            </label>
            <div className="mp-select-wrap">
              <select
                id="rv-payment"
                className="mp-input mp-select"
                value={form.payment_status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, payment_status: e.target.value }))
                }
              >
                <option value="">— unchanged —</option>
                {PAYMENT_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              <span className="mp-select-arrow" aria-hidden="true">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
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
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MembershipsPage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);

  const fetchRef = useRef(false);

  const loadMemberships = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await getMemberships();
      setMemberships(extractList(data));
    } catch (err) {
      setError(err.message || "Failed to load memberships.");
    } finally {
      setLoading(false);
      fetchRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadMemberships();
  }, [loadMemberships]);

  function showToast(type, message) {
    setToast({ type, message });
  }

  async function handleReviewSaved() {
    setReviewTarget(null);
    showToast("success", "Membership updated successfully.");
    await loadMemberships();
  }

  const pageTitle = isManager ? "Membership Management" : "My Memberships";

  return (
    <section className="mp-page" aria-labelledby="ms-page-title">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <div className="mp-page-header">
        <div>
          <h1 className="mp-page-title" id="ms-page-title">
            {pageTitle}
          </h1>
          <p className="mp-page-subtitle">
            {isManager
              ? "Review and manage all membership records."
              : "View your membership records and request a new plan."}
          </p>
        </div>
        {!isManager && (
          <Link className="mp-btn mp-btn--primary" to="/membership-plans">
            Browse plans
          </Link>
        )}
      </div>

      {loading && (
        <div className="mp-state-center" aria-busy="true" aria-live="polite">
          <Loader2 size={26} className="mp-spin" aria-hidden="true" />
          <span>Loading memberships…</span>
        </div>
      )}

      {!loading && error && (
        <div className="mp-state-center mp-state--error" role="alert">
          <AlertCircle size={24} aria-hidden="true" />
          <span>{error}</span>
          <button
            className="mp-btn mp-btn--ghost"
            type="button"
            onClick={loadMemberships}
          >
            <RefreshCw size={14} aria-hidden="true" />
            Try again
          </button>
        </div>
      )}

      {!loading && !error && memberships.length === 0 && (
        <div className="mp-state-center">
          <Users size={32} aria-hidden="true" className="mp-empty-icon" />
          <span className="mp-empty-heading">No memberships found</span>
          <span className="mp-empty-body">
            {isManager
              ? "No membership records have been created yet."
              : "You have no memberships yet. Browse our plans to get started."}
          </span>
          {!isManager && (
            <Link className="mp-btn mp-btn--primary" to="/membership-plans">
              Browse plans
            </Link>
          )}
        </div>
      )}

      {!loading && !error && memberships.length > 0 && (
        <div className="mp-table-wrap">
          <table className="mp-table" aria-label={pageTitle}>
            <thead>
              <tr>
                <th scope="col">Plan</th>
                {isManager && <th scope="col">Member</th>}
                <th scope="col">Start date</th>
                <th scope="col">End date</th>
                <th scope="col">Membership status</th>
                <th scope="col">Payment status</th>
                <th scope="col">Requested on</th>
                {isManager && <th scope="col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {memberships.map((m) => (
                <tr key={m.id}>
                  <td data-label="Plan">{getPlanName(m)}</td>
                  {isManager && (
                    <td data-label="Member">{getUserDisplay(m)}</td>
                  )}
                  <td data-label="Start date">{formatDate(m.start_date)}</td>
                  <td data-label="End date">{formatDate(m.end_date)}</td>
                  <td data-label="Membership status">
                    <StatusChip
                      value={m.status}
                      map={MEMBERSHIP_STATUS_CLASS}
                      label="Membership status"
                    />
                  </td>
                  <td data-label="Payment status">
                    <StatusChip
                      value={m.payment_status}
                      map={PAYMENT_STATUS_CLASS}
                      label="Payment status"
                    />
                  </td>
                  <td data-label="Requested on">{formatDate(m.created_at)}</td>
                  {isManager && (
                    <td data-label="Actions">
                      <button
                        className="mp-btn mp-btn--ghost mp-btn--sm"
                        type="button"
                        onClick={() => setReviewTarget(m)}
                        aria-label={`Review membership for ${getPlanName(m)}`}
                      >
                        Review
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReviewModal
        open={!!reviewTarget}
        membership={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onSaved={handleReviewSaved}
      />
    </section>
  );
}
