import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Dumbbell,
  Loader2,
  Package,
  RefreshCw,
  X,
} from "lucide-react";
import { useAuth } from "../auth/useAuth.js";
import {
  getEquipmentLoans,
  processEquipmentReturn,
  updateEquipmentLoan,
} from "../../services/bookingsAPI.js";
import { formatNaira, formatReportDate } from "../reports/reportsUtils.js";

// ─── Helpers ──────────────────────────────────────────────
function extractList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

function getEquipmentName(loan) {
  const e = loan.equipment;
  if (!e) return "—";
  if (typeof e === "object" && e !== null) return e.name ?? `Equipment #${e.id}`;
  return `Equipment #${e}`;
}

function getUserDisplay(loan) {
  const u = loan.user;
  if (!u) return "—";
  if (typeof u === "object" && u !== null) return u.full_name ?? u.username ?? `User #${u.id}`;
  return `User #${u}`;
}

// ─── Status chip helper ───────────────────────────────────
const LOAN_STATUS_MAP = {
  "pending deposit": "mp-chip mp-chip--amber",
  active: "mp-chip mp-chip--green",
  returned: "mp-chip mp-chip--green",
  overdue: "mp-chip mp-chip--red",
  lost: "mp-chip mp-chip--red",
  cancelled: "mp-chip mp-chip--neutral",
};

function LoanStatusChip({ status }) {
  const cls = (status && LOAN_STATUS_MAP[status.toLowerCase()]) || "mp-chip mp-chip--neutral";
  return (
    <span className={cls} aria-label={`Status: ${status ?? "unknown"}`}>
      {status ?? "unknown"}
    </span>
  );
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

// ─── Return Dialog ────────────────────────────────────────
function ReturnDialog({ open, loan, onClose, onSubmit, busy }) {
  const [depositStatus, setDepositStatus] = useState("returned");
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    if (open) { setDepositStatus("returned"); setServerError(null); }
  }, [open]);

  if (!open || !loan) return null;

  return (
    <div className="mp-overlay" role="dialog" aria-modal="true" aria-labelledby="return-title">
      <div className="mp-modal mp-modal--sm">
        <div className="mp-modal-header">
          <h2 className="mp-modal-title" id="return-title">Process Return</h2>
          <button className="mp-modal-close" onClick={onClose} type="button" aria-label="Close" disabled={busy}><X size={18} /></button>
        </div>

        <dl className="mp-review-dl">
          <div className="mp-review-row">
            <dt>Equipment</dt>
            <dd>{getEquipmentName(loan)}</dd>
          </div>
          <div className="mp-review-row">
            <dt>Member</dt>
            <dd>{getUserDisplay(loan)}</dd>
          </div>
          {loan.quantity != null && (
            <div className="mp-review-row">
              <dt>Quantity</dt>
              <dd>{loan.quantity}</dd>
            </div>
          )}
          {loan.deposit_amount != null && (
            <div className="mp-review-row">
              <dt>Deposit</dt>
              <dd>{formatNaira(loan.deposit_amount)}</dd>
            </div>
          )}
        </dl>

        <div className="mp-field">
          <label className="mp-label" htmlFor="deposit-outcome">Deposit outcome</label>
          <div className="mp-select-wrap">
            <select
              id="deposit-outcome"
              className="mp-input mp-select"
              value={depositStatus}
              onChange={(e) => setDepositStatus(e.target.value)}
            >
              <option value="returned">Returned — give deposit back</option>
              <option value="forfeited">Forfeited — keep deposit</option>
            </select>
            <span className="mp-select-arrow" aria-hidden="true">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>

        {serverError && (
          <div className="mp-form-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" /> {serverError}
          </div>
        )}

        <div className="mp-modal-actions">
          <button className="mp-btn mp-btn--ghost" onClick={onClose} disabled={busy} type="button">Cancel</button>
          <button
            className="mp-btn mp-btn--primary"
            onClick={() => onSubmit(loan.id, depositStatus, setServerError)}
            disabled={busy}
            type="button"
          >
            {busy && <Loader2 size={14} className="mp-spin" aria-hidden="true" />}
            Confirm return
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusDialog({ target, onClose, onConfirm, busy }) {
  if (!target) return null;
  const approving = target.status === "active";
  return (
    <div className="mp-overlay" role="dialog" aria-modal="true" aria-labelledby="loan-status-title">
      <div className="mp-modal mp-modal--sm">
        <div className="mp-modal-header">
          <h2 className="mp-modal-title" id="loan-status-title">{approving ? "Approve loan" : "Cancel loan"}</h2>
          <button className="mp-modal-close" onClick={onClose} type="button" aria-label="Close" disabled={busy}><X size={18} /></button>
        </div>
        <p className="mp-modal-body">
          {approving ? "Approve" : "Cancel"} the equipment loan for <strong>{getUserDisplay(target.loan)}</strong>?
        </p>
        <div className="mp-modal-actions">
          <button className="mp-btn mp-btn--ghost" onClick={onClose} disabled={busy} type="button">Keep</button>
          <button className={`mp-btn mp-btn--${approving ? "primary" : "danger"}`} onClick={onConfirm} disabled={busy} type="button">
            {busy && <Loader2 size={14} className="mp-spin" aria-hidden="true" />}
            {approving ? "Approve loan" : "Cancel loan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function EquipmentLoansPage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [returnTarget, setReturnTarget] = useState(null);
  const [returning, setReturning] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchRef = useRef(false);

  const loadData = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await getEquipmentLoans();
      setLoans(extractList(data).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (err) {
      setError(err.message || "Failed to load loan records.");
    } finally {
      setLoading(false);
      fetchRef.current = false;
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function showToast(type, message) { setToast({ type, message }); }

  async function handleReturn(id, depositStatus, setServerError) {
    setReturning(true);
    try {
      await processEquipmentReturn(id, { deposit_status: depositStatus });
      setReturnTarget(null);
      showToast("success", "Return processed successfully.");
      await loadData();
    } catch (err) {
      setServerError(err.message || "Failed to process return.");
    } finally {
      setReturning(false);
    }
  }

  async function handleStatusUpdate() {
    if (!statusTarget) return;
    setStatusUpdating(true);
    try {
      await updateEquipmentLoan(statusTarget.loan.id, { status: statusTarget.status });
      setStatusTarget(null);
      showToast("success", `Loan ${statusTarget.status === "active" ? "approved" : "cancelled"}.`);
      await loadData();
    } catch (err) {
      showToast("error", err.message || "Failed to update loan status.");
    } finally {
      setStatusUpdating(false);
    }
  }

  const returnableStatuses = ["active", "overdue"];
  const canReturn = (loan) => isManager && returnableStatuses.includes(loan.status?.toLowerCase());

  return (
    <section className="mp-page" aria-labelledby="el-page-title">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <div className="mp-page-header">
        <div>
          <h1 className="mp-page-title" id="el-page-title">
            {isManager ? "Loan Management" : "My Equipment Loans"}
          </h1>
          <p className="mp-page-subtitle">
            {isManager
              ? "View and process equipment loan returns."
              : "Track your equipment loans and deposit status."}
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={loadData}>
          <RefreshCw size={14} aria-hidden="true" /> Refresh
        </button>
      </div>

      {loading && (
        <div className="mp-state-center" aria-busy="true">
          <Loader2 size={24} className="mp-spin" aria-hidden="true" />
          <span>Loading loans…</span>
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
      {!loading && !error && loans.length === 0 && (
        <div className="mp-state-center">
          <Package size={32} color="#b8c9c2" aria-hidden="true" />
          <span className="mp-empty-heading">No loan records found</span>
          <span className="mp-empty-body">
            {isManager
              ? "No equipment loans have been requested yet."
              : "You have no loan records. Visit Equipment Loans to request one."}
          </span>
        </div>
      )}
      {!loading && !error && loans.length > 0 && (
        <div className="mp-table-wrap">
          <table className="mp-table" aria-label={isManager ? "All equipment loans" : "My equipment loans"}>
            <thead>
              <tr>
                {isManager && <th scope="col">Member</th>}
                <th scope="col">Equipment</th>
                {isManager && <th scope="col">Qty</th>}
                <th scope="col">Requested</th>
                <th scope="col">Due date</th>
                <th scope="col">Return date</th>
                <th scope="col">Deposit</th>
                <th scope="col">Status</th>
                {isManager && <th scope="col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  {isManager && <td>{getUserDisplay(loan)}</td>}
                  <td className="data-table-primary" style={{ color: "var(--ink)" }}>{getEquipmentName(loan)}</td>
                  {isManager && <td>{loan.quantity ?? "—"}</td>}
                  <td>{formatReportDate(loan.created_at)}</td>
                  <td>{loan.due_date ? formatReportDate(loan.due_date) : "—"}</td>
                  <td>{loan.returned_at ? formatReportDate(loan.returned_at) : "—"}</td>
                  <td>
                    {loan.deposit_amount != null ? formatNaira(loan.deposit_amount) : "—"}
                    {loan.deposit_status && (
                      <span className={`mp-chip ${
                        loan.deposit_status === "returned" ? "mp-chip--green" :
                        loan.deposit_status === "forfeited" ? "mp-chip--red" : "mp-chip--amber"
                      }`} style={{ marginLeft: 6 }}>
                        {loan.deposit_status}
                      </span>
                    )}
                  </td>
                  <td>
                    <LoanStatusChip status={loan.status} />
                  </td>
                  {isManager && (
                    <td>
                      {loan.status?.toLowerCase() === "pending" && (
                        <>
                          <button
                            className="secondary-button refund-action"
                            type="button"
                            onClick={() => setStatusTarget({ loan, status: "active" })}
                          >
                            Approve
                          </button>
                          <button
                            className="secondary-button refund-action refund-action-danger"
                            type="button"
                            onClick={() => setStatusTarget({ loan, status: "cancelled" })}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {canReturn(loan) && (
                        <button
                          className="secondary-button refund-action"
                          type="button"
                          onClick={() => setReturnTarget(loan)}
                          aria-label={`Process return for ${getEquipmentName(loan)}`}
                        >
                          <Dumbbell size={13} aria-hidden="true" /> Return
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReturnDialog
        open={!!returnTarget}
        loan={returnTarget}
        busy={returning}
        onClose={() => setReturnTarget(null)}
        onSubmit={handleReturn}
      />
      <StatusDialog
        target={statusTarget}
        busy={statusUpdating}
        onConfirm={handleStatusUpdate}
        onClose={() => setStatusTarget(null)}
      />
    </section>
  );
}
