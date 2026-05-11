import mongoose, { Document, Schema } from 'mongoose';

export interface ISEOPage extends Document {
  pageKey: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  canonicalUrl: string;
  noIndex: boolean;
  updatedAt: Date;
}

const SEOPageSchema = new Schema<ISEOPage>({
  pageKey:         { type: String, required: true, unique: true },
  metaTitle:       { type: String, default: '' },
  metaDescription: { type: String, default: '' },
  ogImage:         { type: String, default: '' },
  canonicalUrl:    { type: String, default: '' },
  noIndex:         { type: Boolean, default: false },
  updatedAt:       { type: Date, default: Date.now },
});

export default mongoose.model<ISEOPage>('SEOPage', SEOPageSchema);
