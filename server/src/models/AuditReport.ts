import mongoose, { Document, Schema } from 'mongoose';

export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AuditCategory = 'Technical SEO' | 'Security & HTTPS' | 'Mobile' | 'AI Visibility / GEO' | 'Core Web Vitals';

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
}

export interface IAuditReport extends Document {
  url: string;
  normalizedUrl: string;
  status: 'done' | 'failed';
  scores: Record<string, number>;
  overall: number;
  forecast: { now: number; quickWins: number; allFixes: number };
  issues: IAuditIssue[];
  meta: Record<string, string>;
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
  },
  { _id: false },
);

const AuditReportSchema = new Schema<IAuditReport>({
  url: { type: String, required: true },
  normalizedUrl: { type: String, required: true, index: true },
  status: { type: String, default: 'done' },
  scores: { type: Schema.Types.Mixed, default: {} },
  overall: { type: Number, default: 0 },
  forecast: { type: Schema.Types.Mixed, default: {} },
  issues: { type: [AuditIssueSchema], default: [] },
  meta: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

// TTL: keep free audits 30 days, no manual cleanup needed.
AuditReportSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

export default mongoose.model<IAuditReport>('AuditReport', AuditReportSchema);
