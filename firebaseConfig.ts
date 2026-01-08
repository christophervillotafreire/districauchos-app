// src/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD8jbPnwpnVLS3KFT0keZxcbTxZFFAyxIg",
  authDomain: "districauchos-329e7.firebaseapp.com",
  projectId: "districauchos-329e7",
  storageBucket: "districauchos-329e7.firebasestorage.app",
  messagingSenderId: "1042695966054",
  appId: "1:1042695966054:web:e9b07cfe502098ace58ca7",
  measurementId: "G-PRTQ4LR12H"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
