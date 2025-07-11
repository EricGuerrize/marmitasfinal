// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Função para inicializar o cliente como singleton
let supabaseInstance = null;

const createSupabaseClient = () => {
  if (!supabaseInstance) {
    // Credenciais via variáveis de ambiente
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

    // Validação das credenciais
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and anon key must be provided via environment variables');
    }

    // Cria o cliente apenas se não existir
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance;
};

// Exporta a função que retorna o cliente
export default createSupabaseClient;