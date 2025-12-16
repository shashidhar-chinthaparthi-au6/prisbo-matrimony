import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
// Note: In serverless environments (Vercel), directories are read-only
// File uploads should use S3 instead of local storage
const uploadsDir = path.join(__dirname, '../uploads');
const profilesDir = path.join(uploadsDir, 'profiles');
const chatDir = path.join(uploadsDir, 'chat');

// Only create directories if not in serverless environment
// Wrap in try-catch to prevent crashes if directory creation fails
try {
  if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    [uploadsDir, profilesDir, chatDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }
} catch (error) {
  // Silently fail - directories might not be writable in serverless
  // File uploads will use S3 in production anyway
  console.warn('Could not create upload directories (this is normal in serverless):', error.message);
}

// Configure storage for local file system
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine folder based on route or default to profiles
    const folder = req.route?.path?.includes('chat') ? chatDir : profilesDir;
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_').replace(ext, '');
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export const uploadSingle = upload.single('photo');
export const uploadMultiple = upload.array('photos', 10);

// Helper function to get public URL for local file
export const getLocalFileUrl = (filePath) => {
  const relativePath = filePath.replace(uploadsDir, '').replace(/\\/g, '/');
  return `/uploads${relativePath}`;
};

