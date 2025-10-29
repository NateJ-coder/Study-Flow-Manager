
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Initialize firebase-admin once and export commonly used services.
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Allow injecting service account JSON via env var (stringified)
      const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(cred),
      });
      logger.info("firebase-admin initialized with service account from env");
    } else {
      // In Cloud Functions this uses the built-in service account
      admin.initializeApp();
      logger.info("firebase-admin initialized with default credentials");
    }
  } catch (e) {
    // Fallback to default init to avoid throwing during deployment
    try {
      admin.initializeApp();
    } catch (err) {
      /* ignore */
    }
    logger.warn("firebase-admin init encountered an issue", e);
  }
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = {
  admin,
  db,
  auth,
  storage,
};
