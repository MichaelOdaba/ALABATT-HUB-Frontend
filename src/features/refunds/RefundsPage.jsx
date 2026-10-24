import { RefreshCw, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getRefunds, updateRefund } from "../../services/refundsAPI.js";
import { useAuth } from "../auth/useAuth.js";
import { formatNaira } from "../reports/reportsUtils.js";

function responseItems(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
}

function paymentLabel(payment) {
  if (payment && typeof payment === "object") return payment.reference || `Payment #${payment.id}`;
  return payment ? `Payment #${payment}` : "—";
}

function statusTone(status) {
  return status === "approved" ? "success" : status === "rejected" ? "danger" : "warning";
}

function RefundsTable({ refunds, isManager, updatingId, onDecision }) {
  return <div className="data-table-wrap"><table className="data-table refunds-table"><thead><tr><th>Payment</th><th>Reason</th><th>Amount</th><th>Status</th>{isManager && <th>Review</th>}</tr></thead><tbody>{refunds.map((refund) => <tr key={refund.id}><td>{paymentLabel(refund.payment)}</td><td className="refund-reason">{refund.reason || "—"}</td><td className="data-table-primary">{formatNaira(refund.amount)}</td><td><span className={`status-chip status-chip-${statusTone(refund.status)}`}>{refund.status || "Unknown"}</span></td>{isManager && <td><div className="refund-actions"><button className="secondary-button refund-action" disabled={updatingId === refund.id || refund.status === "approved"} onClick={() => onDecision(refund.id, "approved")} type="button">Approve</button><button className="secondary-button refund-action refund-action-danger" disabled={updatingId === refund.id || refund.status === "rejected"} onClick={() => onDecision(refund.id, "rejected")} type="button">Reject</button></div></td>}</tr>)}</tbody></table></div>;
}

export default function RefundsPage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const [refunds, setRefunds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [updateError, setUpdateError] = useState("");
  const [isWaking, setIsWaking] = useState(false);

  const loadRefunds = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const timer = window.setTimeout(() => setIsWaking(true), 2500);
    try {
      setRefunds(responseItems(await getRefunds()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (requestError) {
      setError(requestError.message || "Unable to load refunds.");
    } finally {
      window.clearTimeout(timer);
      setIsLoading(false);
      setIsWaking(false);
    }
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(loadRefunds, 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadRefunds]);

  async function handleDecision(id, status) {
    setUpdatingId(id);
    setUpdateError("");
    try {
      const updated = await updateRefund(id, status);
      setRefunds((current) => current.map((refund) => refund.id === id ? updated : refund));
    } catch (requestError) {
      setUpdateError(requestError.message || "Unable to update this refund.");
    } finally {
      setUpdatingId(null);
    }
  }

  return <section className="page-panel refunds-panel" aria-labelledby="refunds-heading"><div className="page-kicker"><RotateCcw aria-hidden="true" size={15} strokeWidth={2.2} /><span>Operations</span></div><div className="page-heading"><div><h1 className="page-title" id="refunds-heading">Refunds</h1><p className="page-description">{isManager ? "Review refund requests and record decisions." : "Track your refund requests and their status."}</p></div></div>{isWaking && isLoading && <p className="report-waking" role="status">Waking up the server...</p>}{updateError && <p className="auth-error" role="alert">{updateError}</p>}{isLoading && <div className="page-state">Loading refunds...</div>}{!isLoading && error && <div className="page-state"><p className="page-state-message" role="alert">{error}</p><button className="secondary-button" onClick={loadRefunds} type="button"><RefreshCw size={15} /> Retry</button></div>}{!isLoading && !error && refunds.length === 0 && <div className="page-state">No refund requests yet.</div>}{!isLoading && !error && refunds.length > 0 && <RefundsTable isManager={isManager} onDecision={handleDecision} refunds={refunds} updatingId={updatingId} />}</section>;
}
