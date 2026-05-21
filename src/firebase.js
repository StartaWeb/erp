import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDO-saswGsi9R7KNvHd0SB_Mlp8O7ZOzVk",
  authDomain: "erp-almoxarifado.firebaseapp.com",
  projectId: "erp-almoxarifado",
  storageBucket: "erp-almoxarifado.firebasestorage.app",
  messagingSenderId: "249956829888",
  appId: "1:249956829888:web:9f5dbbac1fe42d53873b25"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
