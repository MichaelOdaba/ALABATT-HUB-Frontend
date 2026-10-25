import "./App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";
import AuthLayout from "./components/layout/AuthLayout.jsx";
import RoutePlaceholder from "./components/ui/RoutePlaceholder.jsx";
import { AuthProvider } from "./features/auth/AuthContext.jsx";
import LoginPage from "./features/auth/LoginPage.jsx";
import ProtectedRoute from "./features/auth/ProtectedRoute.jsx";
import RegisterPage from "./features/auth/RegisterPage.jsx";
import DashboardPage from "./features/dashboard/DashboardPage.jsx";
import MembershipsPage from "./features/memberships/MembershipsPage.jsx";
import MembershipPlansPage from "./features/memberships/membershipPlansPage.jsx";
import BookingsPage from "./features/bookings/BookingsPage.jsx";
import FacilitiesPage from "./features/facilities/FacilitiesPage.jsx";
import EquipmentPage from "./features/equipment/EquipmentPage.jsx";
import EquipmentLoansPage from "./features/equipmentLoans/EquipmentLoansPage.jsx";
import ReportsPage from "./features/reports/ReportsPage.jsx";
import AuditLogsPage from "./features/auditLogs/AuditLogsPage.jsx";
import RefundsPage from "./features/refunds/RefundsPage.jsx";
import NotificationsPage from "./features/notifications/NotificationsPage.jsx";
import { APP_ROUTES, PUBLIC_ROUTES } from "./utils/appRoutes.js";

function resolvePageComponent(path) {
  switch (path) {
    case "/dashboard": return <DashboardPage />;
    case "/membership-plans": return <MembershipPlansPage />;
    case "/memberships": return <MembershipsPage />;
    case "/bookings": return <BookingsPage />;
    case "/facilities": return <FacilitiesPage />;
    case "/equipment": return <EquipmentPage />;
    case "/equipment-loans": return <EquipmentLoansPage />;
    case "/reports": return <ReportsPage />;
    case "/audit-logs": return <AuditLogsPage />;
    case "/refunds": return <RefundsPage />;
    case "/notifications": return <NotificationsPage />;
    default: return null;
  }
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AuthLayout />}>
            {PUBLIC_ROUTES.map((route) => (
              <Route
                element={
                  route.path === "/login" ? <LoginPage /> : <RegisterPage />
                }
                key={route.path}
                path={route.path}
              />
            ))}
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              {APP_ROUTES.map((route) => (
                <Route
                  element={<ProtectedRoute allowedRoles={route.allowedRoles} />}
                  key={route.path}
                  path={route.path}
                >
                  <Route
                    element={
                      resolvePageComponent(route.path) ?? (
                        <RoutePlaceholder title={route.label} path={route.path} />
                      )
                    }
                    index
                  />
                </Route>
              ))}
              <Route
                element={<RoutePlaceholder title="Page not found" path="/*" />}
                path="*"
              />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
