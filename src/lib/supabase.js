import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yzzyrbpjefiprdnzfvrj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6enlyYnBqZWZpcHJkbnpmdnJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MzE1MzAsImV4cCI6MjA2NTQwNzUzMH0.ZM2k5doGyULAKVCeYUKwjKhTxjtF7lacVMNr0O967r0'

export const supabase = createClient(supabaseUrl, supabaseKey)