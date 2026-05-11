import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscriber extends Document {
  email: string;
  active: boolean;
  source: string;
  createdAt: Date;
}

const SubscriberSchema = new Schema<ISubscriber>({
  email:  { type: String, required: true, unique: true, lowercase: true, trim: true },
  active: { type: Boolean, default: true },
  source: { type: String, default: 'newsletter' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<ISubscriber>('Subscriber', SubscriberSchema);
