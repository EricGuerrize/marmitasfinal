// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// ✅ Credenciais via variáveis de ambiente
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// ✅ Validação das credenciais uma única vez
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Credenciais do Supabase não encontradas nas variáveis de ambiente');
  throw new Error('Supabase URL and anon key must be provided via environment variables');
}

// ✅ Cliente único criado uma vez e reutilizado (Singleton)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // ✅ Evita conflitos entre múltiplas instâncias
    storage: window.localStorage,
    storageKey: 'fitinbox-auth-token', // Chave única para sua aplicação
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // ✅ Evita problemas com URLs
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'fitinbox-web-app'
    }
  },
  // ✅ Configurações para evitar conflitos
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// ✅ Log apenas em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  console.log('✅ Cliente Supabase inicializado com sucesso');
}

// ✅ Exporta o cliente diretamente (não uma função)
export default supabase;

// ✅ Função helper para verificar se o cliente está funcionando
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('❌ Erro ao testar conexão:', error.message);
      return false;
    }
    console.log('✅ Conexão com Supabase OK');
    return true;
  } catch (error) {
    console.error('❌ Erro inesperado na conexão:', error);
    return false;
  }
};