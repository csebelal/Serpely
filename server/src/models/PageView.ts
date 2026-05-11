import mongoose, { Document, Schema } from 'mongoose';

export interface IPageView extends Document {
  path: string;
  referrer: string;
  ua: string;
  createdAt: Date;
}

const PageViewSchema = new Schema<IPageView>({
  path:     { type: String, required: true },
  referrer: { type: String, default: '' },
  ua:       { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 }, // 90-day TTL
});

PageViewSchema.index({ createdAt: -1 });
PageViewSchema.index({ path: 1 });

export default mongoose.model<IPageView>('PageView', PageViewSchema);
