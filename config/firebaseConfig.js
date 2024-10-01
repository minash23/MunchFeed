// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBe0PsHKjuhobkDmvw3zbMakHFHtflODe8",
  authDomain: "munchfeed-aef86.firebaseapp.com",
  databaseURL: "https://munchfeed-aef86-default-rtdb.firebaseio.com",
  projectId: "munchfeed-aef86",
  storageBucket: "munchfeed-aef86.appspot.com",
  messagingSenderId: "265445509383",
  appId: "1:265445509383:web:75340a9ed51d1d82bedda2",
  measurementId: "G-M1D0RJEZHM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
const analytics = getAnalytics(app);
const storage = getStorage(app);

