import mongoose, { Document, Schema } from 'mongoose';

interface PricingFeature {
  text: string;
  included: boolean;
}

export interface IPricingPlan extends Document {
  name: string;
  badge: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  annualBilledAs: string;
  features: PricingFeature[];
  isFeatured: boolean;
  ctaLabel: string;
  order: number;
}

const PricingPlanSchema = new Schema<IPricingPlan>({
  name: { type: String, required: true },
  badge: { type: String, default: '' },
  description: { type: String, default: '' },
  monthlyPrice: { type: Number, default: 0 },
  annualPrice: { type: Number, default: 0 },
  annualBilledAs: { type: String, default: '' },
  features: [{ text: String, included: Boolean }],
  isFeatured: { type: Boolean, default: false },
  ctaLabel: { type: String, default: 'Get Started' },
  order: { type: Number, default: 0 },
});

export default mongoose.model<IPricingPlan>('PricingPlan', PricingPlanSchema);
