/* ============================================
   AMASHOES — App bootstrap: routing, nav, hero
   slider, scroll reveal, misc form handlers
============================================ */

/* ---------- Page switching (no reloads) ---------- */
const PAGE_ALIASES = { "women-all": "women" };
const PAGE_TITLES = {
  home: "AMASHOES — Step Into It",
  kids: "Kids Shoes — AMASHOES",
  women: "Women's Shoes — AMASHOES",
  men: "Men's Shoes — AMASHOES",
  about: "About Us — AMASHOES",
  login: "Log In / Sign Up — AMASHOES",
  cart: "Your Cart — AMASHOES",
  contact: "Contact Us — AMASHOES",
  admin: "Admin — AMASHOES",
  wishlist: "Your Wishlist — AMASHOES",
  product: "AMASHOES",
  privacy: "Privacy Policy — AMASHOES",
  terms: "Terms of Service — AMASHOES",
  returns: "Returns Policy — AMASHOES"
};

function navigateTo(pageName){
  pageName = PAGE_ALIASES[pageName] || pageName;
  const target = document.querySelector(`.page[data-page="${pageName}"]`);
  if (!target) return;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  target.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });

  document.querySelectorAll(".nav-links a[data-nav]").forEach(a => {
    a.classList.toggle("active", a.dataset.nav === pageName);
  });

  document.title = PAGE_TITLES[pageName] || "AMASHOES";

  closeSidebar();
  closeFilterPanel();

  if (pageName === "cart"){
    if (typeof resetCheckoutUIState === "function") resetCheckoutUIState();
    refreshCartUI();
  }
  if (pageName === "admin") refreshAdminUI();
  if (pageName === "wishlist" && typeof renderWishlistPage === "function") renderWishlistPage();
}

function setupRouting(){
  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("[data-nav]");
    if (!link) return;
    e.preventDefault();
    navigateTo(link.dataset.nav);
  });
}

/* ---------- Mobile sidebar ---------- */
function openSidebar(){
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("sidebarOverlay").classList.add("open");
  document.getElementById("sidebar").setAttribute("aria-hidden","false");
  document.getElementById("hamburgerBtn").setAttribute("aria-expanded","true");
}
function closeSidebar(){
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("open");
  document.getElementById("sidebar").setAttribute("aria-hidden","true");
  document.getElementById("hamburgerBtn").setAttribute("aria-expanded","false");
}
function closeFilterPanel(){
  const panel = document.getElementById("filterPanel");
  const overlay = document.getElementById("filterOverlay");
  panel.classList.remove("open");
  overlay.classList.remove("open");
  panel.setAttribute("aria-hidden","true");
}

function setupSidebar(){
  document.getElementById("hamburgerBtn").addEventListener("click", openSidebar);
  document.getElementById("sidebarClose").addEventListener("click", closeSidebar);
  document.getElementById("sidebarOverlay").addEventListener("click", closeSidebar);
}

/* ---------- Hero slider ---------- */
function setupHeroSlider(){
  const slides = document.querySelectorAll("#hero .hero-slide");
  const dotsWrap = document.getElementById("heroDots");
  let index = 0;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    if (i === 0) dot.classList.add("active");
    dot.addEventListener("click", () => goToSlide(i));
    dotsWrap.appendChild(dot);
  });

  function goToSlide(i){
    slides[index].classList.remove("active");
    dotsWrap.children[index].classList.remove("active");
    index = i;
    slides[index].classList.add("active");
    dotsWrap.children[index].classList.add("active");
  }

  setInterval(() => goToSlide((index + 1) % slides.length), 4500);
}

/* ---------- Password show/hide toggles (login/signup only — visual only) ---------- */
function setupPasswordToggles(){
  document.querySelectorAll(".password-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.toggleFor);
      if (!input) return;
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      btn.classList.toggle("is-showing", !showing);
    });
  });
}

/* ---------- Misc forms ---------- */
function setupMiscForms(){
  document.getElementById("newsletterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    e.target.reset();
    showToast("Subscribed! Watch your inbox for 15% off.");
  });

  document.getElementById("contactForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("contactMsg");
    const payload = {
      name: document.getElementById("cName").value.trim(),
      email: document.getElementById("cEmail").value.trim(),
      phone: document.getElementById("cPhone").value.trim(),
      message: document.getElementById("cMessage").value.trim()
    };

    if (SUPABASE_READY){
      // `contact_messages` allows public INSERT only (see schema.sql RLS) —
      // no one, including other customers, can read these rows from the client.
      const { error } = await supabaseClient.from("contact_messages").insert(payload);
      if (error){ msg.textContent = error.message; msg.className = "auth-msg error"; return; }
    }
    msg.textContent = "Message sent — we'll get back to you soon.";
    msg.className = "auth-msg success";
    e.target.reset();
  });
}

/* ---------- Boot ----------
   Each step is isolated with try/catch. A slow or blocked network
   request (e.g. to Supabase, on a restrictive mobile connection)
   must never take the whole page down with it — the product grids,
   filters and search still need to render either way. */
async function safeStep(label, fn){
  try{ await fn(); }
  catch(err){ console.error(`[AMASHOES] "${label}" failed, continuing anyway:`, err); }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("year").textContent = new Date().getFullYear();

  await safeStep("loadLocalCart", loadLocalCart);
  await safeStep("setupRouting", setupRouting);
  await safeStep("setupSidebar", setupSidebar);
  await safeStep("setupHeroSlider", setupHeroSlider);
  await safeStep("setupShopControls", setupShopControls);
  await safeStep("setupCartControls", setupCartControls);
  await safeStep("setupAuthForms", setupAuthForms);
  await safeStep("setupAdminControls", setupAdminControls);
  await safeStep("setupPasswordToggles", setupPasswordToggles);
  await safeStep("setupWishlistControls", setupWishlistControls);
  await safeStep("setupReviewControls", setupReviewControls);
  await safeStep("setupProductDetailControls", setupProductDetailControls);
  await safeStep("setupMiscForms", setupMiscForms);

  await safeStep("initAuth", initAuth);
  await safeStep("mergeLocalCartIntoAccount", mergeLocalCartIntoAccount);
  await safeStep("loadProducts", loadProducts);   // renders the grids — must run even if auth failed above
  await safeStep("refreshCartUI", refreshCartUI);
});