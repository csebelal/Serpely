import mongoose, { Document, Schema } from 'mongoose';

export type AdminRole = 'owner' | 'admin' | 'editor';

export interface IAdminUser extends Document {
  email: string;
  passwordHash: string;
  role: AdminRole;
  active: boolean;
  createdAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  // Least privilege by default: a newly created account is an editor until an
  // owner promotes it. The startup migration promotes the original account.
  role: { type: String, enum: ['owner', 'admin', 'editor'], default: 'editor' },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);
