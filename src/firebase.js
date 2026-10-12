import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfxnnkyGRVErYBW0ozexC3zpZ--HiXdwE",
  authDomain: "kpi-education.firebaseapp.com",
  projectId: "kpi-education",
  storageBucket: "kpi-education.firebasestorage.app",
  messagingSenderId: "343079286077",
  appId: "1:343079286077:web:10d015135390ebd5408154",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
