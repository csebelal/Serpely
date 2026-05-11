import mongoose, { Document, Schema } from 'mongoose';

export interface IFooterConfig extends Document {
  tagline: string;
  columns: { name: string; links: { label: string; href: string }[] }[];
  socialLinks: { platform: string; href: string }[];
  productHuntUrl: string;
  productHuntBtnText: string;
  askAiPrompt: string;
  copyright: string;
  cieloOpsLightLogo: string;
  cieloOpsDarkLogo: string;
  lightLogo: string;
  darkLogo: string;
  systemStatus: string;
}

const FooterConfigSchema = new Schema<IFooterConfig>({
  tagline: { type: String, default: '' },
  columns: [{ name: String, links: [{ label: String, href: String }] }],
  socialLinks: [{ platform: String, href: String }],
  productHuntUrl: { type: String, default: '#' },
  productHuntBtnText: { type: String, default: 'Find us on Product Hunt' },
  askAiPrompt: { type: String, default: '' },
  copyright: { type: String, default: '' },
  cieloOpsLightLogo: { type: String, default: '' },
  cieloOpsDarkLogo: { type: String, default: '' },
  lightLogo: { type: String, default: '' },
  darkLogo: { type: String, default: '' },
  systemStatus: { type: String, default: 'All Systems Operational' },
});

export default mongoose.model<IFooterConfig>('FooterConfig', FooterConfigSchema);
