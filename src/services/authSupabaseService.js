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
  // ✅ CORRIGIDO: Autenticação via CNPJ (verificação de senha bcrypt)
  autenticarCnpj: async (cnpj, senha) => {
    try {
      console.log('🔐 Iniciando autenticação via CNPJ:', cnpj);
      
      const cnpjLimpo = cnpj.replace(/\D/g, "");
      
      if (!validarCnpj(cnpjLimpo)) {
        return { success: false, error: "CNPJ inválido" };
      }

      // 1. Buscar empresa por CNPJ
      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .select("*")
        .eq("cnpj", cnpjLimpo)
        .single();

      if (empresaError || !empresaData) {
        console.error("❌ CNPJ não encontrado:", empresaError?.message);
        return { success: false, error: "CNPJ não cadastrado" };
      }

      console.log('📋 Empresa encontrada:', {
        nome: empresaData.nome_empresa,
        tipo: empresaData.tipo_usuario
      });

      // 2. ✅ CORRIGIDO: Verificar senha usando função SQL bcrypt
      const { data: senhaValida, error: senhaError } = await supabase.rpc(
        'verificar_senha', 
        { 
          senha_input: senha,
          senha_hash: empresaData.senha_hash 
        }
      );

      if (senhaError) {
        console.error("❌ Erro ao verificar senha:", senhaError.message);
        return { success: false, error: "Erro ao verificar senha" };
      }

      if (!senhaValida) {
        console.error("❌ Senha incorreta");
        return { success: false, error: "Senha incorreta" };
      }

      // 3. ✅ CORRIGIDO: Criar sessão manual (não usar Supabase Auth)
      const sessionData = {
        id: empresaData.id,
        email: empresaData.email,
        cnpj: empresaData.cnpj,
        cnpjFormatado: empresaData.cnpj_formatado,
        razaoSocial: empresaData.razao_social,
        nomeFantasia: empresaData.nome_fantasia,
        nomeEmpresa: empresaData.nome_empresa,
        tipoUsuario: empresaData.tipo_usuario,
        isAdmin: empresaData.tipo_usuario === "admin",
        loginTime: new Date().toISOString(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 horas
        loginMethod: 'cnpj' // Identificar tipo de login
      };

      // Armazenar sessão
      sessionStorage.setItem("userSession", JSON.stringify(sessionData));
      sessionStorage.setItem("cnpj", empresaData.cnpj_formatado);
      sessionStorage.setItem("nomeEmpresa", empresaData.nome_empresa);

      console.log('✅ Login via CNPJ realizado com sucesso:', {
        empresa: sessionData.nomeEmpresa,
        isAdmin: sessionData.isAdmin
      });

      return { success: true, empresa: sessionData };

    } catch (error) {
      console.error("❌ Erro geral na autenticação via CNPJ:", error);
      return { success: false, error: "Erro de conexão. Tente novamente." };
    }
  },

  // Autenticação padrão (email/senha) - para clientes com Supabase Auth
  autenticar: async (email, senha) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

      if (error) {
        console.error("Erro de autenticação:", error.message);
        return { success: false, error: error.message };
      }

      // Buscar dados da empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .select("*")
        .eq("user_id", data.user.id)
        .single();

      if (empresaError) {
        console.error("Erro ao buscar empresa:", empresaError.message);
        return { success: false, error: "Dados da empresa não encontrados" };
      }

      const sessionData = {
        id: data.user.id,
        email: data.user.email,
        cnpj: empresaData.cnpj,
        cnpjFormatado: formatarCnpj(empresaData.cnpj),
        razaoSocial: empresaData.razao_social,
        nomeFantasia: empresaData.nome_fantasia,
        nomeEmpresa: empresaData.nome_empresa,
        tipoUsuario: empresaData.tipo_usuario,
        isAdmin: empresaData.tipo_usuario === "admin",
        loginTime: new Date().toISOString(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000),
        loginMethod: 'email' // Identificar tipo de login
      };

      sessionStorage.setItem("userSession", JSON.stringify(sessionData));
      return { success: true, empresa: sessionData };

    } catch (error) {
      console.error("Erro na autenticação:", error);
      return { success: false, error: "Erro no servidor" };
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
        // ✅ REMOVIDO: senha_hash (gerenciada pelo Supabase Auth)
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

  // ✅ CORRIGIDO: Verificação de sessão (funciona para ambos os tipos de login)
  verificarSessao: async () => {
    try {
      // 1. Verificar sessão local primeiro
      const sessaoLocal = sessionStorage.getItem("userSession");
      if (sessaoLocal) {
        const sessionData = JSON.parse(sessaoLocal);
        if (sessionData.expiresAt > Date.now()) {
          console.log('📋 Sessão local válida encontrada:', {
            empresa: sessionData.nomeEmpresa,
            isAdmin: sessionData.isAdmin,
            metodo: sessionData.loginMethod
          });
          return sessionData;
        } else {
          // Sessão expirou
          sessionStorage.removeItem("userSession");
        }
      }

      // 2. Verificar sessão Supabase Auth (apenas para clientes normais)
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Erro ao obter sessão Supabase:", error.message);
        return null;
      }

      if (session && session.user) {
        // 3. Buscar dados da empresa
        const { data: empresaData, error: empresaError } = await supabase
          .from("empresas")
          .select("*")
          .eq("user_id", session.user.id)
          .single();

        if (empresaError) {
          console.error("Erro ao buscar empresa na sessão:", empresaError.message);
          return null;
        }

        const sessionData = {
          id: session.user.id,
          email: session.user.email,
          cnpj: empresaData.cnpj,
          cnpjFormatado: formatarCnpj(empresaData.cnpj),
          razaoSocial: empresaData.razao_social,
          nomeFantasia: empresaData.nome_fantasia,
          nomeEmpresa: empresaData.nome_empresa,
          tipoUsuario: empresaData.tipo_usuario,
          isAdmin: empresaData.tipo_usuario === "admin",
          loginTime: new Date().toISOString(),
          expiresAt: Date.now() + (24 * 60 * 60 * 1000),
          loginMethod: 'email'
        };

        sessionStorage.setItem("userSession", JSON.stringify(sessionData));
        return sessionData;
      }

      return null;

    } catch (error) {
      console.error("Erro ao verificar sessão:", error);
      return null;
    }
  },

  // Logout
  logout: async () => {
    try {
      // Logout do Supabase Auth (se existir sessão)
      await supabase.auth.signOut();
      
      // Limpar storage local
      sessionStorage.removeItem("userSession");
      sessionStorage.removeItem("cnpj");
      sessionStorage.removeItem("nomeEmpresa");
      sessionStorage.removeItem("empresaInfo");
      localStorage.removeItem("loginBlock");
      
      console.log("🚪 Logout realizado com sucesso");
      return true;
    } catch (error) {
      console.error("Erro no logout:", error);
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
      console.error("Erro ao enviar código:", error.message);
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
      console.error("Erro ao atualizar senha:", error.message);
      return { success: false, error: error.message };
    }
  },

  // Utilitários
  validarCnpj,
  formatarCnpj
};