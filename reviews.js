/* ============================================
   AMASHOES — Reviews & ratings
============================================ */
let RATINGS_MAP = {}; // { product_id: { avg: number, count: number } }

async function loadAllRatings(){
  RATINGS_MAP = {};
  if (!SUPABASE_READY) return;
  const { data, error } = await supabaseClient.from("reviews").select("product_id, rating");
  if (error || !data) return;
  const sums = {};
  data.forEach(r => {
    const id = String(r.product_id);
    if (!sums[id]) sums[id] = { total: 0, count: 0 };
    sums[id].total += r.rating;
    sums[id].count += 1;
  });
  Object.keys(sums).forEach(id => {
    RATINGS_MAP[id] = { avg: sums[id].total / sums[id].count, count: sums[id].count };
  });
}

function ratingBadgeHTML(productId){
  const r = RATINGS_MAP[String(productId)];
  if (!r) return `<span class="rating-badge muted">No reviews yet</span>`;
  return `<span class="rating-badge">${starsHTML(r.avg)} <span>${r.avg.toFixed(1)} (${r.count})</span></span>`;
}

function starsHTML(avg){
  let out = "";
  for (let i = 1; i <= 5; i++){
    out += `<svg width="13" height="13" viewBox="0 0 24 24" fill="${i <= Math.round(avg) ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.5"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.4 20.1l1.4-6.3-4.8-4.3 6.4-.6L12 3z"/></svg>`;
  }
  return `<span class="stars">${out}</span>`;
}

async function loadProductReviews(productId){
  if (!SUPABASE_READY) return [];
  const { data, error } = await supabaseClient
    .from("reviews")
    .select("id, rating, comment, created_at, user_id")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  return error ? [] : data;
}

function renderReviewsList(reviews){
  const wrap = document.getElementById("productReviewsList");
  if (!wrap) return;
  if (!reviews.length){
    wrap.innerHTML = `<p style="color:var(--umber-45); font-size:.88rem;">No reviews yet — be the first to leave one.</p>`;
    return;
  }
  wrap.innerHTML = reviews.map(r => `
    <div class="review-row">
      <div class="review-row-top">
        ${starsHTML(r.rating)}
        <span class="review-date">${new Date(r.created_at).toLocaleDateString()}</span>
      </div>
      ${r.comment ? `<p>${escapeHTML(r.comment)}</p>` : ""}
      ${currentUser && r.user_id === currentUser.id ? `<button class="toolbar-btn btn-sm" data-delete-review="${r.id}">Delete my review</button>` : ""}
    </div>
  `).join("");
}

function escapeHTML(str){
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function refreshProductReviewsUI(productId){
  const reviews = await loadProductReviews(productId);
  renderReviewsList(reviews);

  const summary = document.getElementById("productRatingSummary");
  const existing = currentUser ? reviews.find(r => r.user_id === currentUser.id) : null;
  if (summary){
    if (reviews.length){
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      summary.innerHTML = `${starsHTML(avg)} <strong>${avg.toFixed(1)}</strong> <span style="color:var(--umber-45);">(${reviews.length} review${reviews.length === 1 ? "" : "s"})</span>`;
    } else {
      summary.innerHTML = `<span style="color:var(--umber-45);">No reviews yet</span>`;
    }
  }

  const formWrap = document.getElementById("reviewFormWrap");
  const loginPrompt = document.getElementById("reviewLoginPrompt");
  if (formWrap && loginPrompt){
    if (currentUser){
      formWrap.style.display = "block";
      loginPrompt.style.display = "none";
      if (existing){
        document.getElementById("reviewRatingInput").value = existing.rating;
        document.getElementById("reviewCommentInput").value = existing.comment || "";
        document.getElementById("reviewSubmitBtn").textContent = "Update my review";
        setStarPicker(existing.rating);
      } else {
        document.getElementById("reviewForm").reset();
        document.getElementById("reviewSubmitBtn").textContent = "Submit review";
        setStarPicker(0);
      }
    } else {
      formWrap.style.display = "none";
      loginPrompt.style.display = "block";
    }
  }
}

function setStarPicker(value){
  document.getElementById("reviewRatingInput").value = value;
  document.querySelectorAll("#starPicker [data-star]").forEach(btn => {
    btn.classList.toggle("active", Number(btn.dataset.star) <= value);
  });
}

function setupReviewControls(){
  document.querySelectorAll("#starPicker [data-star]").forEach(btn => {
    btn.addEventListener("click", () => setStarPicker(Number(btn.dataset.star)));
  });

  document.getElementById("reviewForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser || !CURRENT_PRODUCT_ID) return;
    const msg = document.getElementById("reviewMsg");
    const rating = Number(document.getElementById("reviewRatingInput").value);
    const comment = document.getElementById("reviewCommentInput").value.trim();
    if (!rating){ msg.textContent = "Pick a star rating first."; msg.className = "auth-msg error"; return; }

    const { error } = await supabaseClient.from("reviews").upsert({
      product_id: CURRENT_PRODUCT_ID,
      user_id: currentUser.id,
      rating,
      comment
    }, { onConflict: "product_id,user_id" });

    if (error){ msg.textContent = error.message; msg.className = "auth-msg error"; return; }
    msg.textContent = "Thanks for the review!";
    msg.className = "auth-msg success";
    await loadAllRatings();
    await refreshProductReviewsUI(CURRENT_PRODUCT_ID);
  });

  document.getElementById("productReviewsList").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-delete-review]");
    if (!btn) return;
    if (!confirm("Delete your review?")) return;
    await supabaseClient.from("reviews").delete().eq("id", btn.dataset.deleteReview);
    await loadAllRatings();
    await refreshProductReviewsUI(CURRENT_PRODUCT_ID);
  });
}