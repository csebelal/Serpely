import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('serpely_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  api.post<{ token: string }>('/api/auth/login', { email, password });

export const changePassword = (currentPassword: string, newPassword: string) =>
  api.post('/api/auth/change-password', { currentPassword, newPassword });
export const setMyPassword = (password: string) =>
  api.put('/api/auth/me/password', { password });

export interface AdminUserData { _id: string; email: string; createdAt: string; }
export interface LoginLogData { _id: string; email: string; ip: string; userAgent: string; success: boolean; timestamp: string; }
export const getAdminUsers = () => api.get<AdminUserData[]>('/api/auth/users');
export const createAdminUser = (email: string, password: string) => api.post<AdminUserData>('/api/auth/users', { email, password });
export const deleteAdminUser = (id: string) => api.delete(`/api/auth/users/${id}`);
export const setAdminUserPassword = (id: string, password: string) => api.put(`/api/auth/users/${id}/password`, { password });
export const getLoginLogs = () => api.get<LoginLogData[]>('/api/auth/logs');

// ── Sections ──────────────────────────────────────────────────────────────────
export const getSection = (name: string) =>
  api.get<{ section: string; data: Record<string, unknown> }>(`/api/sections/${name}`);

export const updateSection = (name: string, data: Record<string, unknown>) =>
  api.put(`/api/sections/${name}`, { data });

// ── Nav ───────────────────────────────────────────────────────────────────────
export interface NavItemData {
  _id?: string;
  label: string;
  href: string;
  order: number;
  isCta: boolean;
  isVisible: boolean;
  dropdownItems: { label: string; href: string; desc: string }[];
}
export const getNav = () => api.get<NavItemData[]>('/api/nav');
export const updateNav = (items: NavItemData[]) => api.put('/api/nav', items);

// ── Footer ────────────────────────────────────────────────────────────────────
export interface FooterData {
  tagline: string;
  columns: { name: string; links: { label: string; href: string }[] }[];
  socialLinks: { platform: string; href: string }[];
  productHuntUrl: string;
  productHuntBtnText: string;
  askAiPrompt: string;
  copyright: string;
  systemStatus: string;
  lightLogo?: string;
  darkLogo?: string;
  cieloOpsLightLogo?: string;
  cieloOpsDarkLogo?: string;
}
export const getFooter = () => api.get<FooterData>('/api/footer');
export const updateFooter = (data: Partial<FooterData>) => api.put('/api/footer', data);

// ── Blog ──────────────────────────────────────────────────────────────────────
export interface BlogPostData {
  _id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  author: string;
  authorInitials: string;
  tagLabel: string;
  tagColor: string;
  tagAccent?: boolean;
  coverImage?: string;
  category: string;
  published: boolean;
  featured?: boolean;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
export const getPosts = () => api.get<BlogPostData[]>('/api/blog');
export const getAllPosts = () => api.get<BlogPostData[]>('/api/blog/all');
export const getPost = (slug: string) => api.get<BlogPostData>(`/api/blog/${slug}`);
export const getPostById = (id: string) => api.get<BlogPostData>(`/api/blog/admin/${id}`);
export const createPost = (data: Partial<BlogPostData>) => api.post<BlogPostData>('/api/blog', data);
export const updatePost = (id: string, data: Partial<BlogPostData>) => api.put<BlogPostData>(`/api/blog/${id}`, data);
export const deletePost = (id: string) => api.delete(`/api/blog/${id}`);
export const getCategories = () => api.get<string[]>('/api/blog/categories');
export const getFeaturedPosts = () => api.get<BlogPostData[]>('/api/blog/featured');

// ── Pricing ───────────────────────────────────────────────────────────────────
export interface PricingPlanData {
  _id?: string;
  name: string;
  badge: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  annualBilledAs: string;
  features: { text: string; included: boolean }[];
  isFeatured: boolean;
  ctaLabel: string;
  order: number;
}
export const getPricing = () => api.get<PricingPlanData[]>('/api/pricing');
export const updatePricing = (plans: PricingPlanData[]) => api.put('/api/pricing', plans);

// ── Testimonials ──────────────────────────────────────────────────────────────
export interface TestimonialData {
  _id?: string;
  quote: string;
  name: string;
  role: string;
  initial: string;
  order: number;
  isVisible: boolean;
}
export const getTestimonials = () => api.get<TestimonialData[]>('/api/testimonials');
export const getAllTestimonials = () => api.get<TestimonialData[]>('/api/testimonials/all');
export const updateTestimonials = (items: TestimonialData[]) => api.put('/api/testimonials', items);

// ── FAQ ───────────────────────────────────────────────────────────────────────
export interface FaqItemData {
  _id?: string;
  question: string;
  answer: string;
  category: string;
  section: 'home' | 'pricing' | 'faq-page';
  order: number;
  isVisible: boolean;
}
export const getFaq = (section?: string) =>
  api.get<FaqItemData[]>('/api/faq', { params: section ? { section } : {} });
export const getAllFaq = (section?: string) =>
  api.get<FaqItemData[]>('/api/faq/all', { params: section ? { section } : {} });
export const updateFaq = (items: FaqItemData[]) => api.put('/api/faq', items);

// ── Settings ──────────────────────────────────────────────────────────────────
export interface SiteSettingsData {
  siteName: string;
  siteUrl: string;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  ogImage?: string;
  faviconUrl?: string;
  googleAnalyticsId?: string;
  maintenanceMode: boolean;
  systemStatus: string;
}
export const getSettings = () => api.get<SiteSettingsData>('/api/settings');
export const updateSettings = (data: Partial<SiteSettingsData>) => api.put('/api/settings', data);

// ── Upload / Media ────────────────────────────────────────────────────────────
export interface MediaFileData {
  _id: string;
  filename: string;
  url: string;
  publicId: string;
  size: number;
  uploadedAt: string;
}
export const uploadFile = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post<{ url: string; publicId: string; _id: string }>('/api/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const getMedia = () => api.get<MediaFileData[]>('/api/upload');
export const deleteMedia = (publicId: string) =>
  api.delete('/api/upload', { params: { publicId } });

// ── Client User Auth ──────────────────────────────────────────────────────────
export interface ClientUserNotifications {
  weeklyDigest: boolean; rankAlerts: boolean; geoAlerts: boolean; auditAlerts: boolean;
}
export interface ClientUserData {
  _id: string; name: string; email: string; createdAt?: string;
  plan?: 'starter' | 'pro' | 'business';
  websites?: { domain: string; addedAt: string }[];
  notifications?: ClientUserNotifications;
  apiKey?: string;
}
const clientApi = axios.create({ baseURL: BASE });
clientApi.interceptors.request.use(cfg => {
  const t = localStorage.getItem('serpely_client_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
export const clientRegister = (name: string, email: string, password: string) =>
  clientApi.post<{ token: string; user: ClientUserData }>('/api/users/register', { name, email, password });
export const clientLogin = (email: string, password: string) =>
  clientApi.post<{ token: string; user: ClientUserData }>('/api/users/login', { email, password });
export const clientGetMe = () => clientApi.get<ClientUserData>('/api/users/me');
export const clientUpdateMe = (name: string) => clientApi.put<ClientUserData>('/api/users/me', { name });
export const clientUpdateWebsites = (websites: { domain: string }[]) =>
  clientApi.put<ClientUserData>('/api/users/websites', { websites });
export const clientUpdateNotifications = (n: Partial<ClientUserNotifications>) =>
  clientApi.put<ClientUserData>('/api/users/notifications', n);
export const clientGenerateApiKey = () =>
  clientApi.post<{ apiKey: string }>('/api/users/api-key');
export const clientDeleteAccount = () => clientApi.delete('/api/users/me');
export const clientChangePassword = (currentPassword: string, newPassword: string) =>
  clientApi.post('/api/users/change-password', { currentPassword, newPassword });

// ── Contact Submissions ───────────────────────────────────────────────────────
export interface ContactSubmissionData {
  _id: string; name: string; email: string; company?: string; website?: string;
  topic?: string; message: string; read: boolean; starred: boolean;
  status: 'new' | 'replied' | 'archived'; createdAt: string;
}
export const submitContact = (data: { name: string; email: string; company?: string; website?: string; topic?: string; message: string }) =>
  api.post('/api/contact', data);
export const getContacts = (params?: { status?: string; starred?: boolean }) =>
  api.get<{ submissions: ContactSubmissionData[]; unreadCount: number }>('/api/contact', { params });
export const updateContact = (id: string, data: Partial<ContactSubmissionData>) =>
  api.patch(`/api/contact/${id}`, data);
export const deleteContact = (id: string) => api.delete(`/api/contact/${id}`);

// ── Subscribers ───────────────────────────────────────────────────────────────
export interface SubscriberData {
  _id: string; email: string; active: boolean; source: string; createdAt: string;
}
export interface SubscriberStats { total: number; active: number; thisWeek: number; unsubscribed: number; }
export const subscribe = (email: string, source?: string) => api.post('/api/subscribers', { email, source });
export const getSubscribers = () => api.get<{ subscribers: SubscriberData[]; stats: SubscriberStats }>('/api/subscribers');
export const updateSubscriber = (id: string, active: boolean) => api.patch(`/api/subscribers/${id}`, { active });
export const deleteSubscriber = (id: string) => api.delete(`/api/subscribers/${id}`);
export const bulkDeleteSubscribers = (ids: string[]) => api.delete('/api/subscribers/bulk', { data: { ids } });
export const exportSubscribers = () => api.get('/api/subscribers/export', { responseType: 'blob' });

// ── Popups ────────────────────────────────────────────────────────────────────
export interface PopupData {
  _id?: string; type: 'banner' | 'modal' | 'corner'; title: string; body: string;
  ctaText?: string; ctaHref?: string; bgColor?: string;
  trigger: 'immediate' | 'exit-intent' | 'scroll-50'; delay?: number;
  active: boolean; startAt?: string; endAt?: string; createdAt?: string;
}
export const getActivePopups = () => api.get<PopupData[]>('/api/popups');
export const getAllPopups = () => api.get<PopupData[]>('/api/popups/all');
export const createPopup = (data: Partial<PopupData>) => api.post<PopupData>('/api/popups', data);
export const updatePopup = (id: string, data: Partial<PopupData>) => api.put<PopupData>(`/api/popups/${id}`, data);
export const deletePopup = (id: string) => api.delete(`/api/popups/${id}`);

// ── Changelog ─────────────────────────────────────────────────────────────────
export interface ChangelogData {
  _id?: string; title: string; slug: string; body: string;
  type: 'feature' | 'improvement' | 'fix'; published: boolean;
  publishedAt?: string; createdAt?: string; updatedAt?: string;
}
export const getChangelog = () => api.get<ChangelogData[]>('/api/changelog');
export const getAllChangelog = () => api.get<ChangelogData[]>('/api/changelog/all');
export const createChangelogEntry = (data: Partial<ChangelogData>) => api.post<ChangelogData>('/api/changelog', data);
export const updateChangelogEntry = (id: string, data: Partial<ChangelogData>) => api.put<ChangelogData>(`/api/changelog/${id}`, data);
export const deleteChangelogEntry = (id: string) => api.delete(`/api/changelog/${id}`);

// ── SEO ───────────────────────────────────────────────────────────────────────
export interface SEOPageData {
  _id?: string; pageKey: string; metaTitle: string; metaDescription: string;
  ogImage?: string; canonicalUrl?: string; noIndex: boolean; customSchema?: string; updatedAt?: string;
}
export const getAllSEO = () => api.get<SEOPageData[]>('/api/seo');
export const getSEOByKey = (key: string) => api.get<SEOPageData>(`/api/seo/${key}`);
export const updateSEO = (key: string, data: Partial<SEOPageData>) => api.put<SEOPageData>(`/api/seo/${key}`, data);

// ── Analytics ─────────────────────────────────────────────────────────────────
export interface AnalyticsSummary {
  today: number; last7d: number; last30d: number;
  topPages: { path: string; count: number }[];
  dailyViews: { date: string; count: number }[];
}
export const trackPageView = (path: string, referrer?: string) =>
  api.post('/api/analytics/track', { path, referrer }).catch(() => {});
export const getAnalyticsSummary = () => api.get<AnalyticsSummary>('/api/analytics/summary');

// ── Audit Log ─────────────────────────────────────────────────────────────────
export interface AuditLogData {
  _id: string; adminEmail: string; action: 'create' | 'update' | 'delete';
  resource: string; detail: string; ip: string; createdAt: string;
}
export const getAuditLogs = (params?: { action?: string; from?: string; to?: string }) =>
  api.get<AuditLogData[]>('/api/audit', { params });

// ── Backup ────────────────────────────────────────────────────────────────────
export const downloadBackup = () => api.get('/api/backup', { responseType: 'blob' });
export const restoreBackup = (data: unknown) => api.post('/api/backup/restore', data);

// ── Bulk Blog ─────────────────────────────────────────────────────────────────
export const bulkUpdatePosts = (ids: string[], published: boolean) =>
  api.patch('/api/blog/bulk', { ids, published });
export const bulkDeletePosts = (ids: string[]) =>
  api.delete('/api/blog/bulk', { data: { ids } });

// ── API Keys ──────────────────────────────────────────────────────────────────
export interface APIKeyData {
  _id: string; name: string; prefix: string; active: boolean;
  lastUsedAt?: string; createdAt: string; key?: string;
}
export const getAPIKeys = () => api.get<APIKeyData[]>('/api/keys');
export const createAPIKey = (name: string) => api.post<APIKeyData>('/api/keys', { name });
export const deleteAPIKey = (id: string) => api.delete(`/api/keys/${id}`);
