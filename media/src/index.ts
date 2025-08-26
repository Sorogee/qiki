import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(morgan('tiny'));
app.use(helmet());

const storageDir = process.env.MEDIA_STORAGE_DIR || '/data/uploads';
fs.mkdirSync(storageDir, { recursive: true });

const maxMb = parseInt(process.env.MAX_FILE_MB || '15', 10);
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, storageDir),
    filename: (_req, file, cb) => cb(null, Date.now() + '_' + file.originalname.replace(/\s+/g, '_')),
  }),
  limits: { fileSize: maxMb * 1024 * 1024 },
});

app.post('/media/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file' });
  const url = `/uploads/${path.basename(file.path)}`;
  res.json({ url });
});

app.use('/uploads', express.static(storageDir, { fallthrough: false, cacheControl: true, maxAge: '7d' }));

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(5000, () => {
  console.log('Media service on :5000');
});
