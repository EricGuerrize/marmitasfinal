// test-connection.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Testando conexão Supabase...\n');

// Verifica variáveis de ambiente
console.log('📋 Variáveis de ambiente:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Definida ✅' : 'Não definida ❌');
console.log('');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ Variáveis de ambiente não definidas!');
  process.exit(1);
}

// Cria cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Testa conexão
async function testConnection() {
  try {
    console.log('🔄 Testando conexão com Supabase...');
    
    // Teste 1: Listar tabelas
    const { data: tables, error: tablesError } = await supabase
      .from('empresas')
      .select('count')
      .limit(1);
      
    if (tablesError) {
      console.error('❌ Erro ao conectar:', tablesError.message);
      return false;
    }
    
    console.log('✅ Conexão funcionando!');
    
    // Teste 2: Buscar admin
    const { data: admin, error: adminError } = await supabase
      .from('empresas')
      .select('*')
      .eq('cnpj', '05336475000177')
      .single();
      
    if (adminError) {
      console.error('❌ Erro ao buscar admin:', adminError.message);
      return false;
    }
    
    console.log('✅ Admin encontrado:');
    console.log('   - CNPJ:', admin.cnpj_formatado);
    console.log('   - Email:', admin.email);
    console.log('   - Tipo:', admin.tipo_usuario);
    console.log('   - Nome:', admin.nome_empresa);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    return false;
  }
}

testConnection().then(success => {
  if (success) {
    console.log('\n🎉 Supabase está conectado e funcionando!');
  } else {
    console.log('\n💥 Problemas na conexão com Supabase');
  }
  process.exit(success ? 0 : 1);
});