// supabaseClient.js


import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kyudhyavnaudqwvrktlg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dWRoeWF2bmF1ZHF3dnJrdGxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NjIwOTMsImV4cCI6MjA1ODAzODA5M30.ea1Uk1nJy_dxdLRFTfpkEGnzOfri3beW4IQHi0bRSFc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
