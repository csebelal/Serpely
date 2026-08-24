import mongoose, { Document, Schema } from 'mongoose';

export interface IBlogPost extends Document {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  author: string;
  authorInitials: string;
  tagLabel: string;
  tagColor: string;
  tagAccent: boolean;
  coverImage: string;
  category: string;
  published: boolean;
  featured: boolean;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  faq: { question: string; answer: string; order: number }[];
  cta: {
    subtitle: string;
    primaryText: string;
    primaryUrl: string;
    secondaryText: string;
    secondaryUrl: string;
  };
}

const BlogPostSchema = new Schema<IBlogPost>({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  excerpt: { type: String, default: '' },
  body: { type: String, default: '' },
  author: { type: String, default: '' },
  authorInitials: { type: String, default: '' },
  tagLabel: { type: String, default: '' },
  tagColor: { type: String, default: '' },
  tagAccent: { type: Boolean, default: false },
  coverImage: { type: String, default: '' },
  category: { type: String, default: '' },
  published: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  publishedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  faq: [{
    question: { type: String, default: '' },
    answer: { type: String, default: '' },
    order: { type: Number, default: 0 },
  }],
  cta: {
    subtitle: { type: String, default: '' },
    primaryText: { type: String, default: '' },
    primaryUrl: { type: String, default: '' },
    secondaryText: { type: String, default: '' },
    secondaryUrl: { type: String, default: '' },
  },
});


export default mongoose.model<IBlogPost>('BlogPost', BlogPostSchema);
