import { initializeFirebase } from "@/firebase";

/**
 * Centrally managed firestore instance to avoid double-initialization.
 */
const { firestore: db } = initializeFirebase();

export { db };
