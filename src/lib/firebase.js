import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyClq7IWwAgJPAsAkhfiX6vzjXQK-h3UfRM",
  authDomain: "simulador-3362613.firebaseapp.com",
  projectId: "simulador-3362613",
  storageBucket: "simulador-3362613.firebasestorage.app",
  messagingSenderId: "953861702629",
  appId: "1:953861702629:web:78342682aaf3c96b59a50c",
  measurementId: "G-RGMN2PKJ5M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
