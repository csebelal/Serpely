import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditSnapshot extends Document {
  origin: string;
  date: string; // YYYY-MM-DD
  overall: number;
  scores: Record<string, number>;
  reportId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const AuditSnapshotSchema = new Schema<IAuditSnapshot>({
  origin: { type: String, required: true, index: true },
  date: { type: String, required: true },
  overall: { type: Number, default: 0 },
  scores: { type: Schema.Types.Mixed, default: {} },
  reportId: { type: Schema.Types.ObjectId, ref: 'AuditReport' },
  createdAt: { type: Date, default: Date.now },
});

AuditSnapshotSchema.index({ origin: 1, date: 1 }, { unique: true });
// TTL: keep trend data 90 days
AuditSnapshotSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

export default mongoose.models.AuditSnapshot || mongoose.model<IAuditSnapshot>('AuditSnapshot', AuditSnapshotSchema);
