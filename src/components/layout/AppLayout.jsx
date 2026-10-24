import { ArrowUpRight, LogOut, Menu } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import { APP_ROUTES, ROUTE_GROUPS } from "../../utils/appRoutes.js";
import { useAuth } from "../../features/auth/useAuth.js";

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const activeRoute = APP_ROUTES.find(
    (route) => route.path === location.pathname,
  );

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <NavLink
          className="brand-lockup"
          to="/dashboard"
          aria-label="ALABATT Hub home"
        >
          <img className="brand-logo" src={logo} alt="" />
          <span className="brand-name">
            ALABATT<span>HUB</span>
          </span>
          <ArrowUpRight className="brand-arrow" size={15} aria-hidden="true" />
        </NavLink>

        <div className="sidebar-caption">Navigation</div>
        <nav className="sidebar-navigation" aria-label="Main navigation">
          {ROUTE_GROUPS.map((group) => {
            const groupRoutes = APP_ROUTES.filter(
              (route) =>
                route.group === group && route.allowedRoles.includes(user.role),
            );

            if (groupRoutes.length === 0) {
              return null;
            }

            return (
              <div className="navigation-group" key={group}>
                <h2 className="navigation-group-title">{group}</h2>
                {groupRoutes.map((route) => {
                  const Icon = route.icon;

                  return (
                    <NavLink
                      className={({ isActive }) =>
                        `navigation-link${isActive ? " is-active" : ""}`
                      }
                      end
                      key={route.path}
                      to={route.path}
                    >
                      <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                      <span>{route.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="workspace-mark">AH</div>
          <div className="workspace-copy">
            <span>ALABATT</span>
            <small>Member services</small>
          </div>
          <Menu size={16} aria-hidden="true" />
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="header-context">
            <span className="header-eyebrow">ALABATT HUB</span>
            <span className="header-divider" aria-hidden="true">
              /
            </span>
            <span className="header-page-title">
              {activeRoute?.label ?? "Page not found"}
            </span>
          </div>
          <div className="account-actions">
            <span className="account-user">
              {user.first_name || user.username}
            </span>
            <button
              className="account-button"
              onClick={handleLogout}
              type="button"
            >
              <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
