import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  adminEmail: string;
  action: 'create' | 'update' | 'delete';
  resource: string;
  detail: string;
  ip: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  adminEmail: { type: String, required: true },
  action:     { type: String, enum: ['create','update','delete'], required: true },
  resource:   { type: String, required: true },
  detail:     { type: String, default: '' },
  ip:         { type: String, default: '' },
  createdAt:  { type: Date, default: Date.now },
});

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
