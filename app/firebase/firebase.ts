// Import the required Firebase modules
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if we're on the client side
const isClient = typeof window !== 'undefined';

// Initialize Firebase only on client side
let app: FirebaseApp;
let auth: Auth;

if (isClient) {
  try {
    // Check if Firebase is already initialized
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    
    // Initialize Firebase Authentication
    auth = getAuth(app);
    
    // Set language for SMS and reCAPTCHA to Russian
    auth.languageCode = 'ru';
    
    // Alternatively, use the device's language
    // auth.useDeviceLanguage();
    
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw new Error('Failed to initialize Firebase. Check your configuration.');
  }
} else {
  // Provide dummy implementations for SSR
  app = {} as FirebaseApp;
  auth = {} as Auth;
  console.log('Firebase initialization skipped on server side');
}

// Initialize Analytics conditionally (browser-only)
let analytics = null;
if (typeof window !== 'undefined') {
  // Check if analytics is supported in this environment
  isSupported().then(yes => {
    if (yes) {
      analytics = getAnalytics(app);
      console.log('Firebase Analytics initialized successfully');
    }
  }).catch(error => {
    console.error('Error initializing Firebase Analytics:', error);
  });
}

export { app, auth, analytics }; 