import "./App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";
import AuthLayout from "./components/layout/AuthLayout.jsx";
import RoutePlaceholder from "./components/ui/RoutePlaceholder.jsx";
import { AuthProvider } from "./features/auth/AuthContext.jsx";
import LoginPage from "./features/auth/LoginPage.jsx";
import ProtectedRoute from "./features/auth/ProtectedRoute.jsx";
import RegisterPage from "./features/auth/RegisterPage.jsx";
import { APP_ROUTES, PUBLIC_ROUTES } from "./utils/appRoutes.js";

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
                      <RoutePlaceholder title={route.label} path={route.path} />
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
