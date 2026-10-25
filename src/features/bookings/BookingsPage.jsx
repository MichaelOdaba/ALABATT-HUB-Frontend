import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { useAuth } from "../auth/useAuth.js";
import {
  getBookings,
  createBooking,
  cancelBooking,
  bookingDecision,
  getFacilities,
} from "../../services/bookingsAPI.js";
import { formatNaira, formatReportDate } from "../reports/reportsUtils.js";

// ─── Helpers ──────────────────────────────────────────────
function extractList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(v) {
  if (!v) return "—";
  return String(v).slice(0, 5);
}

function getFacilityName(booking, facilitiesMap) {
  const f = booking.facility;
  if (!f) return "—";
  if (typeof f === "object" && f !== null) return f.name ?? `Facility #${f.id}`;
  return facilitiesMap.get(f) ?? `Facility #${f}`;
}

function getFacilityId(booking) {
  const f = booking.facility;
  if (!f) return null;
  if (typeof f === "object" && f !== null) return f.id;
  return f;
}

function bookingStatusChip(status) {
  const map = { approved: "success", pending: "warning", rejected: "danger", cancelled: "neutral" };
  return map[status] ?? "neutral";
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
      <button className="mp-toast-close" onClick={onDismiss} type="button" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Cost Summary ─────────────────────────────────────────
function CostSummary({ facility, startTime, endTime, isEvent }) {
  if (!facility) return (
    <div className="bk-summary-empty">Select a facility to see an estimated cost.</div>
  );
  const hourlyRate = parseFloat(facility.hourly_rate ?? facility.price_per_hour ?? 0);
  const eventFee = parseFloat(facility.event_fee ?? 0);

  let durationHrs = 0;
  if (startTime && endTime) {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    durationHrs = Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
  }

  const baseCost = hourlyRate * durationHrs;
  const eventCost = isEvent && eventFee > 0 ? eventFee : 0;
  const total = baseCost + eventCost;

  return (
    <div className="bk-summary">
      <h3 className="bk-summary-title">Cost Estimate</h3>
      <table className="bk-summary-table">
        <tbody>
          <tr><td>Facility</td><td>{facility.name}</td></tr>
          {hourlyRate > 0 && <tr><td>Hourly rate</td><td>{formatNaira(hourlyRate)}/hr</td></tr>}
          {durationHrs > 0 && <tr><td>Duration</td><td>{durationHrs.toFixed(1)} hr{durationHrs !== 1 ? "s" : ""}</td></tr>}
          {baseCost > 0 && <tr><td>Base cost</td><td>{formatNaira(baseCost)}</td></tr>}
          {isEvent && eventFee > 0 && <tr><td>Event fee</td><td>{formatNaira(eventFee)}</td></tr>}
          <tr className="bk-summary-total">
            <td>Estimated total</td>
            <td>{formatNaira(total)}</td>
          </tr>
        </tbody>
      </table>
      <p className="bk-summary-note">This is an estimate only. The server confirms the final total.</p>
    </div>
  );
}

// ─── Booking Form ─────────────────────────────────────────
function BookingForm({ facilities, onCreated, user }) {
  const isCoach = user?.role === "coach";
  const [form, setForm] = useState({ facility: "", date: "", start_time: "", end_time: "", is_event: false });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const selectedFacility = facilities.find((f) => String(f.id) === form.facility) ?? null;

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.facility) e.facility = "Please select a facility.";
    if (!form.date) e.date = "Please select a date.";
    if (!form.start_time) e.start_time = "Please enter a start time.";
    if (!form.end_time) e.end_time = "Please enter an end time.";
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      e.end_time = "End time must be after start time.";
    }
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setServerError(null);
    try {
      const payload = {
        facility: Number(form.facility),
        start_time: `${form.date}T${form.start_time}:00`,
        end_time: `${form.date}T${form.end_time}:00`,
      };
      if (isCoach) payload.is_event = form.is_event;
      await createBooking(payload);
      setForm({ facility: "", date: "", start_time: "", end_time: "", is_event: false });
      onCreated();
    } catch (err) {
      setServerError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }

  return (
    <>
      <h2 className="bk-section-title">Book a Facility</h2>
      <div className="bk-form-wrap">
        {/* Left: form */}
        <div>
          {serverError && (
            <div className="mp-form-error" role="alert">
              <AlertCircle size={14} aria-hidden="true" /> {serverError}
            </div>
          )}
          <form className="bk-form" onSubmit={handleSubmit} noValidate>
            <div className="mp-field">
              <label className="mp-label" htmlFor="bk-facility">
                Facility <span className="mp-required" aria-hidden="true">*</span>
              </label>
              <div className="mp-select-wrap">
                <select
                  id="bk-facility"
                  className={`mp-input mp-select${errors.facility ? " mp-input--err" : ""}`}
                  value={form.facility}
                  onChange={(e) => set("facility", e.target.value)}
                >
                  <option value="">— Select a facility —</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <span className="mp-select-arrow" aria-hidden="true">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
              {errors.facility && <span className="mp-field-err">{errors.facility}</span>}
            </div>

            <div className="mp-field">
              <label className="mp-label" htmlFor="bk-date">
                Date <span className="mp-required" aria-hidden="true">*</span>
              </label>
              <input
                id="bk-date"
                className={`mp-input${errors.date ? " mp-input--err" : ""}`}
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
              {errors.date && <span className="mp-field-err">{errors.date}</span>}
            </div>

            <div className="mp-field-row">
              <div className="mp-field">
                <label className="mp-label" htmlFor="bk-start">
                  Start time <span className="mp-required" aria-hidden="true">*</span>
                </label>
                <input
                  id="bk-start"
                  className={`mp-input${errors.start_time ? " mp-input--err" : ""}`}
                  type="time"
                  value={form.start_time}
                  onChange={(e) => set("start_time", e.target.value)}
                />
                {errors.start_time && <span className="mp-field-err">{errors.start_time}</span>}
              </div>
              <div className="mp-field">
                <label className="mp-label" htmlFor="bk-end">
                  End time <span className="mp-required" aria-hidden="true">*</span>
                </label>
                <input
                  id="bk-end"
                  className={`mp-input${errors.end_time ? " mp-input--err" : ""}`}
                  type="time"
                  value={form.end_time}
                  onChange={(e) => set("end_time", e.target.value)}
                />
                {errors.end_time && <span className="mp-field-err">{errors.end_time}</span>}
              </div>
            </div>

            {isCoach && (
              <div className="mp-field mp-field--check">
                <label className="mp-check-label" htmlFor="bk-event">
                  <input
                    id="bk-event"
                    type="checkbox"
                    className="mp-checkbox"
                    checked={form.is_event}
                    onChange={(e) => set("is_event", e.target.checked)}
                  />
                  This is an event booking
                </label>
              </div>
            )}

            <button
              className="mp-btn mp-btn--primary"
              type="submit"
              disabled={submitting}
              style={{ width: "100%", marginTop: 4 }}
            >
              {submitting && <Loader2 size={14} className="mp-spin" aria-hidden="true" />}
              Submit booking request
            </button>
          </form>
        </div>

        {/* Right: cost summary */}
        <CostSummary
          facility={selectedFacility}
          startTime={form.start_time}
          endTime={form.end_time}
          isEvent={form.is_event}
        />
      </div>
    </>
  );
}

// ─── Cancel dialog ─────────────────────────────────────────
function CancelDialog({ open, booking, facilitiesMap, onConfirm, onCancel, busy }) {
  if (!open || !booking) return null;
  return (
    <div className="mp-overlay" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
      <div className="mp-modal mp-modal--sm">
        <h2 className="mp-modal-title" id="cancel-title">Cancel Booking</h2>
        <p className="mp-modal-body">
          Cancel the booking for <strong>{getFacilityName(booking, facilitiesMap)}</strong> on{" "}
          <strong>{formatDate(booking.date)}</strong>?
        </p>
        <div className="mp-modal-actions">
          <button className="mp-btn mp-btn--ghost" onClick={onCancel} disabled={busy} type="button">Keep it</button>
          <button className="mp-btn mp-btn--danger" onClick={onConfirm} disabled={busy} type="button">
            {busy && <Loader2 size={14} className="mp-spin" aria-hidden="true" />}
            Cancel booking
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Decision dialog ──────────────────────────────────────
function DecisionDialog({ open, booking, facilitiesMap, onConfirm, onCancel, busy }) {
  const [decision, setDecision] = useState("approved");
  if (!open || !booking) return null;
  return (
    <div className="mp-overlay" role="dialog" aria-modal="true" aria-labelledby="decision-title">
      <div className="mp-modal mp-modal--sm">
        <div className="mp-modal-header">
          <h2 className="mp-modal-title" id="decision-title">Review Booking</h2>
          <button className="mp-modal-close" onClick={onCancel} type="button" aria-label="Close" disabled={busy}>
            <X size={18} />
          </button>
        </div>
        <p className="mp-modal-body">
          <strong>{getFacilityName(booking, facilitiesMap)}</strong> — {formatDate(booking.date)},{" "}
          {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
        </p>
        <div className="mp-field">
          <label className="mp-label" htmlFor="bk-decision">Decision</label>
          <div className="mp-select-wrap">
            <select
              id="bk-decision"
              className="mp-input mp-select"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
            >
              <option value="approved">Approve</option>
              <option value="rejected">Reject</option>
            </select>
            <span className="mp-select-arrow" aria-hidden="true">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
        <div className="mp-modal-actions">
          <button className="mp-btn mp-btn--ghost" onClick={onCancel} disabled={busy} type="button">Cancel</button>
          <button
            className={`mp-btn ${decision === "approved" ? "mp-btn--primary" : "mp-btn--danger"}`}
            onClick={() => onConfirm(booking.id, decision)}
            disabled={busy}
            type="button"
          >
            {busy && <Loader2 size={14} className="mp-spin" aria-hidden="true" />}
            {decision === "approved" ? "Confirm" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bookings Table ───────────────────────────────────────
function BookingsTable({ bookings, facilitiesMap, isManager, onCancel, onDecision }) {
  return (
    <div className="data-table-wrap">
      <table className="data-table" aria-label={isManager ? "All bookings" : "My bookings"}>
        <thead>
          <tr>
            {isManager && <th scope="col">Booker</th>}
            <th scope="col">Facility</th>
            <th scope="col">Date</th>
            <th scope="col">Start</th>
            <th scope="col">End</th>
            <th scope="col">Cost</th>
            <th scope="col">Status</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              {isManager && (
                <td>
                  {typeof b.user === "object" && b.user !== null
                    ? b.user.full_name ?? b.user.username ?? `User #${b.user.id}`
                    : b.user ? `User #${b.user}` : "—"}
                </td>
              )}
              <td className="data-table-primary">{getFacilityName(b, facilitiesMap)}</td>
              <td>{formatDate(b.date)}</td>
              <td>{formatTime(b.start_time)}</td>
              <td>{formatTime(b.end_time)}</td>
              <td>{b.total_cost != null ? formatNaira(b.total_cost) : "—"}</td>
              <td>
                <span className={`status-chip status-chip-${bookingStatusChip(b.status)}`}>
                  {b.status ?? "—"}
                </span>
              </td>
              <td>
                <div className="bk-row-actions">
                  {isManager && b.status === "pending" && (
                    <button
                      className="secondary-button refund-action"
                      type="button"
                      onClick={() => onDecision(b)}
                    >
                      Review
                    </button>
                  )}
                  {!isManager && b.status !== "cancelled" && b.status !== "rejected" && (
                    <button
                      className="secondary-button refund-action refund-action-danger"
                      type="button"
                      onClick={() => onCancel(b)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function BookingsPage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const [decisionTarget, setDecisionTarget] = useState(null);
  const [deciding, setDeciding] = useState(false);

  const fetchRef = useRef(false);

  const loadData = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const [bData, fData] = await Promise.all([getBookings(), getFacilities()]);
      setBookings(extractList(bData));
      setFacilities(extractList(fData));
    } catch (err) {
      setError(err.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
      fetchRef.current = false;
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const facilitiesMap = new Map(facilities.map((f) => [f.id, f.name]));

  function showToast(type, message) { setToast({ type, message }); }

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelBooking(cancelTarget.id);
      setCancelTarget(null);
      showToast("success", "Booking cancelled.");
      await loadData();
    } catch (err) {
      setCancelTarget(null);
      showToast("error", err.message || "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  }

  async function handleDecision(id, decision) {
    setDeciding(true);
    try {
      await bookingDecision(id, { status: decision });
      setDecisionTarget(null);
      showToast("success", `Booking ${decision}.`);
      await loadData();
    } catch (err) {
      setDecisionTarget(null);
      showToast("error", err.message || "Failed to process decision.");
    } finally {
      setDeciding(false);
    }
  }

  const sortedBookings = [...bookings].sort((a, b) => {
    const d = new Date(`${b.date}T${b.start_time || "00:00"}`) - new Date(`${a.date}T${a.start_time || "00:00"}`);
    return d;
  });

  return (
    <section className="mp-page" aria-labelledby="bk-page-title">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <div className="mp-page-header">
        <div>
          <h1 className="mp-page-title" id="bk-page-title">
            {isManager ? "Booking Approvals" : "Facility Bookings"}
          </h1>
          <p className="mp-page-subtitle">
            {isManager ? "Review and manage all facility booking requests." : "Book a facility and track your reservations."}
          </p>
        </div>
      </div>

      {/* Booking form — members & coaches only */}
      {!isManager && (
        <>
          {loading && facilities.length === 0 ? (
            <div className="mp-state-center" aria-busy="true">
              <Loader2 size={24} className="mp-spin" aria-hidden="true" />
              <span>Loading facilities…</span>
            </div>
          ) : (
            <BookingForm
              facilities={facilities}
              user={user}
              onCreated={() => {
                showToast("success", "Booking request submitted.");
                loadData();
              }}
            />
          )}
        </>
      )}

      {/* Bookings table */}
      <div className="bk-list-section">
        <div className="bk-list-header">
          <h2 className="bk-section-title">
            {isManager ? "All Bookings" : "My Bookings"}
          </h2>
          <button className="secondary-button" type="button" onClick={loadData}>
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
        </div>

        {loading && (
          <div className="mp-state-center" aria-busy="true">
            <Loader2 size={24} className="mp-spin" aria-hidden="true" />
            <span>Loading bookings…</span>
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
        {!loading && !error && sortedBookings.length === 0 && (
          <div className="mp-state-center">
            <CalendarDays size={32} color="#b8c9c2" aria-hidden="true" />
            <span className="mp-empty-heading">No bookings found</span>
            <span className="mp-empty-body">
              {isManager ? "No booking records yet." : "You have no bookings. Use the form above to get started."}
            </span>
          </div>
        )}
        {!loading && !error && sortedBookings.length > 0 && (
          <BookingsTable
            bookings={sortedBookings}
            facilitiesMap={facilitiesMap}
            isManager={isManager}
            onCancel={(b) => setCancelTarget(b)}
            onDecision={(b) => setDecisionTarget(b)}
          />
        )}
      </div>

      <CancelDialog
        open={!!cancelTarget}
        booking={cancelTarget}
        facilitiesMap={facilitiesMap}
        busy={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
      <DecisionDialog
        open={!!decisionTarget}
        booking={decisionTarget}
        facilitiesMap={facilitiesMap}
        busy={deciding}
        onConfirm={handleDecision}
        onCancel={() => setDecisionTarget(null)}
      />
    </section>
  );
}
