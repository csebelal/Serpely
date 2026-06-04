import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Profile } from './pages/auth/Profile';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Features } from './pages/Features';
import { Pricing } from './pages/Pricing';
import { Contact } from './pages/Contact';
import { Blog } from './pages/Blog';
import { BlogPost } from './pages/BlogPost';
import { FAQ } from './pages/FAQ';
import { ProductTour } from './pages/ProductTour';
import { Integrations } from './pages/Integrations';
import { HowItWorks } from './pages/HowItWorks';
import { Compare } from './pages/Compare';
import { CompareVs } from './pages/CompareVs';
import { Changelog } from './pages/Changelog';
import { getSettings, trackPageView } from './lib/api';
import { ScrollToTop } from './components/ScrollToTop';
import { PopupRenderer } from './components/PopupRenderer';

// Admin
import { AdminLogin } from './pages/admin/Login';
import { Dashboard } from './pages/admin/Dashboard';
import { NavbarEditor } from './pages/admin/NavbarEditor';
import { FooterEditor } from './pages/admin/FooterEditor';
import { BlogManager } from './pages/admin/BlogManager';
import { BlogPostEditor } from './pages/admin/BlogPostEditor';
import { PricingEditor } from './pages/admin/PricingEditor';
import { TestimonialsManager } from './pages/admin/TestimonialsManager';
import { FAQManager } from './pages/admin/FAQManager';
import { MediaLibrary } from './pages/admin/MediaLibrary';
import { Settings } from './pages/admin/Settings';
import { Users } from './pages/admin/Users';
import { AboutEditor } from './pages/admin/AboutEditor';
import { IntegrationsEditor } from './pages/admin/IntegrationsEditor';
import { FeaturesEditor } from './pages/admin/FeaturesEditor';
import { CompareEditor } from './pages/admin/CompareEditor';
import { HomeEditor } from './pages/admin/HomeEditor';
import { ContactInbox } from './pages/admin/ContactInbox';
import { SubscribersManager } from './pages/admin/SubscribersManager';
import { PopupManager } from './pages/admin/PopupManager';
import { ChangelogManager } from './pages/admin/ChangelogManager';
import { SEOManager } from './pages/admin/SEOManager';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { APIKeysManager } from './pages/admin/APIKeysManager';
import { AdminLayout } from './components/admin/AdminLayout';
import { ProtectedRoute } from './components/admin/ProtectedRoute';

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
      </Router>
    </AuthProvider>
  );
}

export default App;
