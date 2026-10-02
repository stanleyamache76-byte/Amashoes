/* ============================================
   AMASHOES — Admin product manager
   The show/hide here is a UX convenience only.
   Real protection is the RLS policy on `products`
   in supabase/schema.sql, which only allows
   insert/update/delete when the caller's profile
   role = 'admin'. A non-admin hitting these functions
   directly still gets rejected by the database.
============================================ */
async function refreshAdminUI(){
  const locked = document.getElementById("adminLocked");
  const unlocked = document.getElementById("adminUnlocked");
  if (!locked || !unlocked) return;

  if (currentUser && isAdmin()){
    locked.style.display = "none";
    unlocked.style.display = "grid";
    await loadAdminProductTable();
  } else {
    locked.style.display = "block";
    unlocked.style.display = "none";
  }
}

async function loadAdminProductTable(){
  const tbody = document.getElementById("adminTableBody");
  if (!tbody) return;
  const items = SUPABASE_READY ? ALL_PRODUCTS : FALLBACK_PRODUCTS;
  tbody.innerHTML = items.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>${formatKES(p.price)}</td>
      <td>${p.stock ?? "—"}</td>
      <td class="admin-actions">
        <button data-edit="${p.id}">Edit</button>
        <button data-delete="${p.id}">Delete</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="5">No products yet.</td></tr>`;
}

let currentEditImageUrl = ""; // holds the existing image URL while editing, if no new file is chosen

function fillAdminForm(p){
  document.getElementById("adminProductId").value = p.id;
  document.getElementById("apName").value = p.name;
  document.getElementById("apPrice").value = p.price;
  document.getElementById("apCategory").value = p.category;
  document.getElementById("apColor").value = p.color || "";
  document.getElementById("apSizes").value = Array.isArray(p.sizes) ? p.sizes.join(",") : (p.sizes || "");
  document.getElementById("apStock").value = p.stock ?? 10;

  currentEditImageUrl = p.image_url || "";
  const imageInput = document.getElementById("apImage");
  imageInput.value = ""; // file inputs can't be pre-filled; a blank choice here just keeps the current image
  const preview = document.getElementById("apImagePreview");
  if (currentEditImageUrl){
    preview.src = currentEditImageUrl;
    preview.style.display = "block";
  } else {
    preview.style.display = "none";
  }

  document.getElementById("adminFormTitle").textContent = "Edit product";
  document.getElementById("adminSubmitBtn").textContent = "Save changes";
  document.getElementById("adminCancelEdit").style.display = "inline-flex";
}

function resetAdminForm(){
  document.getElementById("adminForm").reset();
  document.getElementById("adminProductId").value = "";
  currentEditImageUrl = "";
  document.getElementById("apImagePreview").style.display = "none";
  document.getElementById("adminFormTitle").textContent = "Add a product";
  document.getElementById("adminSubmitBtn").textContent = "Add product";
  document.getElementById("adminCancelEdit").style.display = "none";
}

/* Uploads one file to the `product-images` bucket and returns its public URL.
   Only succeeds for admins — enforced by the storage policies in schema.sql,
   not by this code. */
async function uploadProductImage(file){
  const path = `products/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  const { error: uploadError } = await supabaseClient
    .storage.from("product-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (uploadError) throw uploadError;

  const { data } = supabaseClient.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

function setupAdminControls(){
  const form = document.getElementById("adminForm");
  const imageInput = document.getElementById("apImage");
  const preview = document.getElementById("apImagePreview");

  // Live preview of a newly chosen file, before it's uploaded
  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("adminMsg");
    if (!SUPABASE_READY){
      msg.textContent = "Connect Supabase in js/config.js to save real products.";
      msg.className = "auth-msg error";
      return;
    }

    const id = document.getElementById("adminProductId").value;
    const file = imageInput.files[0];

    if (!file && !id && !currentEditImageUrl){
      msg.textContent = "Please choose a product image.";
      msg.className = "auth-msg error";
      return;
    }

    msg.textContent = file ? "Uploading image…" : "Saving…";
    msg.className = "auth-msg";

    let imageUrl = currentEditImageUrl;
    if (file){
      try{
        imageUrl = await uploadProductImage(file);
      }catch(uploadError){
        // Most commonly this fires because the account isn't an admin — the storage RLS policy doing its job.
        msg.textContent = uploadError.message;
        msg.className = "auth-msg error";
        return;
      }
    }

    const payload = {
      name: document.getElementById("apName").value.trim(),
      price: Number(document.getElementById("apPrice").value),
      category: document.getElementById("apCategory").value,
      color: document.getElementById("apColor").value.trim(),
      sizes: document.getElementById("apSizes").value.split(",").map(s => s.trim()).filter(Boolean),
      image_url: imageUrl,
      stock: Number(document.getElementById("apStock").value)
    };

    let error;
    if (id){
      ({ error } = await supabaseClient.from("products").update(payload).eq("id", id));
    } else {
      ({ error } = await supabaseClient.from("products").insert(payload));
    }

    if (error){
      // Most commonly this fires because the account isn't an admin — RLS doing its job.
      msg.textContent = error.message;
      msg.className = "auth-msg error";
      return;
    }

    msg.textContent = id ? "Product updated." : "Product added.";
    msg.className = "auth-msg success";
    resetAdminForm();
    await loadProducts();
  });

  document.getElementById("adminCancelEdit").addEventListener("click", resetAdminForm);

  document.getElementById("adminTableBody").addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const delBtn = e.target.closest("[data-delete]");

    if (editBtn){
      const p = ALL_PRODUCTS.find(x => String(x.id) === String(editBtn.dataset.edit));
      if (p) fillAdminForm(p);
      return;
    }
    if (delBtn){
      if (!SUPABASE_READY){ showToast("Connect Supabase to delete real products"); return; }
      if (!confirm("Delete this product? This cannot be undone.")) return;
      const { error } = await supabaseClient.from("products").delete().eq("id", delBtn.dataset.delete);
      if (error){ showToast(error.message); return; }
      showToast("Product deleted");
      await loadProducts();
    }
  });
}