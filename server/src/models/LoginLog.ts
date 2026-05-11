import mongoose, { Document, Schema } from 'mongoose';

export interface ILoginLog extends Document {
  email: string;
  ip: string;
  userAgent: string;
  success: boolean;
  timestamp: Date;
}

const LoginLogSchema = new Schema<ILoginLog>({
  email: { type: String, required: true },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  success: { type: Boolean, default: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model<ILoginLog>('LoginLog', LoginLogSchema);
