import mongoose, { Document, Schema } from 'mongoose';

export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AuditCategory =
  | 'Technical SEO' | 'Security & HTTPS' | 'Mobile' | 'AI Visibility / GEO' | 'Core Web Vitals'
  // Mockup v2 categories (new reports) — old values kept for backward compat
  | 'Performance' | 'Accessibility' | 'On-page content' | 'AI citation readiness';

export const AUDIT_V2_CATS = ['Performance', 'Accessibility', 'Technical SEO', 'On-page content', 'AI citation readiness'] as const;

export interface IAffected {
  count: number;
  examples: string[];
}

export interface IAuditIssue {
  code: string;
  category: AuditCategory;
  severity: AuditSeverity;
  title: string;
  evidence: string;
  fix: string;
  impact: number; // score points recoverable
  effort: 'quick' | 'normal';
  passed: boolean;
  why?: string;
  affected?: IAffected;
}

export interface IAiCrawler {
  bot: string;
  status: 'Allowed' | 'Blocked' | 'Missing';
  detail: string;
}

export interface IAuditReport extends Document {
  url: string;
  normalizedUrl: string;
  origin: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  progress: { stage: string; pagesDone: number; pagesTotal: number };
  pages: { crawled: number; discovered: number; errors: number };
  aiCrawlers: IAiCrawler[];
  summary: { critical: number; warning: number; notice: number; passed: number };
  priority: { code: string; title: string; fix: string; impact: number } | null;
  gsc: Record<string, unknown>;
  scores: Record<string, number>;
  overall: number;
  forecast: { now: number; quickWins: number; allFixes: number };
  issues: IAuditIssue[];
  meta: Record<string, string>;
  /** Compact per-page facts for the URL detail tabs (capped, optional for legacy docs). */
  pageStats?: Record<string, unknown>[];
  /** Unguessable public id used in share links (Mongo _id is enumerable). */
  shareToken?: string;
  createdAt: Date;
}

const AuditIssueSchema = new Schema<IAuditIssue>(
  {
    code: { type: String, required: true },
    category: { type: String, required: true },
    severity: { type: String, required: true },
    title: { type: String, required: true },
    evidence: { type: String, default: '' },
    fix: { type: String, default: '' },
    impact: { type: Number, default: 0 },
    effort: { type: String, default: 'normal' },
    passed: { type: Boolean, default: false },
    why: { type: String, default: '' },
    affected: { type: Schema.Types.Mixed, default: undefined },
  },
  { _id: false },
);

const AuditReportSchema = new Schema<IAuditReport>({
  url: { type: String, required: true },
  normalizedUrl: { type: String, required: true, index: true },
  origin: { type: String, default: '', index: true },
  status: { type: String, default: 'done' },
  progress: { type: Schema.Types.Mixed, default: { stage: 'done', pagesDone: 0, pagesTotal: 0 } },
  pages: { type: Schema.Types.Mixed, default: { crawled: 0, discovered: 0, errors: 0 } },
  aiCrawlers: { type: Schema.Types.Mixed, default: [] },
  summary: { type: Schema.Types.Mixed, default: { critical: 0, warning: 0, notice: 0, passed: 0 } },
  priority: { type: Schema.Types.Mixed, default: null },
  gsc: { type: Schema.Types.Mixed, default: {} },
  scores: { type: Schema.Types.Mixed, default: {} },
  overall: { type: Number, default: 0 },
  forecast: { type: Schema.Types.Mixed, default: {} },
  issues: { type: [AuditIssueSchema], default: [] },
  meta: { type: Schema.Types.Mixed, default: {} },
  pageStats: { type: Schema.Types.Mixed, default: [] },
  shareToken: { type: String, index: true, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now },
});

// TTL: keep free audits 30 days, no manual cleanup needed.
AuditReportSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

export default mongoose.model<IAuditReport>('AuditReport', AuditReportSchema);
