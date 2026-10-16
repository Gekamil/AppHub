import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

export const firebaseConfig = {
  apiKey: "AIzaSyACDRKCK8O50w1FIoYhBMgqsM9yYUzX-io",
  authDomain: "apphub-662ff.firebaseapp.com",
  projectId: "apphub-662ff",
  storageBucket: "apphub-662ff.firebasestorage.app",
  messagingSenderId: "674118426958",
  appId: "1:674118426958:web:2c4afc7b11219c360efe1f",
  measurementId: "G-EWQ8PRXWYX"
}

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
export const db = getFirestore(app)
