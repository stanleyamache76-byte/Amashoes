/* ============================================
   AMASHOES — Supabase configuration
   ------------------------------------------
   1. Create a project at https://supabase.com
   2. Run supabase/schema.sql in the SQL editor
   3. Paste your Project URL + anon public key below
      (Project Settings → API). The anon key is safe
      to ship in client code — it only works within
      the RLS policies defined in schema.sql.
============================================ */
const SUPABASE_URL = "https://dvjukvlkyiunxajeuvsp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2anVrdmxreWl1bnhhamV1dnNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDE5NDEsImV4cCI6MjEwNTMxNzk0MX0.msBaZqaUfWR7eY_4nttkLvataWieWPpnVAPzdE0JS4s";

let supabaseClient = null;
let SUPABASE_READY = false;

try{
  if (window.supabase && SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR-PROJECT-REF")){
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    SUPABASE_READY = true;
  } else {
    console.warn("[AMASHOES] Supabase is not configured yet — edit js/config.js with your project URL and anon key. Running in offline/demo mode with sample products.");
  }
}catch(err){
  console.error("[AMASHOES] Supabase client failed to initialize:", err);
}