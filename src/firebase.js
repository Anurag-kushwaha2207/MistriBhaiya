// Firebase Firestore synchronization bridge
export function syncUser(user) {
  if (typeof window.fbSyncUser === "function") {
    window.fbSyncUser(user);
  }
}

export function syncWorkerProfile(userId, profile) {
  if (typeof window.fbSyncWorkerProfile === "function") {
    window.fbSyncWorkerProfile(userId, profile);
  }
}

export function syncContractorProfile(userId, profile) {
  if (typeof window.fbSyncContractorProfile === "function") {
    window.fbSyncContractorProfile(userId, profile);
  }
}

export function syncJob(job) {
  if (typeof window.fbSyncJob === "function") {
    window.fbSyncJob(job);
  }
}

export function syncBooking(booking) {
  if (typeof window.fbSyncBooking === "function") {
    window.fbSyncBooking(booking);
  }
}


export function syncProject(project) {
  if (typeof window.fbSyncProject === "function") {
    window.fbSyncProject(project);
  }
}
