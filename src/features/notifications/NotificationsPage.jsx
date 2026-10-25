import { Bell, CheckCheck, Loader2, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/useAuth.js";
import {
  createNotification,
  deleteNotification,
  getNotifications,
  markNotificationRead,
  updateNotification,
} from "../../services/notificationsAPI.js";

const EMPTY_FORM = { message: "", notification_type: "general", title: "", user: "" };

function responseItems(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
}

function formatNotificationDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function recipientLabel(notification) {
  const user = notification.user;
  if (!user) return "—";
  if (typeof user === "object") return user.full_name ?? user.username ?? `User #${user.id}`;
  return `User #${user}`;
}

function NotificationEditor({ form, isEditing, busy, onChange, onClose, onSubmit, error }) {
  return <div className="notification-editor"><div className="notification-editor-heading"><h2>{isEditing ? "Edit notification" : "New notification"}</h2><button className="mp-modal-close" onClick={onClose} type="button" aria-label="Close"><X size={18} /></button></div>{error && <p className="auth-error" role="alert">{error}</p>}<form className="notification-form" onSubmit={onSubmit}><label className="auth-field"><span>Recipient user ID</span><input required min="1" onChange={(event) => onChange("user", event.target.value)} type="number" value={form.user} /></label><label className="auth-field"><span>Title</span><input required maxLength={200} onChange={(event) => onChange("title", event.target.value)} value={form.title} /></label><label className="auth-field"><span>Type</span><input maxLength={50} onChange={(event) => onChange("notification_type", event.target.value)} value={form.notification_type} /></label><label className="auth-field notification-message-field"><span>Message</span><textarea required onChange={(event) => onChange("message", event.target.value)} rows="4" value={form.message} /></label><div className="notification-editor-actions"><button className="secondary-button" onClick={onClose} type="button">Cancel</button><button className="page-action page-action-primary" disabled={busy} type="submit">{busy && <Loader2 size={14} className="mp-spin" />}{isEditing ? "Save changes" : "Send notification"}</button></div></form></div>;
}

function NotificationsTable({ notifications, isManager, onEdit, onDelete, onMarkRead }) {
  return <div className="data-table-wrap notification-table-wrap"><table className="data-table" aria-label="Notifications"><thead><tr><th>Time</th>{isManager && <th>Recipient</th>}<th>Notification</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead><tbody>{notifications.map((notification) => <tr className={notification.is_read ? "" : "notification-unread"} key={notification.id}><td>{formatNotificationDate(notification.created_at)}</td>{isManager && <td>{recipientLabel(notification)}</td>}<td className="notification-content"><strong>{notification.title}</strong><span>{notification.message}</span></td><td><span className="status-chip status-chip-neutral">{notification.notification_type || "general"}</span></td><td><span className={`status-chip status-chip-${notification.is_read ? "neutral" : "warning"}`}>{notification.is_read ? "Read" : "Unread"}</span></td><td><div className="notification-actions">{!isManager && !notification.is_read && <button className="secondary-button notification-action" onClick={() => onMarkRead(notification.id)} type="button"><CheckCheck size={14} /> Mark read</button>}{isManager && <><button className="secondary-button notification-action" onClick={() => onEdit(notification)} type="button"><Pencil size={14} /> Edit</button><button className="secondary-button notification-action notification-action-danger" onClick={() => onDelete(notification.id)} type="button"><Trash2 size={14} /> Delete</button></>}</div></td></tr>)}</tbody></table></div>;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isWaking, setIsWaking] = useState(false);
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true); setError("");
    const timer = window.setTimeout(() => setIsWaking(true), 2500);
    try { setNotifications(responseItems(await getNotifications()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))); }
    catch (requestError) { setError(requestError.message || "Unable to load notifications."); }
    finally { window.clearTimeout(timer); setLoading(false); setIsWaking(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(loadNotifications, 0); return () => window.clearTimeout(timer); }, [loadNotifications]);

  const visibleNotifications = useMemo(() => filter === "unread" ? notifications.filter((notification) => !notification.is_read) : notifications, [filter, notifications]);
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  function openCreate() { setForm(EMPTY_FORM); setFormError(""); setEditor({ notification: null }); }
  function openEdit(notification) { setForm({ message: notification.message ?? "", notification_type: notification.notification_type ?? "general", title: notification.title ?? "", user: typeof notification.user === "object" ? notification.user.id : notification.user ?? "" }); setFormError(""); setEditor({ notification }); }
  function closeEditor() { if (!saving) setEditor(null); }

  async function handleSubmit(event) {
    event.preventDefault(); setSaving(true); setFormError("");
    const payload = { ...form, user: Number(form.user) };
    try { if (editor.notification) await updateNotification(editor.notification.id, payload); else await createNotification(payload); setEditor(null); await loadNotifications(); }
    catch (requestError) { setFormError(requestError.message || "Unable to save notification."); }
    finally { setSaving(false); }
  }

  async function handleMarkRead(id) { try { const updated = await markNotificationRead(id); setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, ...(updated || {}), is_read: true } : notification)); } catch (requestError) { setError(requestError.message || "Unable to mark notification as read."); } }
  async function handleDelete(id) { if (!window.confirm("Delete this notification?")) return; try { await deleteNotification(id); setNotifications((current) => current.filter((notification) => notification.id !== id)); } catch (requestError) { setError(requestError.message || "Unable to delete notification."); } }

  return <section className="page-panel notifications-panel" aria-labelledby="notifications-heading"><div className="page-kicker"><Bell aria-hidden="true" size={15} strokeWidth={2.2} /><span>Updates</span></div><div className="page-heading"><div><h1 className="page-title" id="notifications-heading">Notifications</h1><p className="page-description">{isManager ? "Create and manage centre notifications." : "Stay up to date with your centre activity."}</p></div><div className="notification-header-actions"><button className="secondary-button" onClick={loadNotifications} type="button"><RefreshCw size={15} /> Refresh</button>{isManager && <button className="page-action page-action-primary" onClick={openCreate} type="button"><Plus size={15} /> New notification</button>}</div></div>{isWaking && loading && <p className="report-waking" role="status">Waking up the server...</p>}{editor && <NotificationEditor busy={saving} error={formError} form={form} isEditing={!!editor.notification} onChange={updateForm} onClose={closeEditor} onSubmit={handleSubmit} />}{error && <div className="page-state"><p className="page-state-message" role="alert">{error}</p><button className="secondary-button" onClick={loadNotifications} type="button"><RefreshCw size={15} /> Retry</button></div>}{!loading && !error && <><div className="notification-toolbar"><span>{unreadCount} unread</span><div className="notification-filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")} type="button">All</button><button className={filter === "unread" ? "active" : ""} onClick={() => setFilter("unread")} type="button">Unread</button></div></div>{visibleNotifications.length ? <NotificationsTable isManager={isManager} notifications={visibleNotifications} onDelete={handleDelete} onEdit={openEdit} onMarkRead={handleMarkRead} /> : <div className="page-state">{notifications.length ? "No unread notifications." : "No notifications yet."}</div>}</>}{loading && <div className="page-state">Loading notifications...</div>}</section>;
}
