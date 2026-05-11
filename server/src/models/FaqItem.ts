import mongoose, { Document, Schema } from 'mongoose';

export interface IFaqItem extends Document {
  question: string;
  answer: string;
  category: string;
  section: string;
  order: number;
  isVisible: boolean;
}

const FaqItemSchema = new Schema<IFaqItem>({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: { type: String, default: 'General' },
  section: { type: String, default: 'home', enum: ['home', 'pricing', 'faq-page'] },
  order: { type: Number, default: 0 },
  isVisible: { type: Boolean, default: true },
});

export default mongoose.model<IFaqItem>('FaqItem', FaqItemSchema);
