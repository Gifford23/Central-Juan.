import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kyudhyavnaudqwvrktlg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dWRoeWF2bmF1ZHF3dnJrdGxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NjIwOTMsImV4cCI6MjA1ODAzODA5M30.ea1Uk1nJy_dxdLRFTfpkEGnzOfri3beW4IQHi0bRSFc"; // Replace with your actual Supabase anon key
                            
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };
