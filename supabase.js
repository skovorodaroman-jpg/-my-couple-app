const SUPABASE_URL = "https://uozokpguesqeiprxnijm.supabase.co";

const SUPABASE_KEY = "sb_publishable_xhT8kGREbdjnZTe2B4Fndw_N8E7yFK0";

console.log("1. supabase.js завантажився");
console.log("2. window.supabase =", window.supabase);

if (!window.supabase) {
    console.error("❌ Бібліотека Supabase НЕ завантажилася");
} else {
    window.supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    console.log("3. supabaseClient =", window.supabaseClient);
}
