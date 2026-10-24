export function responseItems(data) {
  if (Array.isArray(data)) return { items: data, isPartial: false };
  const items = Array.isArray(data?.results) ? data.results : [];
  return { items, isPartial: Number.isFinite(data?.count) && data.count > items.length };
}

export function formatNaira(value) {
  return new Intl.NumberFormat("en-NG", {
    currency: "NGN",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number(value) || 0);
}

export function formatReportDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

export function formatReportMonth(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(date);
}

export function groupPaymentsByMonth(payments) {
  const grouped = new Map();
  payments
    .filter((payment) => payment.status === "paid" && payment.paid_at)
    .forEach((payment) => {
      const date = new Date(payment.paid_at);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      const current = grouped.get(key) || { key, label: formatReportMonth(payment.paid_at), value: 0 };
      current.value += Number(payment.amount) || 0;
      grouped.set(key, current);
    });
  return [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function groupBookingsByFacility(bookings, facilityNames) {
  const grouped = new Map();
  bookings.forEach((booking) => {
    const facility = booking.facility;
    const name = facility && typeof facility === "object"
      ? facility.name || `Facility #${facility.id}`
      : facilityNames.get(facility) || (facility ? `Facility #${facility}` : "Unknown facility");
    grouped.set(name, (grouped.get(name) || 0) + 1);
  });
  return [...grouped.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

export function sumPaymentsByPurpose(payments) {
  const totals = { Membership: 0, Booking: 0, "Equipment deposit": 0 };
  payments.forEach((payment) => {
    if (payment.status !== "paid") return;
    const purpose = payment.membership
      ? "Membership"
      : payment.booking
        ? "Booking"
        : payment.equipment_loan
          ? "Equipment deposit"
          : null;
    if (purpose) totals[purpose] += Number(payment.amount) || 0;
  });
  return Object.entries(totals).map(([purpose, value]) => ({ purpose, value }));
}

export function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function buildPaymentsCsv(payments) {
  const headers = ["Receipt number", "Reference", "Purpose", "Amount", "Status", "Paid date"];
  const rows = payments.map((payment) => [
    payment.receipt_number,
    payment.reference,
    payment.membership ? "Membership" : payment.booking ? "Booking" : payment.equipment_loan ? "Equipment deposit" : "Other",
    formatNaira(payment.amount),
    payment.status,
    formatReportDate(payment.paid_at),
  ]);
  return [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\r\n");
}
