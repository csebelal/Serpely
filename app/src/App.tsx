import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getSettings, trackPageView } from './lib/api';
import { ScrollToTop } from './components/ScrollToTop';
import { PopupRenderer } from './components/PopupRenderer';
import { ProtectedRoute } from './components/admin/ProtectedRoute';

// Public pages — code-split per route
const Login = lazy(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/auth/Register').then(m => ({ default: m.Register })));
const Profile = lazy(() => import('./pages/auth/Profile').then(m => ({ default: m.Profile })));
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Features = lazy(() => import('./pages/Features').then(m => ({ default: m.Features })));
const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const Blog = lazy(() => import('./pages/Blog').then(m => ({ default: m.Blog })));
const BlogPost = lazy(() => import('./pages/BlogPost').then(m => ({ default: m.BlogPost })));
const PreviewBlogPost = lazy(() => import('./pages/PreviewBlogPost').then(m => ({ default: m.PreviewBlogPost })));
const FAQ = lazy(() => import('./pages/FAQ').then(m => ({ default: m.FAQ })));
const ProductTour = lazy(() => import('./pages/ProductTour').then(m => ({ default: m.ProductTour })));
const Integrations = lazy(() => import('./pages/Integrations').then(m => ({ default: m.Integrations })));
const HowItWorks = lazy(() => import('./pages/HowItWorks').then(m => ({ default: m.HowItWorks })));
const Compare = lazy(() => import('./pages/Compare').then(m => ({ default: m.Compare })));
const CompareVs = lazy(() => import('./pages/CompareVs').then(m => ({ default: m.CompareVs })));
const Changelog = lazy(() => import('./pages/Changelog').then(m => ({ default: m.Changelog })));

// Admin pages — code-split per route
const AdminLogin = lazy(() => import('./pages/admin/Login').then(m => ({ default: m.AdminLogin })));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const Dashboard = lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.Dashboard })));
const NavbarEditor = lazy(() => import('./pages/admin/NavbarEditor').then(m => ({ default: m.NavbarEditor })));
const FooterEditor = lazy(() => import('./pages/admin/FooterEditor').then(m => ({ default: m.FooterEditor })));
const BlogManager = lazy(() => import('./pages/admin/BlogManager').then(m => ({ default: m.BlogManager })));
const BlogPostEditor = lazy(() => import('./pages/admin/BlogPostEditor').then(m => ({ default: m.BlogPostEditor })));
const PricingEditor = lazy(() => import('./pages/admin/PricingEditor').then(m => ({ default: m.PricingEditor })));
const TestimonialsManager = lazy(() => import('./pages/admin/TestimonialsManager').then(m => ({ default: m.TestimonialsManager })));
const FAQManager = lazy(() => import('./pages/admin/FAQManager').then(m => ({ default: m.FAQManager })));
const MediaLibrary = lazy(() => import('./pages/admin/MediaLibrary').then(m => ({ default: m.MediaLibrary })));
const Settings = lazy(() => import('./pages/admin/Settings').then(m => ({ default: m.Settings })));
const Users = lazy(() => import('./pages/admin/Users').then(m => ({ default: m.Users })));
const AboutEditor = lazy(() => import('./pages/admin/AboutEditor').then(m => ({ default: m.AboutEditor })));
const IntegrationsEditor = lazy(() => import('./pages/admin/IntegrationsEditor').then(m => ({ default: m.IntegrationsEditor })));
const FeaturesEditor = lazy(() => import('./pages/admin/FeaturesEditor').then(m => ({ default: m.FeaturesEditor })));
const CompareEditor = lazy(() => import('./pages/admin/CompareEditor').then(m => ({ default: m.CompareEditor })));
const HomeEditor = lazy(() => import('./pages/admin/HomeEditor').then(m => ({ default: m.HomeEditor })));
const ContactInbox = lazy(() => import('./pages/admin/ContactInbox').then(m => ({ default: m.ContactInbox })));
const SubscribersManager = lazy(() => import('./pages/admin/SubscribersManager').then(m => ({ default: m.SubscribersManager })));
const PopupManager = lazy(() => import('./pages/admin/PopupManager').then(m => ({ default: m.PopupManager })));
const ChangelogManager = lazy(() => import('./pages/admin/ChangelogManager').then(m => ({ default: m.ChangelogManager })));
const SEOManager = lazy(() => import('./pages/admin/SEOManager').then(m => ({ default: m.SEOManager })));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage').then(m => ({ default: m.AuditLogPage })));
const APIKeysManager = lazy(() => import('./pages/admin/APIKeysManager').then(m => ({ default: m.APIKeysManager })));

function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>
        <span className="w-4 h-4 rounded-full border-2 border-current animate-spin" style={{ borderTopColor: 'transparent', opacity: 0.6 }} />
        Loading…
      </div>
    </div>
  );
}

function MaintenancePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)', textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 24 }}>🔧</div>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 12, letterSpacing: '-0.03em' }}>Under Maintenance</h1>
      <p style={{ fontSize: 16, color: 'var(--text-soft)', maxWidth: 400 }}>We're making some improvements. Please check back shortly.</p>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: '/profile' }} replace />;
  return <>{children}</>;
}

function AnalyticsTracker() {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname.startsWith('/sp-super-admin')) return;
    trackPageView(location.pathname, document.referrer);
  }, [location.pathname]);
  return null;
}

function PublicShell() {
  const [maintenance, setMaintenance] = useState<boolean | null>(null);

  useEffect(() => {
    getSettings().then(r => setMaintenance(r.data.maintenanceMode)).catch(() => setMaintenance(false));
  }, []);

  if (maintenance === null) return null;
  if (maintenance) return <MaintenancePage />;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <PopupRenderer />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/preview/:token" element={<PreviewBlogPost />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/product-tour" element={<ProductTour />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/compare/:slug" element={<CompareVs />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <AnalyticsTracker />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Admin routes — no Navbar/Footer */}
            <Route path="/sp-super-admin/login" element={<AdminLogin />} />
            <Route
              path="/sp-super-admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="home-editor" element={<HomeEditor />} />
              <Route path="about" element={<AboutEditor />} />
              <Route path="integrations-editor" element={<IntegrationsEditor />} />
              <Route path="features-editor" element={<FeaturesEditor />} />
              <Route path="compare-editor" element={<CompareEditor />} />
              <Route path="navbar" element={<NavbarEditor />} />
              <Route path="footer" element={<FooterEditor />} />
              <Route path="blog" element={<BlogManager />} />
              <Route path="blog/:id" element={<BlogPostEditor />} />
              <Route path="pricing" element={<PricingEditor />} />
              <Route path="testimonials" element={<TestimonialsManager />} />
              <Route path="faq" element={<FAQManager />} />
              <Route path="media" element={<MediaLibrary />} />
              <Route path="users" element={<Users />} />
              <Route path="settings" element={<Settings />} />
              <Route path="contact" element={<ContactInbox />} />
              <Route path="subscribers" element={<SubscribersManager />} />
              <Route path="popups" element={<PopupManager />} />
              <Route path="changelog" element={<ChangelogManager />} />
              <Route path="seo" element={<SEOManager />} />
              <Route path="audit" element={<AuditLogPage />} />
              <Route path="api-keys" element={<APIKeysManager />} />
            </Route>

            {/* Public routes — maintenance mode aware */}
            <Route path="*" element={<PublicShell />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;