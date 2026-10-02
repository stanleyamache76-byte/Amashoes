/* ============================================
   AMASHOES — Products: fetch, render, filter,
   sort, search
============================================ */
let ALL_PRODUCTS = [];
let activeFilters = { category: "all", sizes: [], colors: [], maxPrice: 15000 };
let activeSort = "featured";
let activeSearch = "";

async function loadProducts(){
  renderSkeletons();
  if (SUPABASE_READY){
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data && data.length){
      ALL_PRODUCTS = data;
      await Promise.all([loadAllRatings(), loadWishlistIds()]);
      renderAllProductSections();
      return;
    }
    if (error) console.warn("[AMASHOES] Falling back to sample products:", error.message);
  }
  ALL_PRODUCTS = FALLBACK_PRODUCTS;
  await Promise.all([loadAllRatings(), loadWishlistIds()]);
  renderAllProductSections();
}

function skeletonCards(count){
  return Array.from({ length: count }).map(() => `
    <div class="product-card skeleton-card">
      <div class="product-media skeleton-shimmer"></div>
      <div class="product-body">
        <div class="skeleton-line skeleton-shimmer" style="width:40%;"></div>
        <div class="skeleton-line skeleton-shimmer" style="width:75%; height:16px;"></div>
        <div class="skeleton-line skeleton-shimmer" style="width:50%;"></div>
        <div class="skeleton-line skeleton-shimmer" style="width:100%; height:38px; margin-top:8px;"></div>
      </div>
    </div>`).join("");
}

function renderSkeletons(){
  ["homeProductGrid","kidsGrid","womenGrid","menGrid"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = skeletonCards(id === "homeProductGrid" ? 8 : 4);
  });
  ["scrollKids","scrollWomen","scrollMen"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = skeletonCards(4);
  });
}

function renderAllProductSections(){
  renderScroller("scrollKids", ALL_PRODUCTS.filter(p => p.category === "kids"));
  renderScroller("scrollWomen", ALL_PRODUCTS.filter(p => p.category === "women"));
  renderScroller("scrollMen", ALL_PRODUCTS.filter(p => p.category === "men"));

  renderGrid("kidsGrid", ALL_PRODUCTS.filter(p => p.category === "kids"));
  renderGrid("womenGrid", ALL_PRODUCTS.filter(p => p.category === "women"));
  renderGrid("menGrid", ALL_PRODUCTS.filter(p => p.category === "men"));

  applyHomeFilters();
  if (typeof refreshAdminUI === "function") refreshAdminUI();
  if (typeof refreshWishlistCount === "function") refreshWishlistCount();
  if (document.querySelector('.page[data-page="wishlist"]').classList.contains("active")) renderWishlistPage();
}

function productCard(p){
  const oldPrice = p.old_price ? `<span class="product-old-price">${formatKES(p.old_price)}</span>` : "";
  const tag = p.tag ? `<span class="product-tag">${p.tag}</span>` : "";
  const sizes = Array.isArray(p.sizes) ? p.sizes : String(p.sizes || "").split(",").filter(Boolean);
  const wished = typeof isWishlisted === "function" && isWishlisted(p.id);
  const ratingHTML = typeof ratingBadgeHTML === "function" ? ratingBadgeHTML(p.id) : "";

  // Products with sizes route "Add to cart" through the detail page (size must be chosen there);
  // products with no sizes add straight from the card.
  const addBtn = sizes.length
    ? `<button class="add-cart-btn" data-open-product="${p.id}">Select size</button>`
    : `<button class="add-cart-btn" data-add-to-cart="${p.id}">Add to cart</button>`;

  return `
    <article class="product-card">
      <div class="product-media" data-open-product="${p.id}">
        ${tag}
        <button class="wishlist-heart${wished ? " active" : ""}" data-wishlist-toggle="${p.id}" aria-label="Save to wishlist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${wished ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7.5-4.6-10-9.1C.5 8.4 2.4 5 6 5c2 0 3.5 1 6 3.2C14.5 6 16 5 18 5c3.6 0 5.5 3.4 4 6.9C19.5 16.4 12 21 12 21z"/></svg>
        </button>
        <img src="${p.image_url}" alt="${p.name}" loading="lazy">
      </div>
      <div class="product-body">
        <span class="product-cat">${p.category}</span>
        <h3 class="product-name" data-open-product="${p.id}" style="cursor:pointer;">${p.name}</h3>
        ${ratingHTML}
        <div class="product-price">${formatKES(p.price)} ${oldPrice}</div>
        ${addBtn}
      </div>
    </article>`;
}

function renderGrid(elId, items){
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = items.length ? items.map(productCard).join("") : `<p style="color:var(--umber-45);">No products found.</p>`;
}

function renderScroller(elId, items){
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = items.map(productCard).join("");
}

/* ---------- Home shop grid: filter + sort + search ---------- */
function applyHomeFilters(){
  let items = [...ALL_PRODUCTS];

  if (activeFilters.category !== "all"){
    items = items.filter(p => p.category === activeFilters.category);
  }
  if (activeFilters.colors.length){
    items = items.filter(p => activeFilters.colors.includes((p.color||"").toLowerCase()));
  }
  if (activeFilters.sizes.length){
    items = items.filter(p => {
      const sizes = Array.isArray(p.sizes) ? p.sizes.map(String) : String(p.sizes||"").split(",");
      return activeFilters.sizes.some(s => sizes.includes(String(s)));
    });
  }
  items = items.filter(p => Number(p.price) <= Number(activeFilters.maxPrice));

  if (activeSearch.trim()){
    const q = activeSearch.trim().toLowerCase();
    items = items.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.color||"").toLowerCase().includes(q)
    );
  }

  switch (activeSort){
    case "price-asc": items.sort((a,b)=> a.price - b.price); break;
    case "price-desc": items.sort((a,b)=> b.price - a.price); break;
    case "name-asc": items.sort((a,b)=> a.name.localeCompare(b.name)); break;
    case "newest": items.sort((a,b)=> new Date(b.created_at||0) - new Date(a.created_at||0)); break;
    default: break; // featured = original order
  }

  renderGrid("homeProductGrid", items);
}

function setupShopControls(){
  document.getElementById("sortSelect").addEventListener("change", (e) => {
    activeSort = e.target.value;
    applyHomeFilters();
  });

  document.getElementById("searchInput").addEventListener("input", (e) => {
    activeSearch = e.target.value;
    applyHomeFilters();
  });

  // Filter sidebar open/close
  const filterPanel = document.getElementById("filterPanel");
  const filterOverlay = document.getElementById("filterOverlay");
  const openFilter = () => { filterPanel.classList.add("open"); filterOverlay.classList.add("open"); filterPanel.setAttribute("aria-hidden","false"); };
  const closeFilter = () => { filterPanel.classList.remove("open"); filterOverlay.classList.remove("open"); filterPanel.setAttribute("aria-hidden","true"); };
  document.getElementById("filterOpenBtn").addEventListener("click", openFilter);
  document.getElementById("filterCloseBtn").addEventListener("click", closeFilter);
  filterOverlay.addEventListener("click", closeFilter);

  // Category chips
  document.getElementById("filterCategory").addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    document.querySelectorAll("#filterCategory .chip").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    activeFilters.category = btn.dataset.value;
  });

  // Size chips (multi)
  document.getElementById("filterSize").addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    btn.classList.toggle("active");
    const val = btn.dataset.value;
    activeFilters.sizes = btn.classList.contains("active")
      ? [...activeFilters.sizes, val]
      : activeFilters.sizes.filter(s => s !== val);
  });

  // Color swatches (multi)
  document.getElementById("filterColor").addEventListener("click", (e) => {
    const btn = e.target.closest(".swatch");
    if (!btn) return;
    btn.classList.toggle("active");
    const val = btn.dataset.value;
    activeFilters.colors = btn.classList.contains("active")
      ? [...activeFilters.colors, val]
      : activeFilters.colors.filter(c => c !== val);
  });

  // Price range
  const priceInput = document.getElementById("filterPrice");
  const priceVal = document.getElementById("filterPriceVal");
  priceInput.addEventListener("input", () => {
    priceVal.textContent = formatKES(priceInput.value);
    activeFilters.maxPrice = Number(priceInput.value);
  });

  document.getElementById("filterApplyBtn").addEventListener("click", () => {
    applyHomeFilters();
    closeFilter();
  });

  document.getElementById("filterResetBtn").addEventListener("click", () => {
    activeFilters = { category: "all", sizes: [], colors: [], maxPrice: 15000 };
    document.querySelectorAll("#filterCategory .chip").forEach((c,i)=> c.classList.toggle("active", i===0));
    document.querySelectorAll("#filterSize .chip, #filterColor .swatch").forEach(c => c.classList.remove("active"));
    priceInput.value = 15000;
    priceVal.textContent = formatKES(15000);
    applyHomeFilters();
  });

  // Delegated "Add to cart" clicks across the whole document
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add-to-cart]");
    if (!btn) return;
    const id = btn.dataset.addToCart;
    const product = ALL_PRODUCTS.find(p => String(p.id) === String(id));
    if (product) addToCart(product);
  });
}