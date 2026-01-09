import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

/* ==============================
   Firebase Configuration
   (Shared with Mobile Order)
   ============================== */
const firebaseConfig = {
    apiKey: "AIzaSyA-Ijkbo-9rgrNKbDlRJ-rQVYdSXR_a9Do",
    authDomain: "nanryosai-2026-a4091.firebaseapp.com",
    projectId: "nanryosai-2026-a4091",
    storageBucket: "nanryosai-2026-a4091.firebasestorage.app",
    messagingSenderId: "93228414556",
    appId: "1:93228414556:web:f64f90c13849fae9049899",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global User State
let currentUser = null;

// Handle Redirect Login Result (Run on page load)
// This captures the user returning from the Google auth page
getRedirectResult(auth)
    .then(async (result) => {
        if (result) {
            const user = result.user;
            // Save/Update user profile in Firestore
            await setDoc(doc(db, "users", user.uid), {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                lastLogin: serverTimestamp()
            }, { merge: true });
        }
    })
    .catch((error) => {
        console.error("Redirect login failed:", error);
    });

/**
 * Initiates Google Login via Redirect
 * Note: Does not return user immediately. Page will redirect.
 */
async function login() {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithRedirect(auth, provider);
        // Page will redirect, so no further code here is reachable in this session
    } catch (error) {
        console.error("Login initiation failed:", error);
        throw error;
    }
}

/**
 * Logs out the current user
 */
async function logout() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed:", error);
    }
}

/**
 * Subscribes to auth state changes.
 * @param {Function} callback - Function to call with (user|null)
 */
function watchUser(callback) {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        callback(user);
    });
}

/**
 * Get current user (synchronous, might be null if not yet loaded)
 */
function getCurrentUser() {
    return currentUser;
}

// Export everything needed
export { app, auth, db, login, logout, watchUser, getCurrentUser };
