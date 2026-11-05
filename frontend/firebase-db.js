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

// Client-side direct sync for users
async function fbSyncUser(u) {
  if (!fbDb || !u || !u.id) return;
  try {
    const payload = {
      id: Number(u.id),
      name: u.name || "",
      phone: u.phone || "",
      role: u.role || "worker",
      avatar: u.avatar || "",
      lang: u.lang || "hi",
      is_admin: Boolean(u.is_admin),
      updated_at: Date.now() / 1000
    };
    await fbDb.collection("users").doc(String(u.id)).set(payload, { merge: true });
    console.log("Synced user to Firebase Firestore:", u.id);
  } catch (e) {
    console.warn("fbSyncUser error:", e);
  }
}

// Client-side direct sync for worker profiles
async function fbSyncWorkerProfile(userId, profile) {
  if (!fbDb || !userId || !profile) return;
  try {
    const payload = {
      user_id: Number(userId),
      skills: profile.skills || [],
      daily_rate: Number(profile.daily_rate) || 0,
      experience_years: Number(profile.experience_years) || 0,
      village: profile.village || "",
      radius_km: Number(profile.radius_km) || 6,
      status: profile.status || "offline",
      lat: profile.lat != null ? Number(profile.lat) : null,
      lng: profile.lng != null ? Number(profile.lng) : null,
      rating_avg: Number(profile.rating_avg) || 0,
      rating_count: Number(profile.rating_count) || 0,
      verified: Boolean(profile.verified),
      updated_at: Date.now() / 1000
    };
    await fbDb.collection("worker_profiles").doc(String(userId)).set(payload, { merge: true });
    console.log("Synced worker profile to Firebase Firestore:", userId);
  } catch (e) {
    console.warn("fbSyncWorkerProfile error:", e);
  }
}

// Client-side direct sync for contractor profiles
async function fbSyncContractorProfile(userId, profile) {
  if (!fbDb || !userId || !profile) return;
  try {
    const payload = {
      user_id: Number(userId),
      company: profile.company || "",
      skills: profile.skills || [],
      village: profile.village || "",
      radius_km: Number(profile.radius_km) || 25,
      min_budget: Number(profile.min_budget) || 0,
      experience_years: Number(profile.experience_years) || 0,
      about: profile.about || "",
      lat: profile.lat != null ? Number(profile.lat) : null,
      lng: profile.lng != null ? Number(profile.lng) : null,
      rating_avg: Number(profile.rating_avg) || 0,
      updated_at: Date.now() / 1000
    };
    await fbDb.collection("contractor_profiles").doc(String(userId)).set(payload, { merge: true });
    console.log("Synced contractor profile to Firebase Firestore:", userId);
  } catch (e) {
    console.warn("fbSyncContractorProfile error:", e);
  }
}

// Client-side direct sync for jobs
async function fbSyncJob(job) {
  if (!fbDb || !job || !job.id) return;
  try {
    const payload = {
      id: Number(job.id),
      customer_id: Number(job.customer_id) || null,
      skill: job.skill || "",
      description: job.description || "",
      budget: Number(job.budget) || 0,
      days: Number(job.days) || 1,
      start_date: job.start_date || "",
      address: job.address || "",
      lat: job.lat != null ? Number(job.lat) : null,
      lng: job.lng != null ? Number(job.lng) : null,
      status: job.status || "open",
      updated_at: Date.now() / 1000
    };
    await fbDb.collection("jobs").doc(String(job.id)).set(payload, { merge: true });
    console.log("Synced job to Firebase Firestore:", job.id);
  } catch (e) {
    console.warn("fbSyncJob error:", e);
  }
}

// Client-side direct sync for bookings
async function fbSyncBooking(b) {
  if (!fbDb || !b || !b.id) return;
  try {
    const payload = {
      id: Number(b.id),
      worker_id: Number(b.worker_id) || null,
      customer_id: Number(b.customer_id) || null,
      job_id: b.job_id ? Number(b.job_id) : null,
      skill: b.skill || "",
      start_date: b.start_date || "",
      days: Number(b.days) || 1,
      agreed_rate: Number(b.agreed_rate || b.daily_rate) || 0,
      status: b.status || "requested",
      address: b.address || "",
      note: b.note || "",
      lat: b.lat != null ? Number(b.lat) : null,
      lng: b.lng != null ? Number(b.lng) : null,
      start_otp: b.start_otp || "",
      rating: b.rating != null ? Number(b.rating) : null,
      updated_at: Date.now() / 1000
    };
    await fbDb.collection("bookings").doc(String(b.id)).set(payload, { merge: true });
    console.log("Synced booking to Firebase Firestore:", b.id);
  } catch (e) {
    console.warn("fbSyncBooking error:", e);
  }
}

// Client-side direct sync for projects
async function fbSyncProject(p) {
  if (!fbDb || !p || !p.id) return;
  try {
    const payload = {
      id: Number(p.id),
      customer_id: Number(p.customer_id) || null,
      contractor_id: Number(p.contractor_id) || null,
      title: p.title || "",
      description: p.description || "",
      budget: Number(p.budget || p.total_budget) || 0,
      status: p.status || "requested",
      start_date: p.start_date || "",
      days: Number(p.days) || 1,
      workers_needed: Number(p.workers_needed) || 1,
      updated_at: Date.now() / 1000
    };
    await fbDb.collection("projects").doc(String(p.id)).set(payload, { merge: true });
    console.log("Synced project to Firebase Firestore:", p.id);
  } catch (e) {
    console.warn("fbSyncProject error:", e);
  }
}

