import { RefreshCw, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMembershipTypes, getMemberships } from "../../services/membershipsAPI.js";
import { useAuth } from "../auth/useAuth.js";

const STATUS_LABELS = {
  active: "Active",
  pending: "Pending",
  inactive: "Inactive",
  expired: "Expired",
};

const PAYMENT_LABELS = { paid: "Paid", unpaid: "Unpaid", partial: "Partial" };

function formatMembershipDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

function responseItems(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
}

function displayMember(user) {
  if (user && typeof user === "object") {
    return user.first_name || user.username || user.email || `Member #${user.id}`;
  }
  return user ? `Member #${user}` : "—";
}

function displayPlan(membership, typeNames) {
  const plan = membership.membership_type;
  if (plan && typeof plan === "object") return plan.name || `Plan #${plan.id}`;
  return typeNames.get(plan) || (plan ? `Plan #${plan}` : "—");
}

function StatusChip({ value, payment = false }) {
  const label = payment ? PAYMENT_LABELS[value] : STATUS_LABELS[value];
  const tone = payment
    ? value === "paid"
      ? "success"
      : "warning"
    : value === "active"
      ? "success"
      : value === "pending"
        ? "warning"
        : "danger";

  return <span className={`status-chip status-chip-${tone}`}>{label || value || "Unknown"}</span>;
}

function MembershipsTable({ memberships, typeNames, isManager }) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {isManager && <th scope="col">Member</th>}
            <th scope="col">Plan</th>
            <th scope="col">Start date</th>
            <th scope="col">End date</th>
            <th scope="col">Status</th>
            <th scope="col">Payment</th>
          </tr>
        </thead>
        <tbody>
          {memberships.map((membership) => (
            <tr key={membership.id}>
              {isManager && <td data-label="Member">{displayMember(membership.user)}</td>}
              <td data-label="Plan" className="data-table-primary">
                {displayPlan(membership, typeNames)}
              </td>
              <td data-label="Start date">{formatMembershipDate(membership.start_date)}</td>
              <td data-label="End date">{formatMembershipDate(membership.end_date)}</td>
              <td data-label="Status"><StatusChip value={membership.status} /></td>
              <td data-label="Payment"><StatusChip payment value={membership.payment_status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PageState({ children, action }) {
  return <div className="page-state">{children}{action}</div>;
}

export default function MembershipsPage() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [typeNames, setTypeNames] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isWaking, setIsWaking] = useState(false);
  const [error, setError] = useState("");
  const isManager = user?.role === "manager";

  const loadMemberships = useCallback(async () => {
    setIsLoading(true);
    setIsWaking(false);
    setError("");
    const wakingTimer = window.setTimeout(() => setIsWaking(true), 2500);
    try {
      const [membershipData, typeData] = await Promise.all([
        getMemberships(),
        getMembershipTypes(),
      ]);
      const names = new Map(
        responseItems(typeData).map((type) => [type.id, type.name]),
      );
      setTypeNames(names);
      setMemberships(
        responseItems(membershipData).sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        ),
      );
    } catch (requestError) {
      setError(requestError.message || "Unable to load memberships.");
    } finally {
      window.clearTimeout(wakingTimer);
      setIsLoading(false);
      setIsWaking(false);
    }
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(loadMemberships, 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadMemberships]);

  const heading = isManager ? "Manage memberships" : "Your memberships";

  return (
    <section className="page-panel" aria-labelledby="memberships-heading">
      <div className="page-kicker"><Users aria-hidden="true" size={15} strokeWidth={2.2} /><span>Memberships</span></div>
      <div className="page-heading">
        <div>
          <h1 className="page-title" id="memberships-heading">{heading}</h1>
          <p className="page-description">
            {isManager ? "Review membership records across the centre." : "Keep track of your plans and membership status."}
          </p>
        </div>
        <Link className="page-action" to="/membership-plans">Choose a plan</Link>
      </div>

      {isLoading && <PageState><span>{isWaking ? "Waking up the server..." : "Loading memberships..."}</span></PageState>}
      {!isLoading && error && (
        <PageState>
          <p className="page-state-message" role="alert">{error}</p>
          <button className="secondary-button" onClick={loadMemberships} type="button"><RefreshCw size={15} /> Retry</button>
        </PageState>
      )}
      {!isLoading && !error && memberships.length === 0 && (
        <PageState>
          <p className="page-state-message">You have no memberships yet. Choose a plan to get started.</p>
          <Link className="secondary-button" to="/membership-plans">View membership plans</Link>
        </PageState>
      )}
      {!isLoading && !error && memberships.length > 0 && (
        <MembershipsTable isManager={isManager} memberships={memberships} typeNames={typeNames} />
      )}
    </section>
  );
}
