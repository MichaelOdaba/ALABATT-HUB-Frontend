import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  CalendarDays,
  Dumbbell,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";
import { getMemberships } from "../../services/membershipAPI.js";
import { getBookings, getFacilities, getEquipmentLoans } from "../../services/bookingsAPI.js";
import { getReportOverview } from "../../services/summaryAPI.js";
import { getPayments } from "../../services/reportsAPI.js";
import {
  formatNaira,
  formatReportDate,
  groupPaymentsByMonth,
  responseItems,
} from "../reports/reportsUtils.js";

// ─── Shared helpers ───────────────────────────────────────
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

function formatTime(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

function getFacilityName(booking, facilitiesMap) {
  const f = booking.facility;
  if (!f) return "—";
  if (typeof f === "object" && f !== null) return f.name ?? `Facility #${f.id}`;
  return facilitiesMap.get(f) ?? `Facility #${f}`;
}

// ─── Spinner ──────────────────────────────────────────────
function Spinner() {
  return (
    <div className="dash-state-center" aria-busy="true" aria-live="polite">
      <Loader2 size={24} className="mp-spin" aria-hidden="true" />
      <span>Loading…</span>
    </div>
  );
}

// ─── Error block ──────────────────────────────────────────
function ErrorBlock({ message, onRetry }) {
  return (
    <div className="dash-state-center dash-state--error" role="alert">
      <AlertCircle size={20} aria-hidden="true" />
      <span>{message}</span>
      {onRetry && (
        <button className="secondary-button" type="button" onClick={onRetry}>
          <RefreshCw size={14} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}

// ─── Member / Coach Home ──────────────────────────────────
function MemberHome({ user }) {
  const [memberships, setMemberships] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mData, bData, fData] = await Promise.all([
        getMemberships(),
        getBookings(),
        getFacilities(),
      ]);
      setMemberships(extractList(mData));
      setBookings(extractList(bData));
      setFacilities(extractList(fData));
    } catch (err) {
      setError(err.message || "Failed to load your data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const facilitiesMap = useMemo(
    () => new Map(facilities.map((f) => [f.id, f.name])),
    [facilities],
  );

  const activeMembership = memberships.find((m) => m.status === "active") ?? null;
  const pendingMembership = memberships.find((m) => m.status === "pending") ?? null;
  const displayMembership = activeMembership ?? pendingMembership;

  const now = new Date();
  const upcoming = bookings
    .filter((b) => {
      const d = new Date(b.date);
      return !Number.isNaN(d.getTime()) && d >= new Date(now.toDateString()) &&
        b.status !== "cancelled" && b.status !== "rejected";
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 8);

  const displayName = user?.first_name || user?.username || "there";

  return (
    <section className="dash-page" aria-labelledby="home-title">
      <div className="dash-welcome">
        <div>
          <h1 className="dash-welcome-heading" id="home-title">
            Welcome back, {displayName}!
          </h1>
          <p className="dash-welcome-sub">Here's what's happening with your account.</p>
        </div>
        <LayoutDashboard size={24} color="#638326" aria-hidden="true" />
      </div>

      {loading && <Spinner />}
      {!loading && error && <ErrorBlock message={error} onRetry={load} />}

      {!loading && !error && (
        <>
          {/* Membership Summary */}
          <div className="dash-section">
            <h2 className="dash-section-title">My Membership</h2>
            {displayMembership ? (
              <div className="dash-membership-card">
                <BadgeCheck size={18} color="#638326" aria-hidden="true" />
                <div>
                  <div className="dash-membership-plan">
                    {typeof displayMembership.membership_type === "object" && displayMembership.membership_type !== null
                      ? displayMembership.membership_type.name
                      : displayMembership.membership_type ?? "—"}
                  </div>
                  <div className="dash-membership-meta">
                    Status:{" "}
                    <span className={`status-chip status-chip-${displayMembership.status === "active" ? "success" : "warning"}`}>
                      {displayMembership.status}
                    </span>
                    {displayMembership.end_date && (
                      <span> · Expires {formatDate(displayMembership.end_date)}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="dash-empty-card">
                <BadgeCheck size={22} color="#b8c9c2" aria-hidden="true" />
                <p>You have no active membership.</p>
                <Link className="secondary-button" to="/membership-plans">
                  Browse plans
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="dash-section">
            <h2 className="dash-section-title">Quick Actions</h2>
            <div className="dash-quick-grid">
              <Link className="dash-quick-card" to="/bookings">
                <CalendarDays size={26} color="#173b34" aria-hidden="true" />
                <strong>Book a Facility</strong>
                <span>Reserve a gym, court, or studio</span>
              </Link>
              <Link className="dash-quick-card" to="/equipment">
                <Dumbbell size={26} color="#173b34" aria-hidden="true" />
                <strong>Borrow Equipment</strong>
                <span>Request equipment on loan</span>
              </Link>
            </div>
          </div>

          {/* Upcoming Bookings */}
          <div className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">Upcoming Bookings</h2>
              <Link className="secondary-button" to="/bookings">View all</Link>
            </div>
            {upcoming.length === 0 ? (
              <div className="dash-empty-card">
                <CalendarDays size={22} color="#b8c9c2" aria-hidden="true" />
                <p>No upcoming bookings.</p>
                <Link className="secondary-button" to="/bookings">Book a facility</Link>
              </div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table" aria-label="Upcoming bookings">
                  <thead>
                    <tr>
                      <th scope="col">Facility</th>
                      <th scope="col">Date</th>
                      <th scope="col">Start</th>
                      <th scope="col">End</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map((b) => (
                      <tr key={b.id}>
                        <td className="data-table-primary">{getFacilityName(b, facilitiesMap)}</td>
                        <td>{formatDate(b.date)}</td>
                        <td>{formatTime(b.start_time)}</td>
                        <td>{formatTime(b.end_time)}</td>
                        <td>
                          <span className={`status-chip status-chip-${
                            b.status === "approved" ? "success" :
                            b.status === "pending" ? "warning" : "neutral"
                          }`}>
                            {b.status ?? "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

// ─── Manager Dashboard ────────────────────────────────────
function ManagerDashboard() {
  const [overview, setOverview] = useState(null);
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loans, setLoans] = useState([]);
  const [ovLoading, setOvLoading] = useState(true);
  const [ovError, setOvError] = useState(null);
  const [pmLoading, setPmLoading] = useState(true);
  const [pmError, setPmError] = useState(null);

  const loadOverview = useCallback(async () => {
    setOvLoading(true);
    setOvError(null);
    try {
      const data = await getReportOverview();
      setOverview(data);
    } catch (err) {
      setOvError(err.message || "Failed to load overview.");
    } finally {
      setOvLoading(false);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    setPmLoading(true);
    setPmError(null);
    try {
      const [pmData, bkData, lnData] = await Promise.all([
        getPayments(),
        getBookings(),
        getEquipmentLoans(),
      ]);
      const pmList = Array.isArray(pmData) ? pmData : (pmData?.results ?? []);
      const bkList = Array.isArray(bkData) ? bkData : (bkData?.results ?? []);
      const lnList = Array.isArray(lnData) ? lnData : (lnData?.results ?? []);
      setPayments(pmList);
      setBookings(bkList);
      setLoans(lnList);
    } catch (err) {
      setPmError(err.message || "Failed to load payments.");
    } finally {
      setPmLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    loadPayments();
  }, [loadOverview, loadPayments]);

  const recentPayments = useMemo(
    () => [...payments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8),
    [payments],
  );

  const monthlyRevenue = useMemo(() => groupPaymentsByMonth(payments), [payments]);
  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.value), 1);

  // Derive pending bookings count from actual booking data
  const pendingBookingsCount = useMemo(
    () => bookings.filter((b) => b.status === "pending").length,
    [bookings],
  );

  // Derive active loans count
  const activeLoansCount = useMemo(
    () => loans.filter((l) => l.status === "active" || l.status === "pending deposit").length,
    [loans],
  );

  // Primary KPI cards (4) — matches prompt spec
  const primaryCards = [
    { label: "Revenue", value: overview ? formatNaira(overview.total_revenue) : "—", icon: Wallet, color: "#638326" },
    { label: "Active Memberships", value: overview?.active_memberships ?? "—", icon: BadgeCheck, color: "#173b34" },
    { label: "Pending Bookings", value: pmLoading ? "…" : pendingBookingsCount, icon: CalendarDays, color: "#876414" },
    { label: "Equipment on Loan", value: pmLoading ? "…" : activeLoansCount, icon: Dumbbell, color: "#173b34" },
  ];

  // Secondary metric cards
  const secondaryCards = [
    { label: "Total Members", value: overview?.total_members ?? "—", icon: Users, color: "#173b34" },
    { label: "Total Bookings", value: overview?.total_bookings ?? "—", icon: CalendarDays, color: "#638326" },
    { label: "Approved Bookings", value: overview?.approved_bookings ?? "—", icon: CalendarDays, color: "#173b34" },
    { label: "Pending Refunds", value: overview?.pending_refunds ?? "—", icon: TrendingUp, color: "#876414" },
  ];

  return (
    <section className="dash-page" aria-labelledby="dashboard-title">
      <div className="dash-welcome">
        <div>
          <h1 className="dash-welcome-heading" id="dashboard-title">Dashboard</h1>
          <p className="dash-welcome-sub">Operational overview of ALABATT HUB.</p>
        </div>
        <LayoutDashboard size={24} color="#638326" aria-hidden="true" />
      </div>

      {/* Primary KPI cards */}
      {ovLoading && !pmLoading ? (
        <Spinner />
      ) : ovError ? (
        <ErrorBlock message={ovError} onRetry={loadOverview} />
      ) : (
        <div className="dash-summary-grid">
          {primaryCards.map(({ label, value, icon: Icon, color }) => (
            <div className="dash-summary-card" key={label}>
              <div className="dash-summary-top">
                <span className="dash-summary-label">{label}</span>
                <Icon size={18} color={color} aria-hidden="true" />
              </div>
              <div className="dash-summary-value">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Secondary metrics */}
      {!ovLoading && !ovError && (
        <div className="dash-summary-grid" style={{ marginBottom: 24 }}>
          {secondaryCards.map(({ label, value, icon: Icon, color }) => (
            <div className="dash-summary-card" key={label} style={{ opacity: 0.85 }}>
              <div className="dash-summary-top">
                <span className="dash-summary-label" style={{ fontSize: 10 }}>{label}</span>
                <Icon size={14} color={color} aria-hidden="true" />
              </div>
              <div className="dash-summary-value" style={{ fontSize: 18 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="dash-two-col">
        {/* Revenue by month */}
        <section className="dash-panel" aria-labelledby="revenue-chart-title">
          <h2 className="dash-panel-title" id="revenue-chart-title">Revenue by Month</h2>
          {pmLoading ? (
            <div className="report-state"><Loader2 size={18} className="mp-spin" /></div>
          ) : pmError ? (
            <div className="report-state"><p role="alert">{pmError}</p></div>
          ) : monthlyRevenue.length === 0 ? (
            <div className="report-state">No paid payments yet.</div>
          ) : (
            <div className="bar-chart">
              {monthlyRevenue.map((month) => (
                <div className="bar-chart-item" key={month.key}>
                  <div className="bar-chart-value">{formatNaira(month.value)}</div>
                  <div className="bar-chart-track">
                    <div
                      className="bar-chart-bar"
                      style={{ height: `${Math.max((month.value / maxRevenue) * 100, 4)}%` }}
                    />
                  </div>
                  <span>{month.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent payments */}
        <section className="dash-panel" aria-labelledby="recent-pay-title">
          <h2 className="dash-panel-title" id="recent-pay-title">Recent Payments</h2>
          {pmLoading ? (
            <div className="report-state"><Loader2 size={18} className="mp-spin" /></div>
          ) : pmError ? (
            <div className="report-state"><p role="alert">{pmError}</p></div>
          ) : recentPayments.length === 0 ? (
            <div className="report-state">No payments yet.</div>
          ) : (
            <div className="data-table-wrap" style={{ marginTop: 0 }}>
              <table className="data-table report-small-table" aria-label="Recent payments">
                <thead>
                  <tr>
                    <th scope="col">Member</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p) => {
                    const member = p.user
                      ? typeof p.user === "object"
                        ? p.user.full_name ?? p.user.username ?? `User #${p.user.id}`
                        : `User #${p.user}`
                      : p.reference || p.receipt_number || `#${p.id}`;
                    return (
                      <tr key={p.id}>
                        <td className="data-table-primary">{member}</td>
                        <td>{formatNaira(p.amount)}</td>
                        <td>{formatReportDate(p.paid_at || p.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

// ─── Root export ──────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === "manager") return <ManagerDashboard />;
  return <MemberHome user={user} />;
}
