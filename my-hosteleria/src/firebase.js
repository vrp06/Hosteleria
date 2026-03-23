// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBpx_szcDUPmXWI_zHL3JuPQSBEiUC7K8E",
  authDomain: "reacthosteleriajoviat-26273.firebaseapp.com",
  projectId: "reacthosteleriajoviat-26273",
  storageBucket: "reacthosteleriajoviat-26273.firebasestorage.app",
  messagingSenderId: "29602822309",
  appId: "1:29602822309:web:bb5dc73d5ca0eb0d75f54c",
  measurementId: "G-NJK9C1B82V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);