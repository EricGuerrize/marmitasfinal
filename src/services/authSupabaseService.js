import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anon key must be provided via environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Funções auxiliares
const validarCnpj = (cnpj) => {
  const cnpjLimpo = cnpj.replace(/\D/g, "");

  if (cnpjLimpo.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpjLimpo)) return false;

  const calcularDigito = (cnpj, pos) => {
    let soma = 0;
    let peso = pos === 12 ? 5 : 6;

    for (let i = 0; i < pos; i++) {
      soma += parseInt(cnpj.charAt(i)) * peso;
      peso = peso === 2 ? 9 : peso - 1;
    }

    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const digito1 = calcularDigito(cnpjLimpo, 12);
  const digito2 = calcularDigito(cnpjLimpo, 13);

  return (
    parseInt(cnpjLimpo.charAt(12)) === digito1 &&
    parseInt(cnpjLimpo.charAt(13)) === digito2
  );
};

const formatarCnpj = (cnpj) => {
  const cnpjLimpo = cnpj.replace(/\D/g, "");
  return cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
};

export const authSupabaseService = {
  // Login padrão via email/senha usando Supabase Auth
  login: async (email, senha) => {
    try {
      // Login usando Supabase Auth nativo
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha
      });

      if (error) {
        console.error("❌ Erro de autenticação:", error.message);
        return { 
          success: false, 
          message: error.message || "Erro desconhecido ao fazer login."
        };
      }

      // Buscar dados extras da empresa (opcional)
      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .select("*")
        .eq("user_id", data.user.id)
        .single();

      if (empresaError) {
        console.error("❌ Erro ao buscar empresa:", empresaError.message);
        return { 
          success: false, 
          message: "Dados da empresa não encontrados" 
        };
      }

      console.log('✅ Login realizado com sucesso:', {
        user: data.user.email,
        empresa: empresaData.nome_empresa
      });

      return {
        success: true,
        session: data.session,
        user: data.user,
        empresa: empresaData
      };

    } catch (error) {
      console.error("❌ Erro no login:", error);
      return {
        success: false,
        message: error.message || "Erro desconhecido ao fazer login."
      };
    }
  },

  // ✅ ALTERADO: Registro usando apenas Supabase Auth (sem senha_hash)
  registrarEmpresa: async (email, senha, dadosEmpresa) => {
    try {
      // 1. Registrar usuário via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            nome: dadosEmpresa.nomeFantasia || dadosEmpresa.razaoSocial
          }
        }
      });

      if (authError) {
        console.error("❌ Erro no signUp:", authError.message);
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Usuário não foi criado");
      }

      console.log('✅ Usuário criado via Supabase Auth:', authData.user.id);

      // 2. Inserir apenas dados extras na tabela empresas (sem senha_hash)
      const { error: empresaError } = await supabase.from("empresas").insert({
        user_id: authData.user.id,
        cnpj: dadosEmpresa.cnpj.replace(/\D/g, ""),
        cnpj_formatado: formatarCnpj(dadosEmpresa.cnpj),
        email,
        nome_empresa: dadosEmpresa.nomeEmpresa || dadosEmpresa.nomeFantasia || dadosEmpresa.razaoSocial,
        razao_social: dadosEmpresa.razaoSocial || dadosEmpresa.nomeEmpresa,
        nome_fantasia: dadosEmpresa.nomeFantasia || dadosEmpresa.nomeEmpresa,
        telefone: dadosEmpresa.telefone,
        tipo_usuario: "cliente",
        ativo: true,
        created_at: new Date().toISOString()
      });

      if (empresaError) {
        console.error("❌ Erro ao inserir empresa:", empresaError.message);
        throw empresaError;
      }

      console.log('✅ Empresa cadastrada com sucesso');

      return { 
        success: true,
        message: "Cadastro realizado com sucesso! Verifique seu email para confirmar a conta.",
        userId: authData.user.id
      };

    } catch (error) {
      console.error("❌ Erro no registro:", error.message);
      return { 
        success: false,
        error: error.message || "Erro no cadastro"
      };
    }
  },

  // Verificação de sessão via Supabase Auth
  verificarSessao: async () => {
    try {
      // Verificar sessão Supabase Auth
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("❌ Erro ao obter sessão:", error.message);
        return null;
      }

      const { session } = data;
      
      if (!session) {
        return null;
      }

      // Buscar dados da empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (empresaError) {
        console.error("❌ Erro ao buscar empresa na sessão:", empresaError.message);
        return null;
      }

      console.log('✅ Sessão válida encontrada:', {
        user: session.user.email,
        empresa: empresaData.nome_empresa
      });

      return {
        session,
        user: session.user,
        empresa: empresaData
      };

    } catch (error) {
      console.error("❌ Erro ao verificar sessão:", error);
      return null;
    }
  },

  // Logout
  logout: async () => {
    try {
      // Logout do Supabase Auth
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("❌ Erro no logout:", error.message);
        return false;
      }
      
      console.log("✅ Logout realizado com sucesso");
      return true;
      
    } catch (error) {
      console.error("❌ Erro no logout:", error);
      return false;
    }
  },

  // Recuperação de senha
  enviarCodigoRecuperacao: async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      return { success: true, message: "Link de recuperação enviado para seu email!" };

    } catch (error) {
      console.error("❌ Erro ao enviar código:", error.message);
      return { success: false, error: error.message };
    }
  },

  // Atualizar senha
  atualizarSenha: async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      return { success: true };

    } catch (error) {
      console.error("❌ Erro ao atualizar senha:", error.message);
      return { success: false, error: error.message };
    }
  },

  // Utilitários
  validarCnpj,
  formatarCnpj
};

export default authSupabaseService;