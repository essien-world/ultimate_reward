// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDG-g0DIQ9zv-hkfscSJ98oF0FXRcCkeYY",
  authDomain: "maamatz-quiz.firebaseapp.com",
  databaseURL: "https://maamatz-quiz-default-rtdb.firebaseio.com",
  projectId: "maamatz-quiz",
  storageBucket: "maamatz-quiz.firebasestorage.app",
  messagingSenderId: "303788530263",
  appId: "1:303788530263:web:ebf6ca5e96e7a908afe112"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);