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

const authSupabaseService = {
  // ✅ FUNÇÃO PRINCIPAL: Login via CNPJ (que estava faltando)
  autenticarCnpj: async (cnpj, senha) => {
    try {
      console.log('🔐 Iniciando login via CNPJ:', cnpj);

      // 1. Validar formato do CNPJ
      const cnpjLimpo = cnpj.replace(/\D/g, "");
      if (!validarCnpj(cnpjLimpo)) {
        return { 
          success: false, 
          error: "CNPJ inválido" 
        };
      }

      // 2. Buscar empresa por CNPJ
      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .select("*")
        .eq("cnpj", cnpjLimpo)
        .eq("ativo", true)
        .single();

      if (empresaError || !empresaData) {
        console.error("❌ Empresa não encontrada:", empresaError?.message);
        return { 
          success: false, 
          error: "CNPJ não cadastrado ou empresa inativa" 
        };
      }

      // 3. Fazer login via email usando Supabase Auth
      if (!empresaData.email) {
        return { 
          success: false, 
          error: "Empresa não possui email cadastrado. Entre em contato com o suporte." 
        };
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: empresaData.email,
        password: senha
      });

      if (authError) {
        console.error("❌ Erro de autenticação:", authError.message);
        
        // Mensagens de erro mais amigáveis
        let errorMessage = "Senha incorreta";
        if (authError.message.includes('Invalid login credentials')) {
          errorMessage = "CNPJ ou senha incorretos";
        } else if (authError.message.includes('Email not confirmed')) {
          errorMessage = "Email não confirmado. Verifique sua caixa de entrada.";
        }
        
        return { 
          success: false, 
          error: errorMessage
        };
      }

      // 4. Atualizar último acesso
      await supabase
        .from("empresas")
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq("id", empresaData.id);

      // 5. Criar dados da sessão
      const sessaoData = {
        id: empresaData.id,
        cnpj: cnpjLimpo,
        cnpjFormatado: formatarCnpj(cnpjLimpo),
        email: empresaData.email,
        nomeEmpresa: empresaData.nome_empresa,
        razaoSocial: empresaData.razao_social,
        nomeFantasia: empresaData.nome_fantasia,
        tipoUsuario: empresaData.tipo_usuario,
        isAdmin: empresaData.tipo_usuario === 'admin',
        ultimoAcesso: new Date().toISOString()
      };

      // 6. Salvar dados na sessão para compatibilidade
      sessionStorage.setItem('cnpj', sessaoData.cnpjFormatado);
      sessionStorage.setItem('empresaInfo', sessaoData.razaoSocial || sessaoData.nomeEmpresa);
      sessionStorage.setItem('nomeEmpresa', sessaoData.nomeEmpresa || '');
      sessionStorage.setItem('sessaoAtiva', JSON.stringify(sessaoData));

      console.log('✅ Login via CNPJ realizado com sucesso:', {
        cnpj: sessaoData.cnpjFormatado,
        empresa: sessaoData.nomeEmpresa,
        isAdmin: sessaoData.isAdmin
      });

      return {
        success: true,
        session: authData.session,
        user: authData.user,
        empresa: sessaoData
      };

    } catch (error) {
      console.error("❌ Erro no login via CNPJ:", error);
      return {
        success: false,
        error: error.message || "Erro desconhecido ao fazer login."
      };
    }
  },

  // Login padrão via email/senha usando Supabase Auth
  login: async (email, senha) => {
    try {
      console.log('🔐 Iniciando login via email:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha
      });

      if (error) {
        console.error("❌ Erro de autenticação:", error.message);
        return { 
          success: false, 
          error: error.message || "Erro desconhecido ao fazer login."
        };
      }

      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .select("*")
        .eq("user_id", data.user.id)
        .single();

      if (empresaError) {
        console.error("❌ Erro ao buscar empresa:", empresaError.message);
        return { 
          success: false, 
          error: "Dados da empresa não encontrados" 
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
        error: error.message || "Erro desconhecido ao fazer login."
      };
    }
  },

  // Registro de empresa
  registrarEmpresa: async (email, senha, dadosEmpresa) => {
    try {
      console.log('📝 Iniciando registro de empresa:', email);

      // 1. Verificar se CNPJ já existe
      const cnpjLimpo = dadosEmpresa.cnpj.replace(/\D/g, "");
      if (!validarCnpj(cnpjLimpo)) {
        return { 
          success: false, 
          error: "CNPJ inválido" 
        };
      }

      const { data: empresaExistente } = await supabase
        .from("empresas")
        .select("id")
        .eq("cnpj", cnpjLimpo)
        .single();

      if (empresaExistente) {
        return { 
          success: false, 
          error: "CNPJ já cadastrado" 
        };
      }

      // 2. Registrar usuário via Supabase Auth
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
        
        let errorMessage = authError.message;
        if (authError.message.includes('User already registered')) {
          errorMessage = "Email já cadastrado";
        }
        
        return { 
          success: false, 
          error: errorMessage
        };
      }

      if (!authData.user) {
        throw new Error("Usuário não foi criado");
      }

      console.log('✅ Usuário criado via Supabase Auth:', authData.user.id);

      // 3. Inserir dados da empresa
      const { error: empresaError } = await supabase.from("empresas").insert({
        user_id: authData.user.id,
        cnpj: cnpjLimpo,
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
        message: "Cadastro realizado com sucesso! Você já pode fazer login.",
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

  // ✅ CORRIGIDO: Verificação de sessão
  verificarSessao: async () => {
    try {
      // 1. Primeiro tenta sessionStorage para compatibilidade
      const sessaoSalva = sessionStorage.getItem('sessaoAtiva');
      if (sessaoSalva) {
        try {
          const sessao = JSON.parse(sessaoSalva);
          console.log('✅ Sessão recuperada do sessionStorage');
          return sessao;
        } catch {
          sessionStorage.removeItem('sessaoAtiva');
        }
      }

      // 2. Verificar sessão Supabase Auth
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("❌ Erro ao obter sessão:", error.message);
        return null;
      }

      const { session } = data;
      
      if (!session) {
        return null;
      }

      // 3. Buscar dados da empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (empresaError) {
        console.error("❌ Erro ao buscar empresa na sessão:", empresaError.message);
        return null;
      }

      // 4. Criar dados da sessão
      const sessaoData = {
        id: empresaData.id,
        cnpj: empresaData.cnpj,
        cnpjFormatado: empresaData.cnpj_formatado,
        email: empresaData.email,
        nomeEmpresa: empresaData.nome_empresa,
        razaoSocial: empresaData.razao_social,
        nomeFantasia: empresaData.nome_fantasia,
        tipoUsuario: empresaData.tipo_usuario,
        isAdmin: empresaData.tipo_usuario === 'admin',
        ultimoAcesso: empresaData.ultimo_acesso
      };

      // 5. Salvar no sessionStorage para próximas verificações
      sessionStorage.setItem('sessaoAtiva', JSON.stringify(sessaoData));

      console.log('✅ Sessão válida encontrada:', {
        user: session.user.email,
        empresa: sessaoData.nomeEmpresa,
        isAdmin: sessaoData.isAdmin
      });

      return sessaoData;

    } catch (error) {
      console.error("❌ Erro ao verificar sessão:", error);
      return null;
    }
  },

  // Logout
  logout: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("❌ Erro no logout:", error.message);
      }
      
      // Limpar sessionStorage
      sessionStorage.removeItem('cnpj');
      sessionStorage.removeItem('empresaInfo');
      sessionStorage.removeItem('nomeEmpresa');
      sessionStorage.removeItem('sessaoAtiva');
      sessionStorage.removeItem('carrinho');
      sessionStorage.removeItem('pedidoAtual');
      sessionStorage.removeItem('pedidoConfirmado');
      
      console.log("✅ Logout realizado com sucesso");
      return true;
      
    } catch (error) {
      console.error("❌ Erro no logout:", error);
      return false;
    }
  },

  // ✅ ADICIONADO: Listar empresas para o admin
  listarEmpresas: async () => {
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error("❌ Erro ao listar empresas:", error);
      return [];
    }
  },

  // ✅ ADICIONADO: Toggle empresa ativa
  toggleEmpresaAtiva: async (empresaId, ativo) => {
    try {
      const { error } = await supabase
        .from("empresas")
        .update({ ativo: !ativo, updated_at: new Date().toISOString() })
        .eq("id", empresaId);

      if (error) throw error;

      return { 
        success: true, 
        message: `Empresa ${!ativo ? 'ativada' : 'desativada'} com sucesso` 
      };

    } catch (error) {
      console.error("❌ Erro ao alterar status da empresa:", error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  // Recuperação de senha
  enviarCodigoRecuperacao: async (email) => {
    try {
      // Simular envio de código (desenvolvimento)
      const codigoSimulado = Math.floor(100000 + Math.random() * 900000).toString();
      
      console.log('📧 Código de recuperação simulado:', codigoSimulado);
      
      // Em produção, usar Supabase Auth reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error && !error.message.includes('Email not confirmed')) {
        throw error;
      }
      
      return { 
        success: true, 
        message: "Código enviado com sucesso!",
        codigo: codigoSimulado // Apenas para desenvolvimento
      };

    } catch (error) {
      console.error("❌ Erro ao enviar código:", error.message);
      return { 
        success: false, 
        error: error.message || "Erro ao enviar código"
      };
    }
  },

  // ✅ ADICIONADO: Confirmar código e alterar senha
  confirmarCodigoEAlterarSenha: async (email, codigo, novaSenha) => {
    try {
      // Simular validação de código (desenvolvimento)
      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .select("user_id")
        .eq("email", email)
        .single();

      if (empresaError || !empresaData) {
        return { success: false, error: "Email não encontrado" };
      }

      // Para desenvolvimento, qualquer código de 6 dígitos é aceito
      if (codigo.length !== 6 || !/^\d{6}$/.test(codigo)) {
        return { success: false, error: "Código inválido" };
      }

      // Simular sucesso (em produção, implementar validação real)
      console.log('✅ Senha alterada com sucesso (simulado)');
      
      return { success: true };

    } catch (error) {
      console.error("❌ Erro ao confirmar código:", error.message);
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

  // ✅ ADICIONADO: Utilitário para mascarar email
  mascarEmail: (email) => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (!domain) return email;
    
    const localMasked = local.length > 2 
      ? local.substring(0, 2) + '*'.repeat(local.length - 2)
      : local;
    
    return `${localMasked}@${domain}`;
  },

  // Utilitários
  validarCnpj,
  formatarCnpj
};

export { authSupabaseService };
export default authSupabaseService;