// ✅ CORRIGIDO: Usar cliente único do singleton
import supabase from '../lib/supabase';

// ✅ Cache para verificação de sessão (evita calls desnecessários)
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

// ✅ Hash otimizado e assíncrono (não bloqueia UI)
const hashSenha = async (senha) => {
  return new Promise((resolve) => {
    // Usa setTimeout para não bloquear o thread principal
    setTimeout(async () => {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(senha + 'fitinbox_salt_2025');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        resolve(hash);
      } catch (error) {
        console.error('Erro ao gerar hash:', error);
        resolve(null);
      }
    }, 0);
  });
};

// ✅ Função para criar timeout em operações
const withTimeout = (promise, ms = 5000) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
};

const authSupabaseService = {
  // ✅ Login padrão otimizado
  login: async (email, senha, options = {}) => {
    const { signal } = options;
    
    try {
      console.log('🔐 Iniciando login via email:', email);

      // ✅ Operação com timeout e cancelamento
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

      // ✅ Busca dados da empresa com timeout
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

      // ✅ Atualiza cache
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

  // ✅ Login via CNPJ otimizado
  autenticarCnpj: async (cnpj, senha, options = {}) => {
    const { signal } = options;
    
    try {
      console.log('🔐 Iniciando login via CNPJ:', cnpj);

      // ✅ Validação rápida
      if (!validarCnpj(cnpj)) {
        return { success: false, error: "CNPJ inválido." };
      }

      const cnpjLimpo = cnpj.replace(/\D/g, "");
      
      // ✅ Busca empresa com timeout
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

      // ✅ Verificação de senha assíncrona
      const senhaHash = await hashSenha(senha);
      if (!senhaHash || (empresa.senha_hash && empresa.senha_hash !== senhaHash)) {
        console.error("❌ Senha inválida");
        return { success: false, error: 'CNPJ ou senha inválidos' };
      }

      // ✅ Criação de sessão otimizada
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

      // ✅ Salvar sessão assíncrono
      setTimeout(() => {
        try {
          sessionStorage.setItem('sessaoAtiva', JSON.stringify(sessaoData));
          sessionCache = { success: true, ...sessaoData };
          sessionCacheTimestamp = Date.now();
        } catch (storageError) {
          console.error('Erro ao salvar sessão:', storageError);
        }
      }, 0);

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
      
      // ✅ Verificação com timeout
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

      // ✅ Hash da senha assíncrono
      const senhaHash = await hashSenha(senha);
      if (!senhaHash) {
        return { success: false, error: "Erro ao processar senha" };
      }

      // ✅ Preparar dados
      const dadosInsercao = {
        cnpj: cnpjLimpo,
        cnpj_formatado: formatarCnpj(dadosEmpresa.cnpj),
        senha_hash: senhaHash,
        ativo: true,
        tipo_usuario: 'cliente'
      };

      if (email && email.trim()) {
        dadosInsercao.email = email.trim();
      }
      
      if (dadosEmpresa.nomeEmpresa && dadosEmpresa.nomeEmpresa.trim()) {
        dadosInsercao.nome_empresa = dadosEmpresa.nomeEmpresa.trim();
        dadosInsercao.razao_social = dadosEmpresa.nomeEmpresa.trim();
        dadosInsercao.nome_fantasia = dadosEmpresa.nomeEmpresa.trim();
      }

      // ✅ Inserção com timeout
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

  // ✅ Verificação de sessão COM CACHE (resolve o problema de 9s!)
  verificarSessao: async (options = {}) => {
    const { signal, forceRefresh = false } = options;
    
    try {
      // ✅ Usa cache se disponível e não forçou refresh
      const now = Date.now();
      if (!forceRefresh && sessionCache && (now - sessionCacheTimestamp) < SESSION_CACHE_DURATION) {
        console.log('✅ Usando sessão do cache');
        return sessionCache;
      }

      // ✅ Operação assíncrona para não bloquear UI
      return new Promise((resolve) => {
        // Usa requestAnimationFrame para não bloquear
        requestAnimationFrame(() => {
          try {
            const sessaoSalva = sessionStorage.getItem('sessaoAtiva');
            
            if (!sessaoSalva) {
              sessionCache = null;
              sessionCacheTimestamp = 0;
              resolve(null);
              return;
            }

            const sessaoData = JSON.parse(sessaoSalva);
            
            // ✅ Verifica expiração (1 dia)
            const agora = Date.now();
            const umDia = 24 * 60 * 60 * 1000;
            
            if (sessaoData.timestamp && (agora - sessaoData.timestamp) > umDia) {
              setTimeout(() => {
                sessionStorage.removeItem('sessaoAtiva');
              }, 0);
              sessionCache = null;
              sessionCacheTimestamp = 0;
              resolve(null);
              return;
            }

            console.log('✅ Sessão válida encontrada:', {
              cnpj: sessaoData.cnpjFormatado,
              empresa: sessaoData.nomeEmpresa
            });

            // ✅ Atualiza cache
            sessionCache = sessaoData;
            sessionCacheTimestamp = now;
            
            resolve(sessaoData);

          } catch (error) {
            console.error("❌ Erro ao verificar sessão:", error);
            setTimeout(() => {
              sessionStorage.removeItem('sessaoAtiva');
            }, 0);
            sessionCache = null;
            sessionCacheTimestamp = 0;
            resolve(null);
          }
        });
      });

    } catch (error) {
      console.error("❌ Erro na verificação de sessão:", error);
      sessionCache = null;
      sessionCacheTimestamp = 0;
      return null;
    }
  },

  // ✅ Logout otimizado
  logout: async () => {
    try {
      // ✅ Limpa cache
      sessionCache = null;
      sessionCacheTimestamp = 0;
      
      // ✅ Remove sessão assíncrono
      setTimeout(() => {
        sessionStorage.removeItem('sessaoAtiva');
      }, 0);
      
      // ✅ Logout do Supabase com timeout
      try {
        await withTimeout(supabase.auth.signOut(), 2000);
      } catch (timeoutError) {
        console.warn('Timeout no logout do Supabase, prosseguindo...');
      }
      
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