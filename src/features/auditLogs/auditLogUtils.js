export const AUDIT_ACTION_LABELS = {
  booking_approved: "Booking approved",
  booking_rejected: "Booking rejected",
  equipment_returned: "Equipment returned",
  membership_approved: "Membership approved",
  membership_created: "Membership created",
  payment_confirmed: "Payment confirmed",
  refund_approved: "Refund approved",
  refund_rejected: "Refund rejected",
  role_changed: "Role changed",
};

export function readableAction(action) {
  return AUDIT_ACTION_LABELS[action] || String(action || "Unknown action").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function actionTone(action) {
  if (String(action).includes("approved") || action === "payment_confirmed") return "success";
  if (String(action).includes("rejected")) return "danger";
  return "neutral";
}

export function formatAuditDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function auditUserLabel(user) {
  if (user === null || user === undefined || user === "") return "System";
  if (typeof user === "object") return user.username || user.email || user.first_name || `User #${user.id}`;
  return `User #${user}`;
}

export function filterAuditLogs(logs, filters) {
  const query = filters.search.trim().toLowerCase();
  return logs.filter((log) => {
    const timestamp = log.timestamp ? new Date(log.timestamp) : null;
    const day = timestamp && !Number.isNaN(timestamp.getTime()) ? timestamp.toISOString().slice(0, 10) : "";
    return (!filters.action || log.action === filters.action) && (!filters.entity || log.entity === filters.entity) && (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to) && (!query || [auditUserLabel(log.user), log.action, log.entity, log.entity_id].some((value) => String(value || "").toLowerCase().includes(query)));
  });
}

export function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function auditLogsCsv(logs) {
  const rows = [["Time", "User", "Action", "Entity", "Entity ID"], ...logs.map((log) => [formatAuditDate(log.timestamp), auditUserLabel(log.user), readableAction(log.action), log.entity, log.entity_id])];
  return rows.map((row) => row.map(csvValue).join(",")).join("\r\n");
}

export function parseAuditResponse(data) {
  if (Array.isArray(data)) return { entries: data, next: null, previous: null, isPartial: false };
  const entries = Array.isArray(data?.results) ? data.results : [];
  return { entries, next: data?.next || null, previous: data?.previous || null, isPartial: Number.isFinite(data?.count) && data.count > entries.length };
}
