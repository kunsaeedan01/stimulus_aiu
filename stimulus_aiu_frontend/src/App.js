import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import ApplicationsPage from "./features/applications/ApplicationsPage";
import ApplicationDetailPage from "./features/applications/ApplicationDetailPage";
import ApplicationCreatePage from "./features/applications/ApplicationCreatePage";
import ApplicationEditPage from "./features/applications/ApplicationEditPage";

function RequireAuth({ children }) {
  const { user, initialized, loading } = useAuth();

  if (!initialized || loading) {
    return (
      <AppShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-gray-600">Загрузка…</div>
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AppShell>
            <LoginPage />
          </AppShell>
        }
      />
      <Route
        path="/register"
        element={
          <AppShell>
            <RegisterPage />
          </AppShell>
        }
      />
      <Route
        path="/applications"
        element={
          <RequireAuth>
            <AppShell>
              <ApplicationsPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/applications/new"
        element={
          <RequireAuth>
            <AppShell>
              <ApplicationCreatePage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/applications/:id/edit"
        element={
          <RequireAuth>
            <AppShell>
              <ApplicationEditPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/applications/:id"
        element={
          <RequireAuth>
            <AppShell>
              <ApplicationDetailPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route path="/" element={<RequireAuth><Navigate to="/applications" replace /></RequireAuth>} />
      <Route path="*" element={<RequireAuth><Navigate to="/applications" replace /></RequireAuth>} />
    </Routes>
  );
}