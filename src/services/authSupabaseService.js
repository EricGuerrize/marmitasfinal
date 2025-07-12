// ✅ CORRIGIDO: Versão otimizada para resolver problema de performance
import supabase from '../lib/supabase';

// ✅ Cache otimizado
let sessionCache = null;
let sessionCacheTimestamp = 0;
const SESSION_CACHE_DURATION = 30000; // 30 segundos

// Funções auxiliares otimizadas
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

// ✅ Hash otimizado - versão síncrona mais rápida
const hashSenha = (senha) => {
  if (!senha) return null;
  
  // Usa uma implementação mais rápida sem async
  const combined = senha + 'fitinbox_salt_2025';
  let hash = 0;
  
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Converte para string hexadecimal
  return Math.abs(hash).toString(16);
};

// ✅ Função para criar timeout em operações
const withTimeout = (promise, ms = 5000) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
};

// ✅ CNPJs administrativos (pode ser configurado via variável de ambiente)
const ADMIN_CNPJS = [
  '00000000000191', // CNPJ admin padrão
  '12345678000195', // CNPJ admin secundário
  process.env.REACT_APP_ADMIN_CNPJ?.replace(/\D/g, '') // CNPJ via env
].filter(Boolean);

const authSupabaseService = {
  // ✅ Login padrão otimizado
  login: async (email, senha, options = {}) => {
    const { signal } = options;
    
    try {
      console.log('🔐 Iniciando login via email:', email);

      const loginPromise = supabase.auth.signInWithPassword({
        email,
        password: senha
      });

      const { data, error } = signal 
        ? await Promise.race([
            loginPromise,
            new Promise((_, reject) => {
              signal.addEventListener('abort', () => reject(new Error('AbortError')));
            })
          ])
        : await withTimeout(loginPromise, 5000);

      if (error) {
        console.error("❌ Erro de autenticação:", error.message);
        return { 
          success: false, 
          error: error.message || "Erro desconhecido ao fazer login."
        };
      }

      const empresaPromise = supabase
        .from("empresas")
        .select("*")
        .eq("user_id", data.user.id)
        .single();

      const { data: empresaData, error: empresaError } = await withTimeout(empresaPromise, 3000);

      if (empresaError) {
        console.error("❌ Erro ao buscar empresa:", empresaError.message);
        return { 
          success: false, 
          error: "Dados da empresa não encontrados" 
        };
      }

      console.log('✅ Login realizado com sucesso');

      sessionCache = {
        success: true,
        session: data.session,
        user: data.user,
        empresa: empresaData
      };
      sessionCacheTimestamp = Date.now();

      return sessionCache;

    } catch (error) {
      console.error("❌ Erro no login:", error);
      return {
        success: false,
        error: error.message === 'Timeout' ? 'Tempo esgotado. Tente novamente.' : 
               error.name === 'AbortError' ? 'Operação cancelada' :
               error.message || "Erro desconhecido ao fazer login."
      };
    }
  },

  // ✅ Login via CNPJ super otimizado
  autenticarCnpj: async (cnpj, senha, options = {}) => {
    const { signal } = options;
    
    try {
      console.log('🔐 Iniciando login via CNPJ:', cnpj);

      if (!validarCnpj(cnpj)) {
        return { success: false, error: "CNPJ inválido." };
      }

      const cnpjLimpo = cnpj.replace(/\D/g, "");
      
      // ✅ Verifica se é admin antes de consultar banco
      const isAdminCnpj = ADMIN_CNPJS.includes(cnpjLimpo);
      
      const empresaPromise = supabase
        .from('empresas')
        .select('*')
        .eq('cnpj', cnpjLimpo)
        .single();

      const { data: empresa, error } = signal 
        ? await Promise.race([
            empresaPromise,
            new Promise((_, reject) => {
              signal.addEventListener('abort', () => reject(new Error('AbortError')));
            })
          ])
        : await withTimeout(empresaPromise, 3000);

      if (error || !empresa) {
        console.error("❌ Empresa não encontrada:", error?.message);
        return { success: false, error: 'CNPJ ou senha inválidos' };
      }

      // ✅ Verificação de senha mais rápida
      const senhaHash = hashSenha(senha);
      if (!senhaHash || (empresa.senha_hash && empresa.senha_hash !== senhaHash)) {
        console.error("❌ Senha inválida");
        return { success: false, error: 'CNPJ ou senha inválidos' };
      }

      // ✅ Determina tipo de usuário
      const tipoUsuario = isAdminCnpj ? 'admin' : (empresa.tipo_usuario || 'cliente');
      const isAdmin = tipoUsuario === 'admin';

      // ✅ Criação de sessão otimizada
      const sessaoData = {
        cnpj: cnpjLimpo,
        cnpjFormatado: empresa.cnpj_formatado || formatarCnpj(cnpjLimpo),
        razaoSocial: empresa.razao_social,
        nomeEmpresa: empresa.nome_empresa,
        nomeFantasia: empresa.nome_fantasia,
        email: empresa.email,
        isAdmin: isAdmin,
        tipoUsuario: tipoUsuario,
        empresa: empresa,
        timestamp: Date.now()
      };

      // ✅ Salvar sessão de forma síncrona (mais rápido)
      try {
        sessionStorage.setItem('sessaoAtiva', JSON.stringify(sessaoData));
        sessionCache = { success: true, ...sessaoData };
        sessionCacheTimestamp = Date.now();
      } catch (storageError) {
        console.error('Erro ao salvar sessão:', storageError);
      }

      console.log('✅ Login via CNPJ realizado com sucesso');

      return { success: true, ...sessaoData };

    } catch (error) {
      console.error("❌ Erro no login via CNPJ:", error.message);
      return {
        success: false,
        error: error.message === 'Timeout' ? 'Tempo esgotado. Tente novamente.' : 
               error.name === 'AbortError' ? 'Operação cancelada' :
               "Erro ao fazer login"
      };
    }
  },

  // ✅ Registro otimizado
  registrarEmpresa: async (email, senha, dadosEmpresa, options = {}) => {
    const { signal } = options;
    
    try {
      console.log('📝 Iniciando registro de empresa via CNPJ:', dadosEmpresa.cnpj);

      const cnpjLimpo = dadosEmpresa.cnpj.replace(/\D/g, "");
      
      const checkPromise = supabase
        .from('empresas')
        .select('cnpj')
        .eq('cnpj', cnpjLimpo);

      const { data: empresasExistentes, error: checkError } = await withTimeout(checkPromise, 3000);

      if (checkError) {
        console.error("❌ Erro ao verificar CNPJ existente:", checkError);
        return { success: false, error: "Erro ao verificar CNPJ" };
      }

      if (empresasExistentes && empresasExistentes.length > 0) {
        return { success: false, error: "CNPJ já cadastrado no sistema" };
      }

      // ✅ Hash da senha síncrono
      const senhaHash = hashSenha(senha);
      if (!senhaHash) {
        return { success: false, error: "Erro ao processar senha" };
      }

      // ✅ Verifica se é CNPJ admin
      const isAdminCnpj = ADMIN_CNPJS.includes(cnpjLimpo);
      
      const dadosInsercao = {
        cnpj: cnpjLimpo,
        cnpj_formatado: formatarCnpj(dadosEmpresa.cnpj),
        senha_hash: senhaHash,
        ativo: true,
        tipo_usuario: isAdminCnpj ? 'admin' : 'cliente'
      };

      if (email && email.trim()) {
        dadosInsercao.email = email.trim();
      }
      
      if (dadosEmpresa.nomeEmpresa && dadosEmpresa.nomeEmpresa.trim()) {
        dadosInsercao.nome_empresa = dadosEmpresa.nomeEmpresa.trim();
        dadosInsercao.razao_social = dadosEmpresa.nomeEmpresa.trim();
        dadosInsercao.nome_fantasia = dadosEmpresa.nomeEmpresa.trim();
      }

      const insertPromise = supabase
        .from("empresas")
        .insert(dadosInsercao)
        .select();

      const { data: novaEmpresa, error: empresaError } = signal 
        ? await Promise.race([
            insertPromise,
            new Promise((_, reject) => {
              signal.addEventListener('abort', () => reject(new Error('AbortError')));
            })
          ])
        : await withTimeout(insertPromise, 5000);

      if (empresaError) {
        console.error("❌ Erro ao inserir empresa:", empresaError);
        
        if (empresaError.code === '23505') {
          return { success: false, error: "CNPJ já cadastrado" };
        }
        
        return { 
          success: false, 
          error: `Erro ao cadastrar: ${empresaError.message || 'Erro desconhecido'}` 
        };
      }

      if (!novaEmpresa || novaEmpresa.length === 0) {
        return { success: false, error: "Erro: empresa não foi criada" };
      }

      console.log('✅ Empresa cadastrada com sucesso:', novaEmpresa[0].cnpj_formatado);

      return { 
        success: true,
        message: "Cadastro realizado com sucesso! Agora você pode fazer login.",
        empresa: novaEmpresa[0]
      };

    } catch (error) {
      console.error("❌ Erro no registro:", error);
      return { 
        success: false,
        error: error.message === 'Timeout' ? 'Tempo esgotado. Tente novamente.' : 
               error.name === 'AbortError' ? 'Operação cancelada' :
               `Erro no cadastro: ${error.message || 'Erro desconhecido'}`
      };
    }
  },

  // ✅ Verificação de sessão SUPER OTIMIZADA (resolve o problema de 914ms!)
  verificarSessao: async (options = {}) => {
    const { signal, forceRefresh = false } = options;
    
    try {
      // ✅ Usa cache se disponível e não forçou refresh
      const now = Date.now();
      if (!forceRefresh && sessionCache && (now - sessionCacheTimestamp) < SESSION_CACHE_DURATION) {
        console.log('✅ Usando sessão do cache (rápido)');
        return sessionCache;
      }

      // ✅ Operação síncrona mais rápida (sem requestAnimationFrame!)
      try {
        const sessaoSalva = sessionStorage.getItem('sessaoAtiva');
        
        if (!sessaoSalva) {
          sessionCache = null;
          sessionCacheTimestamp = 0;
          return null;
        }

        const sessaoData = JSON.parse(sessaoSalva);
        
        // ✅ Verifica expiração (1 dia)
        const agora = Date.now();
        const umDia = 24 * 60 * 60 * 1000;
        
        if (sessaoData.timestamp && (agora - sessaoData.timestamp) > umDia) {
          // ✅ Remove sessão expirada de forma assíncrona
          setTimeout(() => {
            sessionStorage.removeItem('sessaoAtiva');
          }, 0);
          sessionCache = null;
          sessionCacheTimestamp = 0;
          return null;
        }

        console.log('✅ Sessão válida encontrada (rápido):', {
          cnpj: sessaoData.cnpjFormatado,
          empresa: sessaoData.nomeEmpresa,
          isAdmin: sessaoData.isAdmin
        });

        // ✅ Atualiza cache
        sessionCache = sessaoData;
        sessionCacheTimestamp = now;
        
        return sessaoData;

      } catch (error) {
        console.error("❌ Erro ao verificar sessão:", error);
        // ✅ Limpa dados de forma assíncrona
        setTimeout(() => {
          sessionStorage.removeItem('sessaoAtiva');
        }, 0);
        sessionCache = null;
        sessionCacheTimestamp = 0;
        return null;
      }

    } catch (error) {
      console.error("❌ Erro na verificação de sessão:", error);
      sessionCache = null;
      sessionCacheTimestamp = 0;
      return null;
    }
  },

  // ✅ Função específica para verificar admin
  verificarPrivilegiosAdmin: (sessaoData) => {
    if (!sessaoData) return false;
    
    // Verifica se é admin por múltiplos critérios
    if (sessaoData.isAdmin === true) return true;
    if (sessaoData.tipoUsuario === 'admin') return true;
    
    // Verifica se o CNPJ está na lista de admins
    const cnpjLimpo = sessaoData.cnpj?.replace(/\D/g, '');
    if (cnpjLimpo && ADMIN_CNPJS.includes(cnpjLimpo)) return true;
    
    return false;
  },

  // ✅ Logout otimizado
  logout: async () => {
    try {
      // ✅ Limpa cache
      sessionCache = null;
      sessionCacheTimestamp = 0;
      
      // ✅ Remove sessão de forma síncrona
      try {
        sessionStorage.removeItem('sessaoAtiva');
        sessionStorage.removeItem('adminPreAuthenticated');
        sessionStorage.removeItem('adminAuthenticated');
      } catch (storageError) {
        console.error('Erro ao limpar storage:', storageError);
      }
      
      // ✅ Logout do Supabase com timeout em background
      setTimeout(async () => {
        try {
          await withTimeout(supabase.auth.signOut(), 2000);
        } catch (timeoutError) {
          console.warn('Timeout no logout do Supabase, prosseguindo...');
        }
      }, 0);
      
      console.log("✅ Logout realizado com sucesso");
      return true;
      
    } catch (error) {
      console.error("❌ Erro no logout:", error);
      return false;
    }
  },

  // ✅ Recuperação de senha otimizada
  enviarCodigoRecuperacao: async (email) => {
    try {
      const resetPromise = supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      const { error } = await withTimeout(resetPromise, 10000);
      
      if (error) throw error;
      return { success: true, message: "Link de recuperação enviado para seu email!" };

    } catch (error) {
      console.error("❌ Erro ao enviar código:", error.message);
      return { 
        success: false, 
        error: error.message === 'Timeout' ? 'Tempo esgotado. Tente novamente.' : error.message 
      };
    }
  },

  // ✅ Atualizar senha otimizada
  atualizarSenha: async (newPassword) => {
    try {
      const updatePromise = supabase.auth.updateUser({
        password: newPassword
      });
      
      const { error } = await withTimeout(updatePromise, 5000);

      if (error) throw error;
      return { success: true };

    } catch (error) {
      console.error("❌ Erro ao atualizar senha:", error.message);
      return { 
        success: false, 
        error: error.message === 'Timeout' ? 'Tempo esgotado. Tente novamente.' : error.message 
      };
    }
  },

  // ✅ Funções administrativas otimizadas
  listarEmpresas: async () => {
    try {
      const listPromise = supabase
        .from('empresas')
        .select('*')
        .order('created_at', { ascending: false });
        
      const { data: empresas, error } = await withTimeout(listPromise, 8000);

      if (error) throw error;
      
      return empresas || [];
    } catch (error) {
      console.error("❌ Erro ao listar empresas:", error);
      return [];
    }
  },

  toggleEmpresaAtiva: async (empresaId, ativo) => {
    try {
      const togglePromise = supabase
        .from('empresas')
        .update({ ativo: ativo })
        .eq('id', empresaId);
        
      const { error } = await withTimeout(togglePromise, 3000);

      if (error) throw error;
      
      return { 
        success: true, 
        message: `Empresa ${ativo ? 'ativada' : 'desativada'} com sucesso!` 
      };
    } catch (error) {
      console.error("❌ Erro ao alterar status da empresa:", error);
      return { 
        success: false, 
        error: error.message === 'Timeout' ? 'Tempo esgotado. Tente novamente.' : "Erro ao alterar status da empresa" 
      };
    }
  },

  // ✅ Função para configurar CNPJ admin em runtime
  adicionarCnpjAdmin: (cnpj) => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length === 14 && !ADMIN_CNPJS.includes(cnpjLimpo)) {
      ADMIN_CNPJS.push(cnpjLimpo);
      console.log('✅ CNPJ admin adicionado:', formatarCnpj(cnpjLimpo));
    }
  },

  // ✅ Função para listar CNPJs admin
  listarCnpjsAdmin: () => {
    return ADMIN_CNPJS.map(cnpj => formatarCnpj(cnpj));
  },

  // ✅ Função para limpar cache (útil para debugging)
  clearCache: () => {
    sessionCache = null;
    sessionCacheTimestamp = 0;
    console.log('🗑️ Cache de sessão limpo');
  },

  // Utilitários
  validarCnpj,
  formatarCnpj,
  hashSenha
};

export { authSupabaseService };
export default authSupabaseService;