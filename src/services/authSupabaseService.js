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

// Hash simples (substitua por bcrypt em produção)
const hashSenha = async (senha) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(senha + 'fitinbox_salt_2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const authSupabaseService = {
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

  // ✅ CORRIGIDO: Login via CNPJ (busca direta na tabela)
  autenticarCnpj: async (cnpj, senha) => {
    try {
      console.log('🔐 Iniciando login via CNPJ:', cnpj);

      // Valida o CNPJ
      if (!validarCnpj(cnpj)) {
        return { 
          success: false, 
          error: "CNPJ inválido." 
        };
      }

      const cnpjLimpo = cnpj.replace(/\D/g, "");
      
      // BUSCAR EMPRESA DIRETAMENTE NA TABELA (NÃO USAR SUPABASE AUTH)
      const { data: empresa, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('cnpj', cnpjLimpo)
        .eq('ativo', true)
        .single();

      if (error || !empresa) {
        console.error("❌ Empresa não encontrada:", error?.message);
        return { success: false, error: 'CNPJ ou senha inválidos' };
      }

      // VERIFICAR SENHA (usando hash simples por enquanto)
      const senhaHash = await hashSenha(senha);
      if (empresa.senha_hash && empresa.senha_hash !== senhaHash) {
        console.error("❌ Senha inválida");
        return { success: false, error: 'CNPJ ou senha inválidos' };
      }

      // CRIAR SESSÃO MANUAL
      const sessaoData = {
        cnpj: cnpjLimpo,
        cnpjFormatado: empresa.cnpj_formatado || formatarCnpj(cnpjLimpo),
        razaoSocial: empresa.razao_social,
        nomeEmpresa: empresa.nome_empresa,
        nomeFantasia: empresa.nome_fantasia,
        email: empresa.email,
        isAdmin: empresa.tipo_usuario === 'admin',
        tipoUsuario: empresa.tipo_usuario,
        empresa: empresa,
        timestamp: Date.now()
      };

      // SALVAR SESSÃO NO SESSIONSTORAGE
      sessionStorage.setItem('sessaoAtiva', JSON.stringify(sessaoData));

      console.log('✅ Login via CNPJ realizado com sucesso:', {
        cnpj: empresa.cnpj_formatado,
        empresa: empresa.nome_empresa
      });

      return { success: true, ...sessaoData };

    } catch (error) {
      console.error("❌ Erro no login via CNPJ:", error.message);
      return {
        success: false,
        error: "Erro ao fazer login"
      };
    }
  },

  // ✅ CORRIGIDO: Registro usando inserção direta na tabela
  registrarEmpresa: async (email, senha, dadosEmpresa) => {
    try {
      console.log('📝 Iniciando registro de empresa via CNPJ:', dadosEmpresa.cnpj);

      const cnpjLimpo = dadosEmpresa.cnpj.replace(/\D/g, "");
      
      // Verifica se CNPJ já existe
      const { data: empresaExistente } = await supabase
        .from('empresas')
        .select('cnpj')
        .eq('cnpj', cnpjLimpo)
        .single();

      if (empresaExistente) {
        return { 
          success: false, 
          error: "CNPJ já cadastrado no sistema" 
        };
      }

      // Hash da senha
      const senhaHash = await hashSenha(senha);

      // Inserir empresa diretamente na tabela
      const { data: novaEmpresa, error: empresaError } = await supabase
        .from("empresas")
        .insert({
          cnpj: cnpjLimpo,
          cnpj_formatado: formatarCnpj(dadosEmpresa.cnpj),
          email: email || null,
          nome_empresa: dadosEmpresa.nomeEmpresa || dadosEmpresa.razaoSocial,
          razao_social: dadosEmpresa.razaoSocial || dadosEmpresa.nomeEmpresa,
          nome_fantasia: dadosEmpresa.nomeFantasia || dadosEmpresa.nomeEmpresa,
          telefone: dadosEmpresa.telefone || null,
          senha_hash: senhaHash, // Salva hash da senha
          tipo_usuario: "cliente",
          ativo: true,
          created_at: new Date().toISOString(),
          tentativas_login: 0
        })
        .select()
        .single();

      if (empresaError) {
        console.error("❌ Erro ao inserir empresa:", empresaError.message);
        return { 
          success: false, 
          error: empresaError.message.includes('duplicate') 
            ? "CNPJ já cadastrado" 
            : "Erro ao cadastrar empresa" 
        };
      }

      console.log('✅ Empresa cadastrada com sucesso:', novaEmpresa.cnpj_formatado);

      return { 
        success: true,
        message: "Cadastro realizado com sucesso! Agora você pode fazer login.",
        empresa: novaEmpresa
      };

    } catch (error) {
      console.error("❌ Erro no registro:", error.message);
      return { 
        success: false,
        error: "Erro no cadastro"
      };
    }
  },

  // ✅ CORRIGIDO: Verificação de sessão via sessionStorage
  verificarSessao: async () => {
    try {
      const sessaoSalva = sessionStorage.getItem('sessaoAtiva');
      
      if (!sessaoSalva) {
        return null;
      }

      const sessaoData = JSON.parse(sessaoSalva);
      
      // Verifica se a sessão não expirou (1 dia)
      const agora = Date.now();
      const umDia = 24 * 60 * 60 * 1000;
      
      if (sessaoData.timestamp && (agora - sessaoData.timestamp) > umDia) {
        sessionStorage.removeItem('sessaoAtiva');
        return null;
      }

      console.log('✅ Sessão válida encontrada:', {
        cnpj: sessaoData.cnpjFormatado,
        empresa: sessaoData.nomeEmpresa
      });

      return sessaoData;

    } catch (error) {
      console.error("❌ Erro ao verificar sessão:", error);
      sessionStorage.removeItem('sessaoAtiva');
      return null;
    }
  },

  // Logout
  logout: async () => {
    try {
      // Remove sessão local
      sessionStorage.removeItem('sessaoAtiva');
      
      // Tenta fazer logout do Supabase Auth também (se existir)
      await supabase.auth.signOut();
      
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

  // ✅ NOVAS FUNÇÕES ADMINISTRATIVAS
  listarEmpresas: async () => {
    try {
      const { data: empresas, error } = await supabase
        .from('empresas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return empresas || [];
    } catch (error) {
      console.error("❌ Erro ao listar empresas:", error);
      return [];
    }
  },

  toggleEmpresaAtiva: async (empresaId, ativo) => {
    try {
      const { error } = await supabase
        .from('empresas')
        .update({ ativo: ativo })
        .eq('id', empresaId);

      if (error) throw error;
      
      return { 
        success: true, 
        message: `Empresa ${ativo ? 'ativada' : 'desativada'} com sucesso!` 
      };
    } catch (error) {
      console.error("❌ Erro ao alterar status da empresa:", error);
      return { 
        success: false, 
        error: "Erro ao alterar status da empresa" 
      };
    }
  },

  // Utilitários
  validarCnpj,
  formatarCnpj,
  hashSenha
};

export { authSupabaseService };
export default authSupabaseService;