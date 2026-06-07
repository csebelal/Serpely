import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import MediaFile from '../models/MediaFile';

const router = Router();

const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`);
  },
});

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'image/avif',
]);

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('File type not allowed. Images only.'));
  },
});

router.post('/', verifyJWT, upload.single('file'), async (req: AuthRequest, res: Response) => {
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
    res.json({ url, publicId, _id: media._id });
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

    await MediaFile.findOneAndDelete({ publicId });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
