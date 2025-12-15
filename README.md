# Prisbo Matrimony

A complete matrimony platform with web and mobile applications.

## Features

- User Registration & Authentication
- Profile Management (Bride/Groom)
- Search & Filter Profiles
- Send/Receive Interests
- Accept/Reject Interests
- Favorites Management
- Real-time Chat with Availability Status
- Notifications System
- Photo Uploads

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB
- JWT Authentication
- Multer for file uploads

### Web Frontend
- React
- React Router
- React Query
- Tailwind CSS
- Vite

### Mobile Frontend
- React Native
- Expo
- React Navigation
- React Query

## Project Structure

```
wedding/
├── backend/          # Node.js/Express backend
├── web/             # React web application
└── mobile/          # React Native/Expo mobile application
```

## Setup Instructions

### Backend

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file with:
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_s3_bucket_name
```

4. Run the server:
```bash
npm start
```

### Web Application

1. Navigate to web directory:
```bash
cd web
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file with:
```
VITE_API_URL=http://localhost:5000/api
```

4. Run the development server:
```bash
npm run dev
```

### Mobile Application

1. Navigate to mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Update `config/api.js` with your API URL

4. Run the Expo app:
```bash
npx expo start
```

## Environment Variables

### Backend (.env)
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region
- `AWS_S3_BUCKET` - S3 bucket name

### Web (.env)
- `VITE_API_URL` - Backend API URL

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Profiles
- `GET /api/profiles/me` - Get current user's profile
- `POST /api/profiles` - Create profile
- `PUT /api/profiles` - Update profile
- `GET /api/profiles/:id` - Get profile by ID
- `POST /api/profiles/photos` - Upload photos

### Search
- `GET /api/search` - Search profiles

### Interests
- `POST /api/interests` - Send interest
- `GET /api/interests/sent` - Get sent interests
- `GET /api/interests/received` - Get received interests
- `GET /api/interests/matches` - Get mutual matches
- `PUT /api/interests/:id/accept` - Accept interest
- `PUT /api/interests/:id/reject` - Reject interest

### Favorites
- `GET /api/favorites` - Get favorites
- `POST /api/favorites` - Add favorite
- `DELETE /api/favorites/:id` - Remove favorite

### Chats
- `GET /api/chats` - Get all chats
- `POST /api/chats` - Create or get chat
- `GET /api/chats/:chatId/messages` - Get messages
- `POST /api/chats/:chatId/messages` - Send message

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification
- `DELETE /api/notifications/delete-all` - Delete all notifications

## License

MIT
