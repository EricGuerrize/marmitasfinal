// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Credenciais via variáveis de ambiente
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Validação das credenciais
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and anon key must be provided via environment variables');
}

// Cria o cliente
export const supabase = createClient(supabaseUrl, supabaseKey);