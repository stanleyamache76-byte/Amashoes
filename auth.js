/* ============================================
   AMASHOES — Auth (Supabase email + password)
   Every write to Supabase in this file relies on
   the RLS policies in supabase/schema.sql — the
   client never trusts itself to enforce security,
   only the database does.
============================================ */
let currentUser = null;
let currentProfile = null; // row from `profiles`, includes role

async function initAuth(){
  if (!SUPABASE_READY){
    renderAuthUI();
    return;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session ? session.user : null;
  if (currentUser) await loadProfile();
  renderAuthUI();

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session ? session.user : null;
    currentProfile = null;
    if (currentUser) await loadProfile();
    renderAuthUI();
    if (typeof refreshCartUI === "function") refreshCartUI();
    if (typeof refreshAdminUI === "function") refreshAdminUI();
    if (typeof loadWishlistIds === "function"){
      await loadWishlistIds();
      refreshWishlistButtons();
      refreshWishlistCount();
    }
  });
}

async function loadProfile(){
  if (!currentUser) return;
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();
  if (!error) currentProfile = data;
}

function isAdmin(){
  return !!(currentProfile && currentProfile.role === "admin");
}

async function signUp(email, password){
  if (!SUPABASE_READY) return { error: "Supabase is not configured yet. Add your project URL and anon key in js/config.js." };
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) return { error: error.message };
  return { data };
}

async function signIn(email, password){
  if (!SUPABASE_READY) return { error: "Supabase is not configured yet. Add your project URL and anon key in js/config.js." };
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  currentUser = data.user;
  await loadProfile();
  return { data };
}

async function signOutUser(){
  if (SUPABASE_READY) await supabaseClient.auth.signOut();
  currentUser = null;
  currentProfile = null;
  renderAuthUI();
  if (typeof refreshCartUI === "function") refreshCartUI();
  if (typeof refreshAdminUI === "function") refreshAdminUI();
  navigateTo("home");
}

function renderAuthUI(){
  const navLink = document.getElementById("navAuthLink");
  const sidebarBtn = document.getElementById("sidebarAuthBtn");
  const signedInBox = document.getElementById("authSignedIn");
  const signedOutBox = document.getElementById("authSignedOut");
  const emailLabel = document.getElementById("authUserEmail");
  const navAdminLink = document.getElementById("navAdminLink");
  const sidebarAdminLink = document.getElementById("sidebarAdminLink");

  if (currentUser){
    if (navLink) navLink.textContent = "Account";
    if (sidebarBtn) sidebarBtn.textContent = "Account";
    if (signedInBox) signedInBox.style.display = "block";
    if (signedOutBox) signedOutBox.style.display = "none";
    if (emailLabel) emailLabel.textContent = currentUser.email || "Guest checkout";
  } else {
    if (navLink) navLink.textContent = "Login";
    if (sidebarBtn) sidebarBtn.textContent = "Login / Sign up";
    if (signedInBox) signedInBox.style.display = "none";
    if (signedOutBox) signedOutBox.style.display = "block";
  }

  // Admin link only shows in the navbar/sidebar once we know this account's role is admin
  const showAdmin = isAdmin() ? "block" : "none";
  if (navAdminLink) navAdminLink.style.display = showAdmin;
  if (sidebarAdminLink) sidebarAdminLink.style.display = showAdmin;
}

function setupAuthForms(){
  // Tab switching
  document.querySelectorAll(".auth-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
      tab.classList.add("active");
      document.querySelector(`.auth-form[data-form="${tab.dataset.tab}"]`).classList.add("active");
    });
  });

  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const logoutBtn = document.getElementById("logoutBtn");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("loginMsg");
    msg.textContent = "Logging in…"; msg.className = "auth-msg";
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const { error } = await signIn(email, password);
    if (error){ msg.textContent = error; msg.className = "auth-msg error"; return; }
    msg.textContent = ""; 
    renderAuthUI();
    showToast("Welcome back!");
    navigateTo("home");
  });

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("signupMsg");
    msg.textContent = "Creating account…"; msg.className = "auth-msg";
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const { error } = await signUp(email, password);
    if (error){ msg.textContent = error; msg.className = "auth-msg error"; return; }
    msg.textContent = "Account created! Check your email to confirm, then log in.";
    msg.className = "auth-msg success";
  });

  logoutBtn.addEventListener("click", signOutUser);
}