// src/services/firebaseConfig.js




import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Usa long-polling apenas quando o SDK detectar que o transporte padrão não
// funciona. Forçar long-polling em todos os aparelhos aumenta tráfego e latência.
// O try/catch cobre o caso de o Firestore já ter sido iniciado em outro módulo.
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
} catch {
  dbInstance = getFirestore(app);
}
export const db = dbInstance;
export default app;
