import mongoose, { Document, Schema } from 'mongoose';

export interface IGoogleConnection extends Document {
  clientId: mongoose.Types.ObjectId;
  email: string;
  refreshTokenEnc: string;
  scope: string;
  gscSite: string;
  gaPropertyId: string;
  connectedAt: Date;
  lastUsedAt: Date;
}

const GoogleConnectionSchema = new Schema<IGoogleConnection>({
  clientId: { type: Schema.Types.ObjectId, ref: 'ClientUser', required: true, unique: true },
  email: { type: String, default: '' },
  refreshTokenEnc: { type: String, required: true },
  scope: { type: String, default: '' },
  gscSite: { type: String, default: '' },
  gaPropertyId: { type: String, default: '' },
  connectedAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IGoogleConnection>('GoogleConnection', GoogleConnectionSchema);
