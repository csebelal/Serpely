import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import MediaFile from '../models/MediaFile';
import { generateVariants, deleteVariants } from '../lib/images';

const router = Router();

const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// The stored extension is derived from the *validated* mime type, never from
// the client-supplied filename. Otherwise an authenticated user could upload
// "x.html" with a forged image/png mime type and get it served as HTML from
// the API origin (stored XSS).
const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = MIME_EXT[file.mimetype];
    if (!ext) { cb(new Error('File type not allowed. Images only.'), ''); return; }
    cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`);
  },
});

const ALLOWED_MIME = new Set(Object.keys(MIME_EXT));

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('File type not allowed. Images only.'));
  },
});

// Multer errors (bad type, too large) are client errors, not 500s.
const uploadSingle = (req: Request, res: Response, next: NextFunction): void => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      res.status(message.toLowerCase().includes('too large') ? 413 : 400).json({ error: message });
      return;
    }
    next();
  });
};

router.post('/', verifyJWT, uploadSingle, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'No file provided' }); return; }

    const filename = (req.file as Express.Multer.File & { filename: string }).filename;
    const origin = process.env.UPLOAD_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const url = `${origin}/uploads/${filename}`;
    const publicId = `local/${filename}`;

    const media = new MediaFile({
      filename: req.file.originalname,
      url,
      publicId,
      size: req.file.size,
    });
    await media.save();
    // Responsive WebP variants for the frontend srcSet (never fails the upload).
    const variants = await generateVariants(path.join(UPLOADS_DIR, filename));
    res.json({ url, publicId, _id: media._id, variants: variants.map(v => `${origin}/uploads/${path.basename(v)}`) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    res.status(500).json({ error: msg });
  }
});

router.get('/', verifyJWT, async (_req: AuthRequest, res: Response) => {
  try {
    const files = await MediaFile.find().sort({ uploadedAt: -1 });
    res.json(files);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  const publicId = req.query.publicId as string;
  if (!publicId) { res.status(400).json({ error: 'Missing publicId' }); return; }
  try {
    const filename = path.basename(publicId.replace('local/', ''));
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!filePath.startsWith(UPLOADS_DIR + path.sep) && filePath !== UPLOADS_DIR) {
      res.status(400).json({ error: 'Invalid file path' }); return;
    }
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    deleteVariants(filePath);

    await MediaFile.findOneAndDelete({ publicId });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
