import mongoose, { Document, Schema } from 'mongoose';

export interface IContactSubmission extends Document {
  name: string;
  email: string;
  company: string;
  website: string;
  topic: string;
  message: string;
  read: boolean;
  starred: boolean;
  status: 'new' | 'replied' | 'archived';
  createdAt: Date;
}

const ContactSubmissionSchema = new Schema<IContactSubmission>({
  name:    { type: String, required: true },
  email:   { type: String, required: true },
  company: { type: String, default: '' },
  website: { type: String, default: '' },
  topic:   { type: String, default: '' },
  message: { type: String, required: true },
  read:    { type: Boolean, default: false },
  starred: { type: Boolean, default: false },
  status:  { type: String, enum: ['new','replied','archived'], default: 'new' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IContactSubmission>('ContactSubmission', ContactSubmissionSchema);
