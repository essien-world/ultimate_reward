// firebase.js (module) - corrected with your catch blocks
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
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Put your firebaseConfig here (same as you had)
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

/*
  Helper functions that mirror the old apiCall actions.
  For sensitive ops (redeem / awarding points) use cloud functions; the client-side transaction here is a simple example.
*/

async function registerUser({ name, phone, password, state, lga, referral }) {
  if (!phone || !password) {
    return { success: false, message: "Phone and password are required" };
  }

  const email = `${phone}@gulder.local`; // local pseudo-email mapping for Firebase Auth

  try {
    // Use the phone as document id to ensure uniqueness
    const docRef = doc(db, "users", phone);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { success: false, message: "Phone already registered" };
    }

    // Create Auth user and wait for sign-in to complete
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Auth create user error:", err);
      return { success: false, message: err.code ? `${err.code}: ${err.message}` : String(err) };
    }

    // Force-refresh ID token so Firestore security rules see the correct request.auth token
    try {
      await userCredential.user.getIdToken(true);
    } catch (tokenErr) {
      console.warn("Failed to refresh ID token immediately after signup:", tokenErr);
      // Not fatal — but without a token refresh the next Firestore write MAY be denied; return failure to be safe.
      return { success: false, message: "Failed to initialize auth token. Please try logging in." };
    }

    const uniqueRefCode = `GULD${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const record = {
      name: name || "",
      phone,
      state: state || "",
      lga: lga || "",
      referral: uniqueRefCode, // generated referral code
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
    console.error("REGISTER ERROR:", err);
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

  // gather additional info (e.g., leaderboard data)
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
      const gameDocRef = await addDoc(gamesCol, { phone, correctCount, roundNumber, timestamp: serverTimestamp(), addedPoints });
      return { added: addedPoints, points: newPoints };
    });
    return { success: true, added: result.added, points: result.points, gameCorrectToday: (result.points || 0) };
  } catch (err) {
    console.error("submitGame error:", err);
    return { success: false, message: err.message || "Failed to submit game" };
  }
}

async function redeem({ phone, referral }) {
  const userRef = doc(db, "users", phone);
  try {
    const result = await runTransaction(db, async (tx) => {
      const uSnap = await tx.get(userRef);
      if (!uSnap.exists()) throw new Error("User not found");
      const u = uSnap.data();

      if (u.redeemCode && u.redeemCode.length > 0) {
        return { already: true, code: u.redeemCode, points: u.points || 0, validReferrals: u.validReferrals || 0 };
      }

      const code = `GULD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const addedPoints = 600;
      const newPoints = (u.points || 0) + addedPoints;

      const userUpdates = {
        redeemCode: code,
        lastRedeemAt: serverTimestamp(),
        points: newPoints
      };

      let referrerValidReferrals = u.validReferrals || 0;
      if (u.referredBy && !u.referredByCredited) {
        const usersCol = collection(db, "users");
        const q = query(usersCol, where("referral", "==", u.referredBy), limit(1));
        const refSnap = await getDocs(q);
        if (!refSnap.empty) {
          const refDoc = refSnap.docs[0];
          const refRef = doc(db, "users", refDoc.id);
          const refData = refDoc.data();
          const refNewPoints = (refData.points || 0) + 500;
          referrerValidReferrals = (refData.validReferrals || 0) + 1;

          tx.update(refRef, { points: refNewPoints, validReferrals: referrerValidReferrals });
          userUpdates.referredByCredited = true;
        }
      }

      tx.update(userRef, userUpdates);

      return { already: false, code, points: newPoints, validReferrals: referrerValidReferrals };
    });

    return { success: true, code: result.code, points: result.points, validReferrals: result.validReferrals, already: result.already };
  } catch (err) {
    console.error("redeem error:", err);
    return { success: false, message: err.message || "Failed to redeem" };
  }
}

async function getLeaderboard() {
  const usersCol = collection(db, "users");
  const q = query(usersCol, orderBy("points", "desc"), limit(50));
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
  return { success: true, meets: points >= 10000, points };
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
  window.redeem = redeem;
  window.getLeaderboard = getLeaderboard;
  window.submitComment = submitComment;
  window.setPhoneVerified = setPhoneVerified;
  window.checkReferrerPoints = checkReferrerPoints;
}