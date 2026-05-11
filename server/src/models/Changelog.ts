import mongoose, { Document, Schema } from 'mongoose';

export interface IChangelog extends Document {
  title: string;
  slug: string;
  body: string;
  type: 'feature' | 'improvement' | 'fix';
  published: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChangelogSchema = new Schema<IChangelog>({
  title:       { type: String, required: true },
  slug:        { type: String, required: true, unique: true },
  body:        { type: String, default: '' },
  type:        { type: String, enum: ['feature','improvement','fix'], default: 'feature' },
  published:   { type: Boolean, default: false },
  publishedAt: { type: Date },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
});

export default mongoose.model<IChangelog>('Changelog', ChangelogSchema);
