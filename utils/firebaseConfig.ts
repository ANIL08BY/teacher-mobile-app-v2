import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Senin Firebase Projenin Gizli Anahtarları
const firebaseConfig = {
  apiKey: "AIzaSyBvugqT9cRMYMIEdEw3QfJfRfwdhfIp5Rc",
  authDomain: "teacher-mobile-app-e1232.firebaseapp.com",
  projectId: "teacher-mobile-app-e1232",
  storageBucket: "teacher-mobile-app-e1232.firebasestorage.app",
  messagingSenderId: "263535538021",
  appId: "1:263535538021:web:c32a667a8704f364ca3b8c"
};

// Firebase'i Başlat
const app = initializeApp(firebaseConfig);

// Veritabanı ve Kimlik Doğrulama Servislerini Dışa Aktar
export const db = getFirestore(app);
export const auth = getAuth(app);

export const firebaseApp = initializeApp(firebaseConfig);