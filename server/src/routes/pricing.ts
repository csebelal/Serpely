import { Router, Request, Response } from 'express';
import PricingPlan from '../models/PricingPlan';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { pick } from '../lib/utils';

const PRICING_FIELDS = ['name', 'price', 'period', 'description', 'features', 'ctaText', 'ctaHref', 'featured', 'order'] as const;

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const plans = await PricingPlan.find().sort('order');
    res.json(plans);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const plans = (req.body as Record<string, unknown>[]).map(item => pick(item, PRICING_FIELDS));
    await PricingPlan.deleteMany({});
    const saved = await PricingPlan.insertMany(plans);
    res.json(saved);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
