/* Simplest - Authentication Handler */

let currentUser = null;

/**
 * Initialize Auth Listeners
 */
function initAuth(onStateChange) {
  if (isFirebaseLive && auth) {
    auth.onAuthStateChanged(async (user) => {
      currentUser = user;
      updateUIForAuth(user);
      if (user) {
        console.log('[Auth] User logged in:', user.email);
        await initDatabase();
      }
      if (onStateChange) onStateChange(user);
    });
  } else {
    // Local / Demo mode mock auth state
    const savedUser = localStorage.getItem('simplest_demo_user');
    if (savedUser) {
      currentUser = JSON.parse(savedUser);
    } else {
      currentUser = { email: 'admin@simplest.com', uid: 'demo_admin_001' };
      localStorage.setItem('simplest_demo_user', JSON.stringify(currentUser));
    }
    updateUIForAuth(currentUser);
    initDatabase();
    if (onStateChange) onStateChange(currentUser);
  }
}

/**
 * Perform Email/Password Login
 */
async function loginUser(email, password) {
  if (isFirebaseLive && auth) {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    currentUser = cred.user;
    updateUIForAuth(currentUser);
    await initDatabase();
    return cred;
  } else {
    if (!email || !password) {
      throw new Error('Please enter email and password');
    }
    const user = { email: email, uid: 'demo_' + Date.now() };
    currentUser = user;
    localStorage.setItem('simplest_demo_user', JSON.stringify(user));
    updateUIForAuth(user);
    await initDatabase();
    return { user };
  }
}

/**
 * Logout User
 */
async function logoutUser() {
  if (isFirebaseLive && auth) {
    await auth.signOut();
  } else {
    localStorage.removeItem('simplest_demo_user');
    currentUser = null;
    updateUIForAuth(null);
  }
  location.reload();
}

/**
 * Update UI elements depending on auth state
 */
function updateUIForAuth(user) {
  const loginOverlay = document.getElementById('login-modal');
  const userEmailDisplay = document.getElementById('user-email-display');

  if (user) {
    if (loginOverlay) loginOverlay.classList.remove('active');
    if (userEmailDisplay) userEmailDisplay.textContent = user.email || 'Admin User';
  } else {
    if (loginOverlay) loginOverlay.classList.add('active');
    if (userEmailDisplay) userEmailDisplay.textContent = 'Not Logged In';
  }
}
