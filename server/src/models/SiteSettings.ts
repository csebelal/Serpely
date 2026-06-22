import mongoose, { Document, Schema } from 'mongoose';

export interface ISiteSettings extends Document {
  siteName: string;
  siteUrl: string;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  ogImage: string;
  faviconUrl: string;
  googleAnalyticsId: string;
  maintenanceMode: boolean;
  systemStatus: string;
  customHeadCode: string;
}

const SiteSettingsSchema = new Schema<ISiteSettings>({
  siteName: { type: String, default: 'Serpely' },
  siteUrl: { type: String, default: 'https://serpely.com' },
  defaultMetaTitle: { type: String, default: 'Serpely — Agentic SEO for the AI-first web' },
  defaultMetaDescription: { type: String, default: '' },
  ogImage: { type: String, default: '' },
  faviconUrl: { type: String, default: '' },
  googleAnalyticsId: { type: String, default: '' },
  maintenanceMode: { type: Boolean, default: false },
  systemStatus: { type: String, default: 'All Systems Operational' },
  customHeadCode: { type: String, default: '' },
});

export default mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);
