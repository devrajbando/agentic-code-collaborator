import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/Dashboard";
import ProjectViewPage from "./pages/ProjectViewPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { CurrentUserProvider } from "./context/CurrentUserContext";
import { CommandPalette } from "./components/CommandPalette";
import ProjectSettingsPage from './pages/ProjectSettingsPage';
export default function App() {
  return (
    <CurrentUserProvider>
      <BrowserRouter>
      <CommandPalette/>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/project/:projectId"
              element={<ProjectViewPage />}
            />
            <Route path="/project/:projectId/settings" element={<ProjectSettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </CurrentUserProvider>
  );
}