import path from 'path';
import fs from 'fs';
import { Router, Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import MediaFile from '../models/MediaFile';

const router = Router();

const cloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name';

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Local uploads dir — resolves to server/uploads/ regardless of cwd
const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const memStorage = multer.memoryStorage();
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage: cloudinaryConfigured ? memStorage : diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /api/upload
router.post('/', verifyJWT, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'No file provided' }); return; }

    let url: string;
    let publicId: string;

    if (cloudinaryConfigured) {
      const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'serpely', resource_type: 'auto' },
          (err, result) => {
            if (err || !result) reject(err || new Error('Upload failed'));
            else resolve(result as { secure_url: string; public_id: string });
          }
        ).end((req.file as Express.Multer.File).buffer);
      });
      url = result.secure_url;
      publicId = result.public_id;
    } else {
      // Local storage — file already written by multer diskStorage
      const filename = (req.file as Express.Multer.File & { filename: string }).filename;
      const origin = `${req.protocol}://${req.get('host')}`;
      url = `${origin}/uploads/${filename}`;
      publicId = `local/${filename}`;
    }

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

// GET /api/upload  (media library)
router.get('/', verifyJWT, async (_req: AuthRequest, res: Response) => {
  try {
    const files = await MediaFile.find().sort({ uploadedAt: -1 });
    res.json(files);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/upload?publicId=...
router.delete('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  const publicId = req.query.publicId as string;
  if (!publicId) { res.status(400).json({ error: 'Missing publicId' }); return; }
  try {
    if (cloudinaryConfigured && !publicId.startsWith('local/')) {
      await cloudinary.uploader.destroy(publicId);
    } else {
      const filename = publicId.replace('local/', '');
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await MediaFile.findOneAndDelete({ publicId });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
