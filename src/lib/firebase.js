// lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuração do Firebase (baseada na sua imagem)
const firebaseConfig = {
  apiKey: "AIzaSyA_HMe8PCHDlfwswC3pbYHBpsXY7xTxZ-c",
  authDomain: "fit-in-box.firebaseapp.com",
  databaseURL: "https://fit-in-box-default-rtdb.firebaseio.com",
  projectId: "fit-in-box",
  storageBucket: "fit-in-box.firebasestorage.app",
  messagingSenderId: "918579352294",
  appId: "1:918579352294:web:663ebad1fadace45b6e127",
  measurementId: "G-EXQRL8M0WH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig );

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
