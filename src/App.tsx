import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { ToastProvider } from './components/Toast';
import { Layout } from './components/Layout';
import LoginPage, { SignupPage, RecoverPage } from './pages/Auth';
import HomePage from './pages/Home';
import GuildsPage from './pages/Guilds';
import GuildDetailPage, { CreateGuildPage } from './pages/GuildDetail';
import ProfilePage from './pages/Profile';
import { AlliancesPage, AllianceDetailPage } from './pages/Alliances';
import EventsPage from './pages/Events';
import SearchPage from './pages/Search';
import RankingsPage from './pages/Rankings';
import NotificationsPage from './pages/Notifications';
import PostDetailPage from './pages/PostDetail';
import SettingsPage from './pages/Settings';
import AdminPage from './pages/Admin';
import RulesPage from './pages/Rules';
import type { ReactNode } from 'react';

function Protected({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<SignupPage />} />
              <Route path="/recuperar" element={<RecoverPage />} />
              <Route
                path="/*"
                element={
                  <Layout>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/gremios" element={<GuildsPage />} />
                      <Route path="/gremio/crear" element={<Protected><CreateGuildPage /></Protected>} />
                      <Route path="/gremio/:slug" element={<GuildDetailPage />} />
                      <Route path="/alianzas" element={<AlliancesPage />} />
                      <Route path="/alianza/:slug" element={<AllianceDetailPage />} />
                      <Route path="/eventos" element={<EventsPage />} />
                      <Route path="/buscar" element={<SearchPage />} />
                      <Route path="/ranking" element={<RankingsPage />} />
                      <Route path="/perfil/:username" element={<ProfilePage />} />
                      <Route path="/publicacion/:id" element={<PostDetailPage />} />
                      <Route path="/notificaciones" element={<Protected><NotificationsPage /></Protected>} />
                      <Route path="/ajustes" element={<Protected><SettingsPage /></Protected>} />
                      <Route path="/admin" element={<Protected><AdminPage /></Protected>} />
                      <Route path="/reglas" element={<RulesPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Layout>
                }
              />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
