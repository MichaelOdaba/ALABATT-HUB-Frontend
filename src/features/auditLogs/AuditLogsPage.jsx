import { ClipboardList, Download, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuditLogs } from "../../services/auditLogsAPI.js";
import { actionTone, auditLogsCsv, auditUserLabel, filterAuditLogs, formatAuditDate, parseAuditResponse, readableAction } from "./auditLogUtils.js";

const initialState = { entries: [], error: "", isLoading: true, isPartial: false, next: null, previous: null };

function AuditLogFilters({ filters, logs, onChange, onClear }) {
  const actions = [...new Set(logs.map((log) => log.action).filter(Boolean))].sort();
  const entities = [...new Set(logs.map((log) => log.entity).filter(Boolean))].sort();
  return <div className="audit-filters"><label className="auth-field"><span>Action</span><select onChange={(event) => onChange("action", event.target.value)} value={filters.action}><option value="">All actions</option>{actions.map((action) => <option key={action} value={action}>{readableAction(action)}</option>)}</select></label><label className="auth-field"><span>Entity</span><select onChange={(event) => onChange("entity", event.target.value)} value={filters.entity}><option value="">All entities</option>{entities.map((entity) => <option key={entity} value={entity}>{entity}</option>)}</select></label><label className="auth-field"><span>From</span><input onChange={(event) => onChange("from", event.target.value)} type="date" value={filters.from} /></label><label className="auth-field"><span>To</span><input onChange={(event) => onChange("to", event.target.value)} type="date" value={filters.to} /></label><label className="auth-field audit-search"><span>Search</span><input onChange={(event) => onChange("search", event.target.value)} placeholder="User, action or entity ID" type="search" value={filters.search} /></label><button className="secondary-button audit-clear" onClick={onClear} type="button">Clear filters</button></div>;
}

function AuditLogsTable({ logs }) {
  return <div className="data-table-wrap"><table className="data-table audit-table"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Entity ID</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td>{formatAuditDate(log.timestamp)}</td><td>{auditUserLabel(log.user)}</td><td><span className={`status-chip status-chip-${actionTone(log.action)}`}>{readableAction(log.action)}</span></td><td>{log.entity || "—"}</td><td>{log.entity_id || "—"}</td></tr>)}</tbody></table></div>;
}

export default function AuditLogsPage() {
  const [state, setState] = useState(initialState);
  const [filters, setFilters] = useState({ action: "", entity: "", from: "", search: "", to: "" });
  const [isWaking, setIsWaking] = useState(false);
  const loadLogs = useCallback(async (url = "/api/audit-logs/") => {
    setState((current) => ({ ...current, error: "", isLoading: true }));
    try { setState({ ...parseAuditResponse(await getAuditLogs(url)), error: "", isLoading: false }); } catch (error) { setState((current) => ({ ...current, error: error.message || "Unable to load audit logs.", isLoading: false })); } finally { setIsWaking(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => setIsWaking(true), 2500); const loadTimer = window.setTimeout(loadLogs, 0); return () => { window.clearTimeout(timer); window.clearTimeout(loadTimer); }; }, [loadLogs]);
  const filteredLogs = useMemo(() => filterAuditLogs(state.entries, filters), [filters, state.entries]);
  const updateFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value }));
  function exportCsv() { const url = URL.createObjectURL(new Blob([auditLogsCsv(filteredLogs)], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "audit-logs.csv"; anchor.click(); URL.revokeObjectURL(url); }
  return <section className="page-panel audit-panel" aria-labelledby="audit-heading"><div className="page-kicker"><ClipboardList aria-hidden="true" size={15} strokeWidth={2.2} /><span>Insights</span></div><div className="page-heading"><div><h1 className="page-title" id="audit-heading">Audit logs</h1><p className="page-description">Read-only history of important centre activity.</p></div>{!state.isLoading && !state.error && filteredLogs.length > 0 && <button className="secondary-button" onClick={exportCsv} type="button"><Download size={15} /> Export CSV</button>}</div>{isWaking && state.isLoading && <p className="report-waking" role="status">Waking up the server...</p>}{!state.isLoading && state.error && <div className="page-state"><p className="page-state-message" role="alert">{state.error}</p><button className="secondary-button" onClick={() => loadLogs()} type="button"><RefreshCw size={15} /> Retry</button></div>}{state.isLoading && <div className="page-state">Loading audit logs...</div>}{!state.isLoading && !state.error && <><AuditLogFilters filters={filters} logs={state.entries} onChange={updateFilter} onClear={() => setFilters({ action: "", entity: "", from: "", search: "", to: "" })} /><p className="audit-count">Showing {filteredLogs.length} of {state.entries.length} entries</p>{state.isPartial && <p className="report-note">Only the loaded page is available. Use Next and Previous to view the remaining entries.</p>}{filteredLogs.length > 0 ? <AuditLogsTable logs={filteredLogs} /> : <div className="page-state">{state.entries.length ? "No results for these filters." : "No audit entries yet. Entries appear when bookings, payments, refunds and roles change."}</div>}{(state.next || state.previous) && <div className="audit-pagination"><button className="secondary-button" disabled={!state.previous} onClick={() => loadLogs(state.previous)} type="button">Previous</button><button className="secondary-button" disabled={!state.next} onClick={() => loadLogs(state.next)} type="button">Next</button></div>}</>}</section>;
}
