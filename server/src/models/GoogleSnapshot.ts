import mongoose, { Document, Schema } from 'mongoose';

// 24h cache for Google API responses (GSC/GA quotas are tight).
export interface IGoogleSnapshot extends Document {
  clientId: mongoose.Types.ObjectId;
  kind: 'gsc-summary' | 'gsc-index' | 'ga-sessions';
  key: string;
  data: Record<string, unknown>;
  createdAt: Date;
}

const GoogleSnapshotSchema = new Schema<IGoogleSnapshot>({
  clientId: { type: Schema.Types.ObjectId, ref: 'ClientUser', required: true },
  kind: { type: String, enum: ['gsc-summary', 'gsc-index', 'ga-sessions'], required: true },
  key: { type: String, required: true },
  data: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

GoogleSnapshotSchema.index({ clientId: 1, kind: 1, key: 1 });

export const SNAPSHOT_TTL_MS = 24 * 3600 * 1000;

export default mongoose.model<IGoogleSnapshot>('GoogleSnapshot', GoogleSnapshotSchema);
