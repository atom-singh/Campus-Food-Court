import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const globalForFirebase = globalThis as unknown as { firebaseAdminApp?: App };

function buildApp(): App {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env (from a service account key)."
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const app = globalForFirebase.firebaseAdminApp ?? getApps()[0] ?? buildApp();

if (process.env.NODE_ENV !== "production") {
  globalForFirebase.firebaseAdminApp = app;
}

export const db = getFirestore(app);
export { FieldValue, Timestamp };
