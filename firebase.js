// firebase.js (module) - Cleaned & Fixed
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Put your firebaseConfig here
const firebaseConfig = {
  apiKey: "AIzaSyDG-g0DIQ9zv-hkfscSJ98oF0FXRcCkeYY",
  authDomain: "maamatz-quiz.firebaseapp.com",
  databaseURL: "https://maamatz-quiz-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "maamatz-quiz",
  storageBucket: "maamatz-quiz.firebasestorage.app",
  messagingSenderId: "303788530263",
  appId: "1:303788530263:web:ebf6ca5e96e7a908afe112"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function registerUser({ name, phone, password, state, lga, referral }) {
  if (!phone || !password) {
    return { success: false, message: "Phone and password are required" };
  }

  const email = `${phone}@gulder.local`; // local pseudo-email mapping for Firebase Auth

  try {
    const docRef = doc(db, "users", phone);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { success: false, message: "Phone already registered" };
    }

    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Auth create user error:", err);
      return { success: false, message: err.code ? `${err.code}: ${err.message}` : String(err) };
    }

    try {
      await userCredential.user.getIdToken(true);
    } catch (tokenErr) {
      console.warn("Failed to refresh ID token immediately after signup:", tokenErr);
      return { success: false, message: "Failed to initialize auth token. Please try logging in." };
    }

    const uniqueRefCode = `GULD${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const record = {
      name: name || "",
      phone,
      state: state || "",
      lga: lga || "",
      referral: uniqueRefCode,
      referredBy: referral || "",
      points: 0,
      validReferrals: 0,
      redeemCode: "",
      phoneVerified: false,
      createdAt: serverTimestamp()
    };

    await setDoc(docRef, record);
    return { success: true, record };
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return {
      success: false,
      message: err.code ? `${err.code}: ${err.message}` : String(err)
    };
  }
}

async function lookupPhone({ phone, password }) {
  if (!phone || !password) return { success: false, message: "Phone and password required" };

  const docRef = doc(db, "users", phone);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return { success: false, message: "User not found" };
    const data = snap.data();

    const email = `${phone}@gulder.local`;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true, record: data };
    } catch (err) {
      console.error("Auth sign-in failed:", err);
      return { success: false, message: err.code ? `${err.code}: ${err.message}` : String(err) };
    }
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    alert(err.code + "\n" + err.message);

    return {
        success: false,
        message: err.code + ": " + err.message
    };
  }
}

async function getUserData({ phone }) {
  const docRef = doc(db, "users", phone);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return { success: false, message: "User not found" };
  const data = snap.data();

  return {
    success: true,
    points: data.points || 0,
    validReferrals: data.validReferrals || 0,
    redeemCode: data.redeemCode || "",
    phoneVerified: !!data.phoneVerified,
    gameCorrectToday: data.gameCorrectToday || 0,
    bankDetails: data.bankDetails || null
  };
}

async function submitBank({ phone, bankName, accountName, accountNumber }) {
  const docRef = doc(db, "users", phone);
  try {
    await updateDoc(docRef, {
      bankDetails: { bankName, accountName, accountNumber, savedAt: serverTimestamp() }
    });
  } catch (err) {
    if (err && err.code === "not-found") {
      await setDoc(docRef, { bankDetails: { bankName, accountName, accountNumber, savedAt: serverTimestamp() } }, { merge: true });
    } else {
      throw err;
    }
  }

  const updated = await getDoc(docRef);
  return { success: true, bankDetails: updated.data().bankDetails };
}

async function submitGame({ phone, correctCount, roundNumber }) {
  const userRef = doc(db, "users", phone);
  const gamesCol = collection(db, "games");

  try {
    const result = await runTransaction(db, async (tx) => {
      const uSnap = await tx.get(userRef);
      if (!uSnap.exists()) throw new Error("User not found");

      const u = uSnap.data();
      const addedPoints = (correctCount || 0) * 100;
      const newPoints = (u.points || 0) + addedPoints;

      tx.update(userRef, { points: newPoints, lastGameAt: serverTimestamp(), gameCorrectToday: (u.gameCorrectToday || 0) + (correctCount || 0) });
      await addDoc(gamesCol, { phone, correctCount, roundNumber, timestamp: serverTimestamp(), addedPoints });
      return { added: addedPoints, points: newPoints };
    });
    return { success: true, added: result.added, points: result.points, gameCorrectToday: (result.points || 0) };
  } catch (err) {
    console.error("submitGame error:", err);
    return { success: false, message: err.message || "Failed to submit game" };
  }
}

async function submitGameAnswer(gameId, selectedAnswer) {
  if (!auth.currentUser) {
    alert("Please log in first!");
    return;
  }
  const userPhone = auth.currentUser.email.split('@')[0]; 
  const userRef = doc(db, "users", userPhone);

  try {
    await updateDoc(userRef, {
      lastGameId: gameId,
      lastAnswer: selectedAnswer,
      points: increment(100),
      gameCorrectToday: true
    });

    alert("Correct answer! 100 points added to your account.");
  } catch (error) {
    if (error.code === 'permission-denied') {
      alert("Incorrect answer or you have already completed today's game!");
    } else {
      alert("Submission error: " + error.message);
    }
  }
}

export async function redeem(phone) {
  const userRef = doc(db, "users", phone);

  try {
    return await runTransaction(db, async (tx) => {
      // ==========================================
      // STEP 1: ALL READS FIRST
      // ==========================================
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) {
        throw new Error("User record not found.");
      }

      const userData = userSnap.data();

      // Return existing code if already redeemed
      if (userData.redeemCode && userData.redeemCode.length > 0) {
        return {
          already: true,
          code: userData.redeemCode,
          points: userData.points || 0
        };
      }

      // Pre-fetch referrer data BEFORE performing writes
      let referrerRef = null;
      let referrerSnap = null;

      if (userData.referredBy && !userData.referredByCredited) {
        const q = query(collection(db, "users"), where("referral", "==", userData.referredBy));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          referrerRef = qSnap.docs[0].ref;
          referrerSnap = await tx.get(referrerRef); // READ referrer doc inside transaction
        }
      }

      // ==========================================
      // STEP 2: ALL WRITES SECOND
      // ==========================================
      const generatedCode = `GULD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const addedPoints = 600;
      const newPoints = (userData.points || 0) + addedPoints;

      // 1. Update current user
      tx.update(userRef, {
        redeemCode: generatedCode,
        points: newPoints,
        lastRedeemAt: serverTimestamp(),
        referredByCredited: true
      });

      // 2. Update referrer if valid
      if (referrerRef && referrerSnap && referrerSnap.exists()) {
        const refData = referrerSnap.data();
        tx.update(referrerRef, {
          points: (refData.points || 0) + 500,
          validReferrals: (refData.validReferrals || 0) + 1
        });
      }

      return {
        success: true,
        already: false,
        code: generatedCode,
        points: newPoints
      };
    });
  } catch (err) {
    console.error("Redemption failed:", err);
    return { success: false, message: err.message };
  }
}

async function getLeaderboard() {
  const usersCol = collection(db, "users");
  const q = query(usersCol, orderBy("points", "desc"), limit(100));
  const snap = await getDocs(q);
  const rows = [];
  snap.forEach((d) => {
    const data = d.data();
    rows.push({ name: data.name || "", referral: data.referral || "", points: data.points || 0 });
  });
  return { success: true, leaderboard: rows };
}

async function submitComment({ phone, name, comment }) {
  const commentsCol = collection(db, "comments");
  await addDoc(commentsCol, { phone, name, comment, createdAt: serverTimestamp() });
  return { success: true };
}

async function setPhoneVerified({ phone, verified }) {
  const docRef = doc(db, "users", phone);
  try {
    await updateDoc(docRef, { phoneVerified: !!verified });
  } catch (err) {
    if (err.code === "not-found") {
      await setDoc(docRef, { phoneVerified: !!verified }, { merge: true });
    } else {
      throw err;
    }
  }
  return { success: true };
}

async function checkReferrerPoints({ referredByCode }) {
  const usersCol = collection(db, "users");
  const q = query(usersCol, where("referral", "==", referredByCode), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return { success: true, meets: false, points: 0 };
  const refData = snap.docs[0].data();
  const points = refData.points || 0;
  return { success: true, meets: points >= 500, points };
}

/* Exports */
export {
  app,
  db,
  auth,
  registerUser,
  lookupPhone,
  getUserData,
  submitBank,
  submitGame,
  submitGameAnswer,
  redeem,
  getLeaderboard,
  submitComment,
  setPhoneVerified,
  checkReferrerPoints
};

// Compatibility: expose helpers to legacy/global scripts
if (typeof window !== "undefined") {
  window.firebaseApp = app;
  window.firebaseDB = db;
  window.firebaseAuth = auth;

  window.registerUser = registerUser;
  window.lookupPhone = lookupPhone;
  window.getUserData = getUserData;
  window.submitBank = submitBank;
  window.submitGame = submitGame;
  window.submitGameAnswer = submitGameAnswer;
  window.redeem = redeem;
  window.getLeaderboard = getLeaderboard;
  window.submitComment = submitComment;
  window.setPhoneVerified = setPhoneVerified;
  window.checkReferrerPoints = checkReferrerPoints;
}