import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wtevirwkshidxskqpvtu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0ZXZpcndrc2hpZHhza3FwdnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjI4NDIsImV4cCI6MjA5MjE5ODg0Mn0.hUMGqu0Z1XjZsFfW0VbkYHnr49cVwYMfA1gME-T06mk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
