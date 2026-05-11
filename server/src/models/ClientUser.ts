import mongoose, { Document, Schema } from 'mongoose';

export interface IClientUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  plan: 'starter' | 'pro' | 'business';
  websites: { domain: string; addedAt: Date }[];
  notifications: {
    weeklyDigest: boolean;
    rankAlerts: boolean;
    geoAlerts: boolean;
    auditAlerts: boolean;
  };
  apiKey: string;
  createdAt: Date;
}

const ClientUserSchema = new Schema<IClientUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  plan: { type: String, enum: ['starter', 'pro', 'business'], default: 'starter' },
  websites: [{ domain: { type: String, trim: true }, addedAt: { type: Date, default: Date.now } }],
  notifications: {
    weeklyDigest: { type: Boolean, default: true },
    rankAlerts: { type: Boolean, default: true },
    geoAlerts: { type: Boolean, default: true },
    auditAlerts: { type: Boolean, default: false },
  },
  apiKey: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IClientUser>('ClientUser', ClientUserSchema);
