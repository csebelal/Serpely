import mongoose, { Document, Schema } from 'mongoose';

export interface ITestimonial extends Document {
  quote: string;
  name: string;
  role: string;
  initial: string;
  order: number;
  isVisible: boolean;
}

const TestimonialSchema = new Schema<ITestimonial>({
  quote: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: '' },
  initial: { type: String, default: '' },
  order: { type: Number, default: 0 },
  isVisible: { type: Boolean, default: true },
});

export default mongoose.model<ITestimonial>('Testimonial', TestimonialSchema);
