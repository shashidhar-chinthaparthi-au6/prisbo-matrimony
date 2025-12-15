import AWS from 'aws-sdk';

// Configure AWS S3
const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  signatureVersion: 'v4',
};

const s3 = new AWS.S3(s3Config);

// Verify S3 configuration
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.warn('Warning: AWS credentials not configured');
}

export default s3;

export const uploadToS3 = (file, folder = 'profiles') => {
  return new Promise((resolve, reject) => {
    // Sanitize filename
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${folder}/${Date.now()}-${sanitizedName}`;
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Don't use ACL if bucket has ACLs disabled
      // ACL: 'public-read',
    };

    s3.upload(params, (err, data) => {
      if (err) {
        console.error('S3 Upload Error:', err);
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        reject(new Error(`S3 upload failed: ${err.message}`));
      } else {
        // If ACL is disabled, generate presigned URL or use public URL
        const url = data.Location || `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        resolve(url);
      }
    });
  });
};

export const deleteFromS3 = (url) => {
  return new Promise((resolve, reject) => {
    const key = url.split('.com/')[1];
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    };

    s3.deleteObject(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

