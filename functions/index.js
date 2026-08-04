const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.submitGame = functions.https.onCall(async (data, context) => {
  // 1. Check if the user is logged in
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to play.');
  }

  const userId = context.auth.uid; 
  const userAnswer = data.answer;
  const gameId = data.gameId;

  const db = admin.firestore();

  // 2. Fetch the game to check the correct answer
  const gameRef = db.collection('games').doc(gameId);
  const gameSnap = await gameRef.get();

  if (!gameSnap.exists) {
     throw new functions.https.HttpsError('not-found', 'Game not found.');
  }

  const correctAnswer = gameSnap.data().correctAnswer;

  // 3. Compare answers and update score safely from the admin SDK
  if (userAnswer === correctAnswer) {
    const userRef = db.collection('users').doc(userId);
    
    // Admin context bypasses regular Firestore security rules
    await userRef.update({
      points: admin.firestore.FieldValue.increment(10),
      gameCorrectToday: true
    });

    return { success: true, message: "Correct answer! Points awarded." };
  } else {
    return { success: false, message: "Incorrect answer." };
  }
});