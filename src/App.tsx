import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { I18nProvider } from './lib/i18n';
import { ToastProvider } from './components/Toast';
import { Layout } from './components/Layout';
import { PageLoader } from './components/PageLoader';
import { isStaff } from './lib/permissions';

// Gate the entire app on the initial session check so the logged-out UI
// never flashes before getSession()/onAuthStateChange resolve.
function AppGate({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  if (loading) return <PageLoader full />;
  return <>{children}</>;
}

const LoginPage = lazy(() => import('./pages/Auth'));
const SignupPage = lazy(() => import('./pages/Auth').then((m) => ({ default: m.SignupPage })));
const RecoverPage = lazy(() => import('./pages/Auth').then((m) => ({ default: m.RecoverPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword'));
const HomePage = lazy(() => import('./pages/Home'));
const GuildsPage = lazy(() => import('./pages/Guilds'));
const GuildDetailPage = lazy(() => import('./pages/GuildDetail'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const AlliancesPage = lazy(() => import('./pages/Alliances').then((m) => ({ default: m.AlliancesPage })));
const AllianceDetailPage = lazy(() => import('./pages/Alliances').then((m) => ({ default: m.AllianceDetailPage })));
const EventsPage = lazy(() => import('./pages/Events'));
const SearchPage = lazy(() => import('./pages/Search'));
const RankingsPage = lazy(() => import('./pages/Rankings'));
const NotificationsPage = lazy(() => import('./pages/Notifications'));
const PostDetailPage = lazy(() => import('./pages/PostDetail'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const AdminPage = lazy(() => import('./pages/Admin'));
const ModerationQueuePage = lazy(() => import('./pages/ModerationQueue'));
const RulesPage = lazy(() => import('./pages/Rules'));
const CommunitiesPage = lazy(() => import('./pages/Communities'));
const CommunityDetailPage = lazy(() => import('./pages/CommunityDetail'));
const CommunityChatPage = lazy(() => import('./pages/CommunityChat'));
const CreateCommunityPage = lazy(() => import('./pages/CreateCommunity'));
const FrameShopPage = lazy(() => import('./pages/FrameShop'));
const WalletPage = lazy(() => import('./pages/Wallet'));
const CouncilPage = lazy(() => import('./pages/Council'));
const HelpPage = lazy(() => import('./pages/Help'));
const PrivacyPage = lazy(() => import('./pages/Privacy'));
const TermsPage = lazy(() => import('./pages/Terms'));
const ContactPage = lazy(() => import('./pages/Contact'));
const BetaTestGuidePage = lazy(() => import('./pages/BetaTestGuide'));
const OnboardingPage = lazy(() => import('./pages/Onboarding'));

function Protected({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function StaffRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (!isStaff(profile?.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppGate>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/registro" element={<SignupPage />} />
                  <Route path="/recuperar" element={<RecoverPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route
                    path="/*"
                    element={
                      <Layout>
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/gremios" element={<GuildsPage />} />
                            <Route path="/gremio/crear" element={<Protected><GuildDetailPage /></Protected>} />
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
                            <Route path="/admin" element={<StaffRoute><AdminPage /></StaffRoute>} />
                            <Route path="/moderacion" element={<StaffRoute><ModerationQueuePage /></StaffRoute>} />
                            <Route path="/reglas" element={<RulesPage />} />
                            <Route path="/comunidades" element={<CommunitiesPage />} />
                            <Route path="/comunidad/crear" element={<Protected><CreateCommunityPage /></Protected>} />
                            <Route path="/comunidad/:slug" element={<CommunityDetailPage />} />
                            <Route path="/comunidad/:slug/chat" element={<Protected><CommunityChatPage /></Protected>} />
                            <Route path="/tienda" element={<FrameShopPage />} />
                            <Route path="/monedero" element={<Protected><WalletPage /></Protected>} />
                            <Route path="/consejo" element={<CouncilPage />} />
                            <Route path="/ayuda" element={<HelpPage />} />
                            <Route path="/beta" element={<BetaTestGuidePage />} />
                            <Route path="/bienvenida" element={<Protected><OnboardingPage /></Protected>} />
                            <Route path="/privacidad" element={<PrivacyPage />} />
                            <Route path="/terminos" element={<TermsPage />} />
                            <Route path="/contacto" element={<ContactPage />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Routes>
                        </Suspense>
                      </Layout>
                    }
                  />
                </Routes>
              </Suspense>
              </AppGate>
            </BrowserRouter>
          </ToastProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
