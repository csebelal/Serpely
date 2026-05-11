import mongoose, { Document, Schema } from 'mongoose';

export interface IAPIKey extends Document {
  name: string;
  keyHash: string;
  prefix: string;
  adminId: string;
  active: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
}

const APIKeySchema = new Schema<IAPIKey>({
  name:       { type: String, required: true },
  keyHash:    { type: String, required: true },
  prefix:     { type: String, required: true },
  adminId:    { type: String, required: true },
  active:     { type: Boolean, default: true },
  lastUsedAt: { type: Date },
  createdAt:  { type: Date, default: Date.now },
});

export default mongoose.model<IAPIKey>('APIKey', APIKeySchema);
