import mongoose, { Document, Schema } from 'mongoose';

export interface ISiteSection extends Document {
  section: string;
  data: Record<string, unknown>;
  updatedAt: Date;
}

const SiteSectionSchema = new Schema<ISiteSection>({
  section: { type: String, required: true, unique: true },
  data: { type: Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<ISiteSection>('SiteSection', SiteSectionSchema);
