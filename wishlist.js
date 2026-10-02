/* ============================================
   AMASHOES — Wishlist
   Requires an account (no guest wishlist) — rows
   live in `wishlist_items`, scoped by RLS to
   auth.uid() same as the cart.
============================================ */
let WISHLIST_IDS = new Set(); // product_id strings currently wishlisted by this user

async function loadWishlistIds(){
  WISHLIST_IDS = new Set();
  if (!(currentUser && SUPABASE_READY)) return;
  const { data, error } = await supabaseClient
    .from("wishlist_items").select("product_id").eq("user_id", currentUser.id);
  if (!error && data) data.forEach(row => WISHLIST_IDS.add(String(row.product_id)));
}

function isWishlisted(productId){
  return WISHLIST_IDS.has(String(productId));
}

async function toggleWishlist(product){
  if (!currentUser){
    showToast("Log in to save items to your wishlist");
    navigateTo("login");
    return;
  }
  const id = String(product.id);
  if (WISHLIST_IDS.has(id)){
    await supabaseClient.from("wishlist_items").delete()
      .eq("user_id", currentUser.id).eq("product_id", product.id);
    WISHLIST_IDS.delete(id);
    showToast("Removed from wishlist");
  } else {
    await supabaseClient.from("wishlist_items").insert({ user_id: currentUser.id, product_id: product.id });
    WISHLIST_IDS.add(id);
    showToast("Saved to wishlist");
  }
  refreshWishlistButtons();
  refreshWishlistCount();
  if (document.querySelector('.page[data-page="wishlist"]').classList.contains("active")) renderWishlistPage();
}

function refreshWishlistButtons(){
  document.querySelectorAll("[data-wishlist-toggle]").forEach(btn => {
    const id = btn.dataset.wishlistToggle;
    btn.classList.toggle("active", isWishlisted(id));
  });
}

function refreshWishlistCount(){
  const el = document.getElementById("wishlistCount");
  if (el) el.textContent = WISHLIST_IDS.size;
}

async function renderWishlistPage(){
  const grid = document.getElementById("wishlistGrid");
  const empty = document.getElementById("wishlistEmpty");
  if (!grid) return;

  if (!currentUser){
    grid.innerHTML = "";
    empty.style.display = "block";
    empty.querySelector("p").textContent = "Log in to see items you've saved.";
    return;
  }
  const items = ALL_PRODUCTS.filter(p => WISHLIST_IDS.has(String(p.id)));
  if (!items.length){
    grid.innerHTML = "";
    empty.style.display = "block";
    empty.querySelector("p").textContent = "Nothing saved yet — tap the heart on any product to add it here.";
    return;
  }
  empty.style.display = "none";
  grid.innerHTML = items.map(productCard).join("");
}

function setupWishlistControls(){
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-wishlist-toggle]");
    if (!btn) return;
    e.stopPropagation();
    const id = btn.dataset.wishlistToggle;
    const product = ALL_PRODUCTS.find(p => String(p.id) === String(id));
    if (product) toggleWishlist(product);
  });
}