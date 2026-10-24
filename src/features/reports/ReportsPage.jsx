import { BarChart3, Download, RefreshCw, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getReportOverview } from "../../services/summaryAPI.js";
import { getBookings, getFacilities, getPayments } from "../../services/reportsAPI.js";
import {
  buildPaymentsCsv,
  formatNaira,
  formatReportDate,
  groupBookingsByFacility,
  groupPaymentsByMonth,
  responseItems,
  sumPaymentsByPurpose,
} from "./reportsUtils.js";

const initialSection = { data: null, error: "", loading: true };

function SectionState({ section, onRetry, emptyMessage = "No data yet." }) {
  if (section.loading) return <div className="report-state">Loading...</div>;
  if (section.error) {
    return <div className="report-state"><p role="alert">{section.error}</p><button className="secondary-button" onClick={onRetry} type="button"><RefreshCw size={15} /> Retry</button></div>;
  }
  if (!section.data?.length) return <div className="report-state">{emptyMessage}</div>;
  return null;
}

function SummaryTiles({ overview, section, onRetry }) {
  const tiles = [
    ["Total members", overview?.total_members, "number"],
    ["Active memberships", overview?.active_memberships, "number"],
    ["Total bookings", overview?.total_bookings, "number"],
    ["Approved bookings", overview?.approved_bookings, "number"],
    ["Pending refunds", overview?.pending_refunds, "number"],
    ["Total revenue", overview?.total_revenue, "money"],
  ];
  return <section className="report-section" aria-labelledby="summary-heading"><h2 className="report-section-title" id="summary-heading">Summary</h2>{section.loading && <div className="report-state">Loading...</div>}{section.error && <div className="report-state"><p role="alert">{section.error}</p><button className="secondary-button" onClick={onRetry} type="button"><RefreshCw size={15} /> Retry</button></div>}{!section.loading && !section.error && <div className="summary-tiles">{tiles.map(([label, value, type]) => <div className="summary-tile" key={label}><span>{label}</span><strong>{type === "money" ? formatNaira(value) : value ?? "—"}</strong></div>)}</div>}</section>;
}

function RevenueChart({ payments, section, onRetry }) {
  const months = groupPaymentsByMonth(payments || []);
  const max = Math.max(...months.map((month) => month.value), 1);
  return <section className="report-section" aria-labelledby="revenue-heading"><div className="report-section-heading"><h2 className="report-section-title" id="revenue-heading">Revenue by month</h2></div><SectionState section={{ ...section, data: months }} onRetry={onRetry} emptyMessage="No paid payments yet." />{!section.loading && !section.error && months.length > 0 && <div className="bar-chart">{months.map((month) => <div className="bar-chart-item" key={month.key}><div className="bar-chart-value">{formatNaira(month.value)}</div><div className="bar-chart-track"><div className="bar-chart-bar" style={{ height: `${Math.max((month.value / max) * 100, 5)}%` }} /></div><span>{month.label}</span></div>)}</div>}</section>;
}

function FacilityBars({ bookings, facilities, facilitiesSection, section, onRetry }) {
  const names = new Map((facilities || []).map((facility) => [facility.id, facility.name]));
  const groups = groupBookingsByFacility(bookings || [], names);
  const max = Math.max(...groups.map((group) => group.value), 1);
  const combinedSection = { data: groups, error: section.error || facilitiesSection.error, loading: section.loading || facilitiesSection.loading };
  return <section className="report-section" aria-labelledby="facility-heading"><h2 className="report-section-title" id="facility-heading">Bookings by facility</h2><SectionState section={combinedSection} onRetry={onRetry} />{!combinedSection.loading && !combinedSection.error && groups.length > 0 && <div className="horizontal-bars">{groups.map((group) => <div className="horizontal-bar" key={group.name}><div className="horizontal-bar-label"><span>{group.name}</span><strong>{group.value}</strong></div><div className="horizontal-bar-track"><div className="horizontal-bar-fill" style={{ width: `${(group.value / max) * 100}%` }} /></div></div>)}</div>}</section>;
}

function PaymentsPurpose({ payments, section, onRetry }) {
  const totals = sumPaymentsByPurpose(payments || []);
  return <section className="report-section" aria-labelledby="purpose-heading"><h2 className="report-section-title" id="purpose-heading">Payments by purpose</h2><SectionState section={{ ...section, data: totals.filter((item) => item.value > 0) }} onRetry={onRetry} emptyMessage="No paid payments yet." />{!section.loading && !section.error && totals.some((item) => item.value > 0) && <table className="data-table report-small-table"><thead><tr><th>Purpose</th><th>Total</th></tr></thead><tbody>{totals.map((item) => <tr key={item.purpose}><td>{item.purpose}</td><td className="data-table-primary">{formatNaira(item.value)}</td></tr>)}</tbody></table>}</section>;
}

function RecentPaymentsTable({ payments, section, onRetry, onExport }) {
  const recent = [...(payments || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
  return <section className="report-section report-wide-section" aria-labelledby="recent-heading"><div className="report-section-heading"><h2 className="report-section-title" id="recent-heading">Recent payments</h2>{!section.loading && !section.error && recent.length > 0 && <button className="secondary-button" onClick={onExport} type="button"><Download size={15} /> Export CSV</button>}</div><SectionState section={{ ...section, data: recent }} onRetry={onRetry} emptyMessage="No payments yet." />{!section.loading && !section.error && recent.length > 0 && <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Receipt number</th><th>Reference</th><th>Purpose</th><th>Amount</th><th>Status</th><th>Paid date</th></tr></thead><tbody>{recent.map((payment) => <tr key={payment.id}><td>{payment.receipt_number || "—"}</td><td>{payment.reference || "—"}</td><td>{payment.membership ? "Membership" : payment.booking ? "Booking" : payment.equipment_loan ? "Equipment deposit" : "Other"}</td><td className="data-table-primary">{formatNaira(payment.amount)}</td><td><span className={`status-chip status-chip-${payment.status === "paid" ? "success" : payment.status === "pending" ? "warning" : "danger"}`}>{payment.status}</span></td><td>{formatReportDate(payment.paid_at)}</td></tr>)}</tbody></table></div>}</section>;
}

export default function ReportsPage() {
  const [overview, setOverview] = useState(initialSection);
  const [payments, setPayments] = useState(initialSection);
  const [bookings, setBookings] = useState(initialSection);
  const [facilities, setFacilities] = useState(initialSection);
  const [isWaking, setIsWaking] = useState(false);

  const loadSection = useCallback(async (setter, request, parse = responseItems) => {
    setter({ data: null, error: "", loading: true });
    try {
      const data = await request();
      const parsed = parse(data);
      setter({ data: parsed.items, error: parsed.isPartial ? "Only the first page of this report is available." : "", loading: false });
    } catch (error) {
      setter({ data: null, error: error.message || "Unable to load this report section.", loading: false });
    } finally {
      setIsWaking(false);
    }
  }, []);

  const loadAll = useCallback(() => {
    loadSection(setOverview, getReportOverview, (data) => ({ items: data, isPartial: false }));
    loadSection(setPayments, getPayments);
    loadSection(setBookings, getBookings);
    loadSection(setFacilities, getFacilities);
  }, [loadSection]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsWaking(true), 2500);
    loadAll();
    return () => window.clearTimeout(timer);
  }, [loadAll]);

  const paidTotal = useMemo(() => (payments.data || []).filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0), [payments.data]);
  const revenueDiffers = overview.data && Math.abs(paidTotal - Number(overview.data.total_revenue || 0)) > 0.01;

  function exportPayments() {
    const csv = buildPaymentsCsv([...(payments.data || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "recent-payments.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <section className="page-panel reports-panel" aria-labelledby="reports-heading"><div className="page-kicker"><BarChart3 aria-hidden="true" size={15} strokeWidth={2.2} /><span>Insights</span></div><div className="page-heading"><div><h1 className="page-title" id="reports-heading">Reports</h1><p className="page-description">A read-only view of centre activity and revenue.</p></div><Wallet aria-hidden="true" color="#638326" size={23} /></div>{isWaking && <p className="report-waking" role="status">Waking up the server...</p>}<div className="reports-grid"><SummaryTiles onRetry={() => loadSection(setOverview, getReportOverview, (data) => ({ items: data, isPartial: false }))} overview={overview.data} section={overview} /><RevenueChart onRetry={() => loadSection(setPayments, getPayments)} payments={payments.data} section={payments} /><FacilityBars bookings={bookings.data} facilities={facilities.data} facilitiesSection={facilities} onRetry={() => { loadSection(setBookings, getBookings); loadSection(setFacilities, getFacilities); }} section={bookings} /><PaymentsPurpose onRetry={() => loadSection(setPayments, getPayments)} payments={payments.data} section={payments} /><RecentPaymentsTable onExport={exportPayments} onRetry={() => loadSection(setPayments, getPayments)} payments={payments.data} section={payments} /></div>{revenueDiffers && <p className="report-note">The paid payment total ({formatNaira(paidTotal)}) differs from the overview revenue value ({formatNaira(overview.data.total_revenue)}).</p>}</section>;
}
