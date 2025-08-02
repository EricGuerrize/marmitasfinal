import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBb9gTYcEq5zKxhW6nDt3bEZtQj8BRB2Z8",
  authDomain: "fit-in-box.firebaseapp.com",
  projectId: "fit-in-box",
  storageBucket: "fit-in-box.firebasestorage.app",
  messagingSenderId: "471254281",
  appId: "1:471254281:web:46c5da6074a9c45d2cbb78"
};

// ✅ CORREÇÃO: Verifica se já existe uma app antes de inicializar
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
