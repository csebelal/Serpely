import { Router, Request, Response } from 'express';
import BlogPost from '../models/BlogPost';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { logAction } from '../lib/audit';
import { pick } from '../lib/utils';

const router = Router();

// GET /api/blog/categories  (auth - distinct categories)
router.get('/categories', verifyJWT, async (_req: AuthRequest, res: Response) => {
  try {
    const categories = await BlogPost.distinct('category');
    res.json(categories.filter(Boolean));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/blog  (public - published only)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const posts = await BlogPost.find({ published: true }).sort({ publishedAt: -1 });
    res.json(posts);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/blog/all  (auth - all including drafts)
router.get('/all', verifyJWT, async (_req: AuthRequest, res: Response) => {
  try {
    const posts = await BlogPost.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/blog/admin/:id  (auth - fetch by _id for editing, includes drafts)
router.get('/admin/:id', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) { res.status(404).json({ error: 'Post not found' }); return; }
    res.json(post);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/blog/:slug  (public)
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug, published: true });
    if (!post) { res.status(404).json({ error: 'Post not found' }); return; }
    res.json(post);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

const BLOG_FIELDS = ['title', 'slug', 'excerpt', 'body', 'category', 'author', 'coverImage', 'published', 'publishedAt', 'tags', 'metaTitle', 'metaDescription', 'canonicalUrl'] as const;

// POST /api/blog  (auth)
router.post('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const data = pick(req.body, BLOG_FIELDS) as Record<string, unknown>;
    const post = new BlogPost(data);
    if (post.published && !post.publishedAt) post.publishedAt = new Date();
    await post.save();
    res.status(201).json(post);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    res.status(400).json({ error: msg });
  }
});

// PUT /api/blog/:id  (auth)
router.put('/:id', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const data = pick(req.body, BLOG_FIELDS) as Record<string, unknown>;
    data.updatedAt = new Date();
    const post = await BlogPost.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!post) { res.status(404).json({ error: 'Post not found' }); return; }
    res.json(post);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/blog/:id  (auth)
router.delete('/:id', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    await BlogPost.findByIdAndDelete(req.params.id);
    await logAction(req, 'delete', 'blog', `id:${req.params.id}`);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/blog/bulk (auth) — bulk publish/unpublish
router.patch('/bulk', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { ids, published } = req.body as { ids: string[]; published: boolean };
    if (!ids?.length) { res.status(400).json({ error: 'ids required' }); return; }
    const update: Record<string, unknown> = { published, updatedAt: new Date() };
    if (published) update.publishedAt = new Date();
    await BlogPost.updateMany({ _id: { $in: ids } }, update);
    await logAction(req, 'update', 'blog', `bulk:${ids.length} published:${published}`);
    res.json({ success: true, count: ids.length });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/blog/bulk (auth) — bulk delete
router.delete('/bulk', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) { res.status(400).json({ error: 'ids required' }); return; }
    await BlogPost.deleteMany({ _id: { $in: ids } });
    await logAction(req, 'delete', 'blog', `bulk:${ids.length}`);
    res.json({ success: true, count: ids.length });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
