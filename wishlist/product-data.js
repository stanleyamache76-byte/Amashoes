/* ============================================
   AMASHOES — sample product data
   Used only as a fallback so the site is fully
   browsable before Supabase is connected. Once
   js/config.js has real credentials, products.js
   fetches live rows from the `products` table
   instead of this array.
============================================ */
const FALLBACK_PRODUCTS = [
  { id:"k1", name:"Bounce Trainer Jr", category:"kids", price:2200, old_price:2800, color:"red",    sizes:[28,29,30,31], image_url:"https://images.unsplash.com/photo-1596460107916-430662021049?q=80&w=800&auto=format&fit=crop", tag:"New" },
  { id:"k2", name:"Playground Runner", category:"kids", price:1950, old_price:null, color:"orange", sizes:[27,28,29,30], image_url:"https://images.unsplash.com/photo-1622760807800-1a2a3d0b3f52?q=80&w=800&auto=format&fit=crop", tag:null },
  { id:"k3", name:"Velcro Skate Kid",  category:"kids", price:2100, old_price:null, color:"blue",   sizes:[29,30,31,32], image_url:"https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=800&auto=format&fit=crop", tag:null },
  { id:"k4", name:"Rainy Day Boot",    category:"kids", price:1800, old_price:2200, color:"beige",  sizes:[28,29,30], image_url:"https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop", tag:"Sale" },
  { id:"k5", name:"Lightweight Sneak", category:"kids", price:2050, old_price:null, color:"white",  sizes:[30,31,32], image_url:"https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=800&auto=format&fit=crop", tag:null },

  { id:"w1", name:"Urban Strider",     category:"women", price:3800, old_price:4600, color:"white",  sizes:[36,37,38,39], image_url:"https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800&auto=format&fit=crop", tag:"Sale" },
  { id:"w2", name:"Sunset Slip-on",    category:"women", price:3200, old_price:null, color:"orange", sizes:[36,37,38], image_url:"https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop", tag:"New" },
  { id:"w3", name:"Crimson Heel",      category:"women", price:4500, old_price:null, color:"red",    sizes:[37,38,39,40], image_url:"https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop", tag:null },
  { id:"w4", name:"Everyday Flat",     category:"women", price:2800, old_price:null, color:"beige",  sizes:[36,37,38,39], image_url:"https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=800&auto=format&fit=crop", tag:null },
  { id:"w5", name:"City Trail Boot",   category:"women", price:5200, old_price:6000, color:"black",  sizes:[38,39,40], image_url:"https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800&auto=format&fit=crop", tag:"Sale" },

  { id:"m1", name:"Trail Runner Pro",  category:"men", price:5400, old_price:null, color:"orange",  sizes:[40,41,42,43,44], image_url:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop", tag:"New" },
  { id:"m2", name:"Classic Oxford",    category:"men", price:4800, old_price:5600, color:"black",   sizes:[40,41,42,43], image_url:"https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800&auto=format&fit=crop", tag:"Sale" },
  { id:"m3", name:"Street Court",      category:"men", price:3900, old_price:null, color:"red",     sizes:[41,42,43,44], image_url:"https://images.unsplash.com/photo-1600269452121-4f2416e55c28?q=80&w=800&auto=format&fit=crop", tag:null },
  { id:"m4", name:"Canvas Low",        category:"men", price:2600, old_price:null, color:"white",   sizes:[40,41,42], image_url:"https://images.unsplash.com/photo-1595341888016-a392ef81b7de?q=80&w=800&auto=format&fit=crop", tag:null },
  { id:"m5", name:"All-Terrain Boot",  category:"men", price:6200, old_price:null, color:"beige",   sizes:[41,42,43,44], image_url:"https://images.unsplash.com/photo-1520639888713-7851133b1ed0?q=80&w=800&auto=format&fit=crop", tag:"New" }
];

function formatKES(amount){
  return "KES " + Number(amount).toLocaleString("en-KE");
}

function showToast(msg){
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=> toast.classList.remove("show"), 2600);
}