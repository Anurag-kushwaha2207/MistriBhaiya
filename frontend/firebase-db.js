// ============================================================================
// MistriBhaiya - Firebase Client Database Sync
// Mirrors user profiles, bookings, and jobs into Firebase Firestore
// Project: mistribhaiya-f5a94
// ============================================================================

const FIREBASE_CONFIG = {
  projectId: "mistribhaiya-f5a94",
  appId: "1:995405024880:web:fe0b2482c10ddcd127aeb5",
  storageBucket: "mistribhaiya-f5a94.firebasestorage.app",
  apiKey: "AIzaSyAetA0gHaRd0ai4YMur1a2HSY01R6id528",
  authDomain: "mistribhaiya-f5a94.firebaseapp.com",
  messagingSenderId: "995405024880",
  measurementId: "G-9NYRDDMF6Y"
};

let fbDb = null;
try {
  if (typeof firebase !== "undefined") {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    fbDb = firebase.firestore();
    console.log("Firebase Firestore initialized successfully (project: mistribhaiya-f5a94)");
  }
} catch (e) {
  console.warn("Firebase client init notice:", e);
}

// Client-side direct writes disabled for security; backend handles all Firestore sync.
async function fbSyncUser(u) {}
async function fbSyncWorkerProfile(userId, profile) {}
async function fbSyncContractorProfile(userId, profile) {}
async function fbSyncJob(job) {}
async function fbSyncBooking(booking) {}
async function fbSyncProject(project) {}

window.fbSyncUser = fbSyncUser;
window.fbSyncWorkerProfile = fbSyncWorkerProfile;
window.fbSyncContractorProfile = fbSyncContractorProfile;
window.fbSyncJob = fbSyncJob;
window.fbSyncBooking = fbSyncBooking;
window.fbSyncProject = fbSyncProject;

