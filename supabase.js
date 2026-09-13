const SUPABASE_URL = "https://uozokpguesqeiprxnijm.supabase.co";

const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvem9rcGd1ZXNxZWlwcnhuaWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNjE0ODcsImV4cCI6MjEwNDgzNzQ4N30.xtb9KREeqG0U-WhSA_CQ5BX9f_3BffVuO7XTj18V-oM";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
