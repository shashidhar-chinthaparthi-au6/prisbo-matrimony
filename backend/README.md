# Prisbo Backend API

Backend API for Prisbo Matrimony Platform

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your configuration

4. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Profiles
- `POST /api/profiles` - Create profile (Protected)
- `PUT /api/profiles/:id` - Update profile (Protected)
- `GET /api/profiles/me` - Get own profile (Protected)
- `GET /api/profiles/:id` - Get profile by ID (Protected)
- `POST /api/profiles/photos` - Upload photos (Protected)
- `DELETE /api/profiles/photos/:photoId` - Delete photo (Protected)
- `PUT /api/profiles/photos/:photoId/primary` - Set primary photo (Protected)

### Search
- `GET /api/search` - Search profiles with filters (Protected)

### Interests
- `POST /api/interests` - Send interest (Protected)
- `PUT /api/interests/:id/accept` - Accept interest (Protected)
- `PUT /api/interests/:id/reject` - Reject interest (Protected)
- `GET /api/interests/sent` - Get sent interests (Protected)
- `GET /api/interests/received` - Get received interests (Protected)
- `GET /api/interests/matches` - Get mutual matches (Protected)

### Favorites
- `POST /api/favorites` - Add to favorites (Protected)
- `DELETE /api/favorites/:profileId` - Remove from favorites (Protected)
- `GET /api/favorites` - Get favorites (Protected)

### Chats
- `GET /api/chats` - Get all chats (Protected)
- `POST /api/chats` - Get or create chat (Protected)
- `GET /api/chats/:chatId/messages` - Get messages (Protected)
- `POST /api/chats/:chatId/messages` - Send message (Protected)

### Admin
- `GET /api/admin/users` - Get all users (Admin)
- `GET /api/admin/profiles` - Get all profiles (Admin)
- `PUT /api/admin/profiles/:id/status` - Update profile status (Admin)
- `PUT /api/admin/users/:id/block` - Block/unblock user (Admin)
- `GET /api/admin/stats` - Get statistics (Admin)

## Environment Variables

- `PORT` - Server port
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret key
- `JWT_EXPIRE` - JWT expiration time
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region
- `S3_BUCKET_NAME` - S3 bucket name
- `WEB_URL` - Web app URL (for CORS)
- `MOBILE_URL` - Mobile app URL (for CORS)

