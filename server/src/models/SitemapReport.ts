import mongoose, { Document, Schema } from 'mongoose';
import type { SitemapRef, CheckedUrl, SitemapSummary } from '../lib/sitemapCheck';

// Cached sitemap-checker reports (24h per origin, like the public audit cache).
export interface ISitemapReport extends Document {
  origin: string;
  sitemaps: SitemapRef[];
  summary: SitemapSummary;
  urls: CheckedUrl[];
  /** Unguessable public id used in share links (Mongo _id is enumerable). */
  shareToken?: string;
  createdAt: Date;
}

const SitemapRefSchema = new Schema<SitemapRef>(
  {
    url: { type: String, required: true },
    source: { type: String, enum: ['robots', 'fallback'], default: 'robots' },
    ok: { type: Boolean, default: false },
  },
  { _id: false },
);

const SitemapCheckedUrlSchema = new Schema<CheckedUrl>(
  {
    url: { type: String, required: true },
    status: { type: Number, default: 0 },
    finalUrl: { type: String, default: '' },
    verdict: { type: String, enum: ['Healthy', 'Redirected', 'Broken', 'Blocked', 'Non-canonical', 'Slow'], default: 'Healthy' },
    detail: { type: String, default: '' },
    title: { type: String, default: '' },
    desc: { type: String, default: '' },
    h1: { type: String, default: '' },
    words: { type: Number, default: 0 },
    loadMs: { type: Number, default: 0 },
    canonical: { type: String, default: '' },
    gates: { type: Schema.Types.Mixed, default: [] },
    score: { type: Number, default: 0 },
  },
  { _id: false },
);

const SitemapReportSchema = new Schema<ISitemapReport>({
  origin: { type: String, required: true },
  sitemaps: { type: [SitemapRefSchema], default: [] },
  summary: { type: Schema.Types.Mixed, default: {} },
  urls: { type: [SitemapCheckedUrlSchema], default: [] },
  shareToken: { type: String, index: true, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now },
});

SitemapReportSchema.index({ origin: 1, createdAt: -1 });

export default mongoose.model<ISitemapReport>('SitemapReport', SitemapReportSchema);
