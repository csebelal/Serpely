import { Router, Response } from 'express';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import SiteSection from '../models/SiteSection';
import BlogPost from '../models/BlogPost';
import PricingPlan from '../models/PricingPlan';
import Testimonial from '../models/Testimonial';
import FaqItem from '../models/FaqItem';
import NavItem from '../models/NavItem';
import FooterConfig from '../models/FooterConfig';
import SiteSettings from '../models/SiteSettings';

const router = Router();

// GET /api/backup (auth)
router.get('/', verifyJWT, async (_req: AuthRequest, res: Response) => {
  try {
    const [sections, blogPosts, pricing, testimonials, faq, nav, footer, settings] = await Promise.all([
      SiteSection.find().lean(),
      BlogPost.find().lean(),
      PricingPlan.find().lean(),
      Testimonial.find().lean(),
      FaqItem.find().lean(),
      NavItem.find().lean(),
      FooterConfig.find().lean(),
      SiteSettings.find().lean(),
    ]);
    const backup = {
      exportedAt: new Date().toISOString(),
      sections, blogPosts, pricing, testimonials, faq, nav, footer, settings,
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${new Date().toISOString().slice(0,10)}.json"`);
    res.json(backup);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/backup/restore (auth)
router.post('/restore', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body as {
      sections?: unknown[]; blogPosts?: unknown[]; pricing?: unknown[];
      testimonials?: unknown[]; faq?: unknown[]; nav?: unknown[]; footer?: unknown[]; settings?: unknown[];
    };

    const restore = async (Model: { deleteMany: (q: object) => Promise<unknown>; insertMany: (d: unknown[]) => Promise<unknown> }, rows?: unknown[]) => {
      if (!rows?.length) return;
      await Model.deleteMany({});
      await Model.insertMany(rows.map((r: unknown) => {
        const { _id: _, __v: __, ...rest } = r as Record<string, unknown>;
        return rest;
      }));
    };

    await Promise.all([
      restore(SiteSection, data.sections),
      restore(BlogPost, data.blogPosts),
      restore(PricingPlan, data.pricing),
      restore(Testimonial, data.testimonials),
      restore(FaqItem, data.faq),
      restore(NavItem, data.nav),
      restore(FooterConfig, data.footer),
      restore(SiteSettings, data.settings),
    ]);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
