import { createClient } from '@supabase/supabase-js';

// 這是正確讀取 Vite 環境變數的方式
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);