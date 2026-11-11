import mongoose, { Document, Schema } from 'mongoose';

/**
 * Consent banner decision log.
 * Stores only the visitor's choice plus a random anonymous id — never cookie
 * values or tracking identifiers — so the admin panel can report on how many
 * visitors accepted analytics.
 */
export interface IConsentLog extends Document {
  choice: 'granted' | 'denied';
  /** Random, rotating id from the visitor's localStorage — no PII. */
  visitorId: string;
  /** Truncated user-agent of the deciding browser. */
  ua: string;
  /** Page path where the decision was made. */
  page: string;
  createdAt: Date;
}

const ConsentLogSchema = new Schema<IConsentLog>({
  choice:    { type: String, required: true, enum: ['granted', 'denied'] },
  visitorId: { type: String, default: '' },
  ua:        { type: String, default: '' },
  page:      { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 365 }, // 1-year TTL
});

ConsentLogSchema.index({ createdAt: -1 });
ConsentLogSchema.index({ choice: 1 });

export default mongoose.model<IConsentLog>('ConsentLog', ConsentLogSchema);
