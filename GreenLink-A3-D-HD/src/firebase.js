import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFunctions } from 'firebase/functions'

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: "greenlink-melbourne-78303.firebasestorage.app",
  messagingSenderId: "150363330562",
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Firebase Authentication (D.1)
export const auth = getAuth(app)

// Firebase Cloud Functions (D.2 / E.1)
export const functions = getFunctions(app, 'australia-southeast1')

export default app