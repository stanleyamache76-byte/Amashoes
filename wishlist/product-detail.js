/* ============================================
   AMASHOES — Product detail page
   Opened whenever a product card's image/name is
   clicked, or "Add to cart" is clicked on a product
   that has sizes (so a size can't be skipped).
============================================ */
let CURRENT_PRODUCT_ID = null;
let SELECTED_SIZE = null;

function openProductDetail(productId){
  const product = ALL_PRODUCTS.find(p => String(p.id) === String(productId));
  if (!product) return;
  CURRENT_PRODUCT_ID = product.id;
  SELECTED_SIZE = null;

  document.getElementById("pdImage").src = product.image_url;
  document.getElementById("pdImage").alt = product.name;
  document.getElementById("pdCategory").textContent = product.category;
  document.getElementById("pdName").textContent = product.name;
  document.getElementById("pdPrice").textContent = formatKES(product.price);
  document.getElementById("pdOldPrice").textContent = product.old_price ? formatKES(product.old_price) : "";
  document.getElementById("pdOldPrice").style.display = product.old_price ? "inline" : "none";
  document.getElementById("pdDescription").textContent =
    `A ${product.color || ""} ${product.category} shoe from AMASHOES — comfort-checked and ready for everyday wear.`;

  const wishBtn = document.getElementById("pdWishlistBtn");
  wishBtn.dataset.wishlistToggle = product.id;
  wishBtn.classList.toggle("active", isWishlisted(product.id));

  const sizes = Array.isArray(product.sizes) ? product.sizes : String(product.sizes || "").split(",").filter(Boolean);
  const sizeWrap = document.getElementById("pdSizes");
  if (sizes.length){
    sizeWrap.innerHTML = sizes.map(s => `<button type="button" class="chip" data-size="${s}">${s}</button>`).join("");
    sizeWrap.style.display = "flex";
  } else {
    sizeWrap.innerHTML = "";
    sizeWrap.style.display = "none";
    SELECTED_SIZE = null; // no size needed for this item
  }
  document.getElementById("pdSizeNote").style.display = sizes.length ? "block" : "none";

  navigateTo("product");
  refreshProductReviewsUI(product.id);
}

function setupProductDetailControls(){
  // Open detail page: clicking a card's image or name (delegated, since cards are re-rendered constantly)
  document.body.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open-product]");
    if (opener){ openProductDetail(opener.dataset.openProduct); return; }

    // Size chip selection inside the detail page
    const sizeBtn = e.target.closest("#pdSizes .chip");
    if (sizeBtn){
      document.querySelectorAll("#pdSizes .chip").forEach(c => c.classList.remove("active"));
      sizeBtn.classList.add("active");
      SELECTED_SIZE = sizeBtn.dataset.size;
      return;
    }
  });

  document.getElementById("pdAddToCartBtn").addEventListener("click", () => {
    const product = ALL_PRODUCTS.find(p => String(p.id) === String(CURRENT_PRODUCT_ID));
    if (!product) return;
    const needsSize = document.getElementById("pdSizes").style.display !== "none";
    if (needsSize && !SELECTED_SIZE){
      showToast("Pick a size first");
      return;
    }
    addToCart(product, SELECTED_SIZE);
  });
}