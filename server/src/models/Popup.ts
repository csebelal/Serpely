import mongoose, { Document, Schema } from 'mongoose';

export interface IPopup extends Document {
  type: 'banner' | 'modal' | 'corner';
  title: string;
  body: string;
  ctaText: string;
  ctaHref: string;
  bgColor: string;
  trigger: 'immediate' | 'exit-intent' | 'scroll-50';
  delay: number;
  active: boolean;
  startAt?: Date;
  endAt?: Date;
  createdAt: Date;
}

const PopupSchema = new Schema<IPopup>({
  type:    { type: String, enum: ['banner','modal','corner'], default: 'banner' },
  title:   { type: String, default: '' },
  body:    { type: String, default: '' },
  ctaText: { type: String, default: '' },
  ctaHref: { type: String, default: '#' },
  bgColor: { type: String, default: '#00C27A' },
  trigger: { type: String, enum: ['immediate','exit-intent','scroll-50'], default: 'immediate' },
  delay:   { type: Number, default: 0 },
  active:  { type: Boolean, default: false },
  startAt: { type: Date },
  endAt:   { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IPopup>('Popup', PopupSchema);
