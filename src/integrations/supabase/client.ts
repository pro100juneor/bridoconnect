import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://nqkwtebrgcnamevvngvh.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa3d0ZWJyZ2NuYW1ldnZuZ3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NDk5ODcsImV4cCI6MjA5MTAyNTk4N30.42tquri-4i8qhfOnsJj9jfzmXQSBK9KI96_IojDmC-Q";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
