export const firebaseConfig = {
  apiKey: "YOUR_KEY_HERE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "nextn-b6058.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "nextn-b6058",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "nextn-b6058.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "360395213611",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:360395213611:web:583008900490b4104e7b85",
};
