import { createClient } from '@supabase/supabase-js'

// These look for the variables in your .env.local file automatically
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// This check helps you catch errors if the .env file is missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables are missing! Check your .env.local file.")
}

export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
)