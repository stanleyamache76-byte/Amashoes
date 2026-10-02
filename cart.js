/* ============================================
   AMASHOES — Cart & Checkout
   Logged-in users: cart rows live in Supabase
   `cart_items`, protected by RLS so a user can only
   select/insert/delete rows where user_id = auth.uid().
   Guests: cart is kept in localStorage until checkout.
   At checkout, a guest is signed in ANONYMOUSLY via
   Supabase Auth (no password/email needed) so their
   order still gets a real auth.uid() and the exact
   same RLS protection as a full account — this requires
   "Allow anonymous sign-ins" to be turned on in your
   Supabase dashboard under Authentication → Providers.
============================================ */
let localCart = []; // [{product_id, size, name, price, image_url, qty}]
let guestSessionActive = false; // true only while we're mid-guest-checkout, so we know it's safe to sign back out afterward
let currentUserIsGuestCheckout = false; // tracks which form to fall back to if a payment fails

function loadLocalCart(){
  try{
    localCart = JSON.parse(localStorage.getItem("amashoes_guest_cart") || "[]");
  }catch{ localCart = []; }
}
function saveLocalCart(){
  localStorage.setItem("amashoes_guest_cart", JSON.stringify(localCart));
}

function cartRowKey(productId, size){
  return `${productId}::${size || "nosize"}`;
}

async function addToCart(product, size){
  // Adding something new means any previous order confirmation is stale — clear it.
  const confirmation = document.getElementById("cartConfirmation");
  if (confirmation) confirmation.style.display = "none";
  const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) checkoutBtn.style.display = "block";

  size = size || null;
  if (currentUser && SUPABASE_READY){
    const { data: existing } = await supabaseClient
      .from("cart_items")
      .select("*")
      .eq("user_id", currentUser.id)
      .eq("product_id", product.id)
      .eq("size", size)
      .maybeSingle();

    if (existing){
      await supabaseClient.from("cart_items")
        .update({ quantity: existing.quantity + 1 })
        .eq("id", existing.id)
        .eq("user_id", currentUser.id); // belt-and-braces; RLS also enforces this
    } else {
      await supabaseClient.from("cart_items").insert({
        user_id: currentUser.id,
        product_id: product.id,
        size,
        quantity: 1
      });
    }
  } else {
    const existing = localCart.find(i => String(i.product_id) === String(product.id) && (i.size || null) === size);
    if (existing) existing.qty += 1;
    else localCart.push({ product_id: product.id, size, name: product.name, price: product.price, image_url: product.image_url, qty: 1 });
    saveLocalCart();
  }
  showToast(`${product.name}${size ? ` (size ${size})` : ""} added to cart`);
  await refreshCartUI();
}

async function getCartRows(){
  if (currentUser && SUPABASE_READY){
    const { data, error } = await supabaseClient
      .from("cart_items")
      .select("id, product_id, size, quantity, products(id, name, price, image_url)")
      .eq("user_id", currentUser.id); // RLS also restricts this server-side
    if (error){ console.warn("[AMASHOES] cart fetch error:", error.message); return []; }
    return (data || []).map(row => ({
      row_id: row.id,
      product_id: row.product_id,
      size: row.size,
      name: row.products ? row.products.name : "Product",
      price: row.products ? row.products.price : 0,
      image_url: row.products ? row.products.image_url : "",
      qty: row.quantity
    }));
  }
  return localCart.map(i => ({ ...i, row_id: cartRowKey(i.product_id, i.size) }));
}

async function removeFromCart(rowId){
  if (currentUser && SUPABASE_READY){
    await supabaseClient.from("cart_items").delete().eq("id", rowId).eq("user_id", currentUser.id);
  } else {
    localCart = localCart.filter(i => cartRowKey(i.product_id, i.size) !== rowId);
    saveLocalCart();
  }
  await refreshCartUI();
}

async function updateQty(rowId, qty){
  qty = Math.max(1, qty);
  if (currentUser && SUPABASE_READY){
    await supabaseClient.from("cart_items").update({ quantity: qty }).eq("id", rowId).eq("user_id", currentUser.id);
  } else {
    const item = localCart.find(i => cartRowKey(i.product_id, i.size) === rowId);
    if (item) item.qty = qty;
    saveLocalCart();
  }
  await refreshCartUI();
}

async function mergeLocalCartIntoAccount(){
  if (!(currentUser && SUPABASE_READY) || !localCart.length) return;
  for (const item of localCart){
    const { data: existing } = await supabaseClient
      .from("cart_items").select("*")
      .eq("user_id", currentUser.id).eq("product_id", item.product_id).eq("size", item.size || null).maybeSingle();
    if (existing){
      await supabaseClient.from("cart_items").update({ quantity: existing.quantity + item.qty }).eq("id", existing.id);
    } else {
      await supabaseClient.from("cart_items").insert({ user_id: currentUser.id, product_id: item.product_id, size: item.size || null, quantity: item.qty });
    }
  }
  localCart = [];
  saveLocalCart();
}

async function refreshCartUI(){
  const rows = await getCartRows();
  const countEl = document.getElementById("cartCount");
  const bottomCountEl = document.getElementById("bottomCartCount");
  const totalQty = rows.reduce((sum,i)=> sum + i.qty, 0);
  if (countEl) countEl.textContent = totalQty;
  if (bottomCountEl) bottomCountEl.textContent = totalQty;

  const body = document.getElementById("cartBody");
  const totalEl = document.getElementById("cartTotal");
  if (!body || !totalEl) return;

  if (!rows.length){
    body.innerHTML = `<p class="cart-empty">Your cart is empty. <a href="#" data-nav="women-all" style="color:var(--red); font-weight:600;">Start shopping →</a></p>`;
    totalEl.textContent = formatKES(0);
    return;
  }

  let total = 0;
  body.innerHTML = rows.map(item => {
    total += item.price * item.qty;
    return `
      <div class="cart-row">
        <img src="${item.image_url}" alt="${item.name}">
        <div class="info">
          <div class="name">${item.name}</div>
          <div class="meta">${formatKES(item.price)} each${item.size ? ` · Size ${item.size}` : ""}</div>
          <div class="qty">
            <button data-qty-minus="${item.row_id}" aria-label="Decrease quantity">–</button>
            <span>${item.qty}</span>
            <button data-qty-plus="${item.row_id}" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="price">${formatKES(item.price * item.qty)}</div>
        <button class="cart-remove" data-remove="${item.row_id}" aria-label="Remove ${item.name}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13h8l1-13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>`;
  }).join("");
  totalEl.textContent = formatKES(total);
}

/* ---------- Checkout (M-Pesa) ---------- */
function resetCheckoutUIState(){
  const confirmation = document.getElementById("cartConfirmation");
  if (confirmation && confirmation.style.display === "block") return; // don't clobber a just-placed order's confirmation
  document.getElementById("guestCheckoutFields").style.display = "none";
  document.getElementById("loggedInPhoneFields").style.display = "none";
  document.getElementById("paymentWaiting").style.display = "none";
  document.getElementById("checkoutBtn").style.display = "block";
  document.getElementById("checkoutMsg").textContent = "";
}

function showCheckoutStep(step){
  // step: "button" | "guest" | "phone" | "waiting" | "confirmed"
  document.getElementById("checkoutBtn").style.display = step === "button" ? "block" : "none";
  document.getElementById("guestCheckoutFields").style.display = step === "guest" ? "block" : "none";
  document.getElementById("loggedInPhoneFields").style.display = step === "phone" ? "block" : "none";
  document.getElementById("paymentWaiting").style.display = step === "waiting" ? "block" : "none";
  document.getElementById("cartConfirmation").style.display = step === "confirmed" ? "block" : "none";
}

/* Creates the order + order_items rows. Does NOT touch the cart or
   show a confirmation — that only happens once payment succeeds. */
async function createPendingOrder(contact){
  const msg = document.getElementById("checkoutMsg");
  const rows = await getCartRows();
  if (!rows.length){ showToast("Your cart is empty"); return null; }

  const total = rows.reduce((sum, r) => sum + r.price * r.qty, 0);

  const { data: order, error: orderError } = await supabaseClient
    .from("orders")
    .insert({
      user_id: currentUser.id,
      total,
      status: "pending",
      guest_name: contact?.name || null,
      guest_email: contact?.email || null,
      guest_phone: contact?.phone || null
    })
    .select()
    .single();

  if (orderError){
    msg.textContent = orderError.message;
    msg.className = "auth-msg error";
    return null;
  }

  const orderItems = rows.map(r => ({
    order_id: order.id,
    product_id: r.product_id,
    size: r.size || null,
    quantity: r.qty,
    price: r.price
  }));
  const { error: itemsError } = await supabaseClient.from("order_items").insert(orderItems);
  if (itemsError){
    msg.textContent = `Order saved, but items failed: ${itemsError.message}`;
    msg.className = "auth-msg error";
    return null;
  }

  return order;
}

/* Calls the mpesa-stk-push Edge Function, then polls the order's
   status until it's paid, failed, cancelled, or we give up waiting. */
async function startMpesaCheckout(contact){
  const msg = document.getElementById("checkoutMsg");
  msg.textContent = "";

  const order = await createPendingOrder(contact);
  if (!order) return; // createPendingOrder already showed the error

  showCheckoutStep("waiting");

  const { data: fnData, error: fnError } = await supabaseClient.functions.invoke("mpesa-stk-push", {
    body: { order_id: order.id, phone: contact.phone }
  });

  if (fnError || !fnData || fnData.error){
    showCheckoutStep(currentUserIsGuestCheckout ? "guest" : "phone");
    msg.textContent = (fnData && fnData.error) || fnError?.message || "Couldn't start the M-Pesa payment. Please try again.";
    msg.className = "auth-msg error";
    return;
  }

  await pollOrderPaymentStatus(order.id);
}

async function pollOrderPaymentStatus(orderId){
  const msg = document.getElementById("checkoutMsg");
  const maxTries = 20; // ~60-90s total, matching how long an STK prompt stays live on the phone

  for (let attempt = 0; attempt < maxTries; attempt++){
    await new Promise(resolve => setTimeout(resolve, 4000));

    const { data: order } = await supabaseClient
      .from("orders").select("id, status, total").eq("id", orderId).single();

    if (!order) continue;

    if (order.status === "paid"){
      await supabaseClient.from("cart_items").delete().eq("user_id", currentUser.id);

      if (guestSessionActive){
        await supabaseClient.auth.signOut();
        currentUser = null;
        currentProfile = null;
        guestSessionActive = false;
        renderAuthUI();
      }

      showCheckoutStep("confirmed");
      document.getElementById("cartConfirmationDetail").textContent =
        `Order #${order.id.slice(0, 8).toUpperCase()} — ${formatKES(order.total)} paid via M-Pesa. We'll be in touch to confirm delivery.`;
      await refreshCartUI();
      return;
    }

    if (order.status === "payment_failed"){
      showCheckoutStep(currentUserIsGuestCheckout ? "guest" : "phone");
      msg.textContent = "Payment didn't go through — you can try again.";
      msg.className = "auth-msg error";
      return;
    }
    // still "pending" — keep polling
  }

  // Timed out waiting
  showCheckoutStep(currentUserIsGuestCheckout ? "guest" : "phone");
  msg.textContent = "We didn't get confirmation in time. If money left your account, contact us on WhatsApp — otherwise, feel free to try again.";
  msg.className = "auth-msg error";
}

function setupCartControls(){
  document.getElementById("cartBody").addEventListener("click", async (e) => {
    const rm = e.target.closest("[data-remove]");
    const minus = e.target.closest("[data-qty-minus]");
    const plus = e.target.closest("[data-qty-plus]");
    if (rm) return removeFromCart(rm.dataset.remove);
    if (minus || plus){
      const rowId = (minus || plus).dataset.qtyMinus || (minus || plus).dataset.qtyPlus;
      const rows = await getCartRows();
      const row = rows.find(r => String(r.row_id) === String(rowId));
      if (!row) return;
      return updateQty(rowId, row.qty + (plus ? 1 : -1));
    }
  });

  document.getElementById("checkoutBtn").addEventListener("click", async () => {
    const rows = await getCartRows();
    if (!rows.length){ showToast("Your cart is empty"); return; }

    if (!SUPABASE_READY){
      showToast("Connect Supabase in js/config.js to place real orders");
      return;
    }

    if (currentUser){
      currentUserIsGuestCheckout = false;
      showCheckoutStep("phone");
    } else {
      currentUserIsGuestCheckout = true;
      showCheckoutStep("guest");
    }
  });

  document.getElementById("payNowBtn").addEventListener("click", async () => {
    const msg = document.getElementById("checkoutMsg");
    const phone = document.getElementById("payPhone").value.trim();
    if (!phone){
      msg.textContent = "Please enter your M-Pesa phone number.";
      msg.className = "auth-msg error";
      return;
    }
    await startMpesaCheckout({ name: null, email: currentUser.email || null, phone });
  });

  document.getElementById("guestContinueBtn").addEventListener("click", async () => {
    const msg = document.getElementById("checkoutMsg");
    const name = document.getElementById("guestName").value.trim();
    const email = document.getElementById("guestEmail").value.trim();
    const phone = document.getElementById("guestPhone").value.trim();
    if (!name || !email || !phone){
      msg.textContent = "Please fill in your name, email and phone.";
      msg.className = "auth-msg error";
      return;
    }

    msg.textContent = "Setting things up…";
    msg.className = "auth-msg";

    const { data, error } = await supabaseClient.auth.signInAnonymously();
    if (error){
      msg.textContent = `Couldn't start guest checkout: ${error.message}. (Make sure "Allow anonymous sign-ins" is enabled in your Supabase Auth settings.)`;
      msg.className = "auth-msg error";
      return;
    }
    guestSessionActive = true;
    currentUser = data.user;

    await mergeLocalCartIntoAccount();
    await startMpesaCheckout({ name, email, phone });
  });
}
