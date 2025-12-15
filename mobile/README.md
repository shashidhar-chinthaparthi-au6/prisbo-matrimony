# Prisbo Mobile Application

React Native mobile application for Prisbo Matrimony Platform using Expo

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

3. Start the Expo development server:
```bash
npm start
```

4. Run on iOS:
```bash
npm run ios
```

5. Run on Android:
```bash
npm run android
```

## Features

- User authentication (Login/Register)
- Profile creation and management
- Search and filter profiles
- Send/Receive interests
- Favorites management
- Chat/Messaging
- Native mobile experience

## Tech Stack

- React Native
- Expo
- React Navigation
- Axios
- AsyncStorage

## Notes

- Make sure you have Expo CLI installed globally: `npm install -g expo-cli`
- For iOS development, you need Xcode installed
- For Android development, you need Android Studio installed
- Update the API URL in `.env` file to match your backend server

