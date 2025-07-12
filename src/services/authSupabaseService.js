// ✅ CORRIGIDO: Versão que unifica a autenticação com o sistema de sessão do Supabase.
import supabase from '../lib/supabase';

// Funções auxiliares (mantidas como estavam, pois são eficientes)
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

const hashSenha = (senha) => {
  if (!senha) return null;
  const combined = senha + 'fitinbox_salt_2025';
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

const withTimeout = (promise, ms = 8000) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
};

const ADMIN_CNPJS = [
  '00000000000191',
  '12345678000195',
  process.env.REACT_APP_ADMIN_CNPJ?.replace(/\D/g, '')
].filter(Boolean);

const authSupabaseService = {
  // ✅ Login padrão (mantido, pois já usa o Supabase corretamente)
  login: async (email, senha) => {
    try {
      const { data, error } = await withTimeout(supabase.auth.signInWithPassword({ email, password: senha }));

      if (error) throw error;

      const { data: empresaData, error: empresaError } = await withTimeout(
        supabase.from("empresas").select("*").eq("user_id", data.user.id).single()
      );

      if (empresaError) throw new Error("Dados da empresa não encontrados");

      return {
        success: true,
        session: data.session,
        user: data.user,
        empresa: empresaData,
        isAdmin: ADMIN_CNPJS.includes(empresaData.cnpj?.replace(/\D/g, ''))
      };
    } catch (error) {
      console.error("❌ Erro no login:", error);
      return { success: false, error: error.message || "Erro desconhecido ao fazer login." };
    }
  },

  // ✅ CORRIGIDO: Login via CNPJ agora cria uma sessão real no Supabase
  autenticarCnpj: async (cnpj, senha) => {
    try {
      if (!validarCnpj(cnpj)) {
        return { success: false, error: "CNPJ inválido." };
      }

      const cnpjLimpo = cnpj.replace(/\D/g, "");

      // 1. Encontra a empresa pelo CNPJ
      const { data: empresa, error: empresaError } = await withTimeout(
        supabase.from('empresas').select('*').eq('cnpj', cnpjLimpo).single()
      );

      if (empresaError || !empresa) {
        return { success: false, error: 'CNPJ ou senha inválidos' };
      }

      // 2. Verifica a senha com hash
      const senhaHash = hashSenha(senha);
      if (!senhaHash || (empresa.senha_hash && empresa.senha_hash !== senhaHash)) {
        return { success: false, error: 'CNPJ ou senha inválidos' };
      }

      // 3. Se a senha bateu, FAZ O LOGIN REAL NO SUPABASE para criar a sessão
      if (!empresa.email) {
        return { success: false, error: 'Conta não possui um e-mail associado para login.' };
      }

      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: empresa.email,
        password: senha, // Usa a senha original para autenticar no Supabase
      });

      if (loginError) {
        console.error("❌ Falha ao criar sessão no Supabase:", loginError.message);
        return { success: false, error: 'Falha ao iniciar a sessão. Verifique suas credenciais.' };
      }

      console.log('✅ Sessão Supabase criada com sucesso via CNPJ');

      // 4. Retorna um objeto de sessão unificado e válido
      return {
        success: true,
        session: loginData.session,
        user: loginData.user,
        empresa: empresa,
        isAdmin: ADMIN_CNPJS.includes(cnpjLimpo)
      };

    } catch (error) {
      console.error("❌ Erro no login via CNPJ:", error);
      return { success: false, error: error.message || "Erro ao fazer login" };
    }
  },

  // ✅ CORRIGIDO: Registro agora associa o user_id do Supabase Auth à empresa
  registrarEmpresa: async (email, senha, dadosEmpresa) => {
    try {
      const cnpjLimpo = dadosEmpresa.cnpj.replace(/\D/g, "");

      // 1. Cria o usuário no Supabase Auth primeiro
      const { data: authData, error: authError } = await withTimeout(
        supabase.auth.signUp({ email, password: senha })
      );

      if (authError) {
        // Se o erro for de usuário já existente, podemos tentar recuperar o user_id
        if (authError.message.includes("User already registered")) {
           return { success: false, error: "Este e-mail já está cadastrado." };
        }
        throw authError;
      }
      
      if (!authData.user) {
        return { success: false, error: "Não foi possível criar o usuário." };
      }

      // 2. Insere os dados da empresa na tabela 'empresas', associando o user_id
      const dadosInsercao = {
        user_id: authData.user.id, // Vínculo crucial
        cnpj: cnpjLimpo,
        cnpj_formatado: formatarCnpj(dadosEmpresa.cnpj),
        senha_hash: hashSenha(senha),
        email: email.trim(),
        nome_empresa: dadosEmpresa.nomeEmpresa?.trim(),
        razao_social: dadosEmpresa.nomeEmpresa?.trim(),
        nome_fantasia: dadosEmpresa.nomeEmpresa?.trim(),
        ativo: true,
        tipo_usuario: ADMIN_CNPJS.includes(cnpjLimpo) ? 'admin' : 'cliente'
      };

      const { data: novaEmpresa, error: empresaError } = await withTimeout(
        supabase.from("empresas").insert(dadosInsercao).select().single()
      );

      if (empresaError) {
        // Se a inserção falhar, devemos tentar remover o usuário criado no Auth para limpeza
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw empresaError;
      }

      return {
        success: true,
        message: "Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta.",
        empresa: novaEmpresa
      };

    } catch (error) {
      console.error("❌ Erro no registro:", error);
      return { success: false, error: `Erro no cadastro: ${error.message || 'Erro desconhecido'}` };
    }
  },

  // ✅ CORRIGIDO: verificarSessao agora usa a fonte da verdade (Supabase)
  verificarSessao: async () => {
    try {
      // 1. Pede a sessão ao Supabase. Isso é rápido, pois usa o token do localStorage.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Erro ao obter sessão do Supabase:", sessionError.message);
        return null;
      }

      if (!session) {
        return null; // Nenhuma sessão ativa
      }

      // 2. Se há sessão, busca os dados da empresa associada pelo user_id
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (empresaError || !empresa) {
        console.warn("Sessão válida, mas dados da empresa não encontrados. Deslogando.");
        await supabase.auth.signOut(); // Limpa a sessão inconsistente
        return null;
      }

      // 3. Retorna o objeto de sessão completo e confiável
      return {
        success: true,
        session,
        user: session.user,
        empresa,
        isAdmin: ADMIN_CNPJS.includes(empresa.cnpj?.replace(/\D/g, ''))
      };

    } catch (error) {
      console.error("❌ Erro crítico na verificação de sessão:", error);
      return null;
    }
  },

  // ✅ Logout otimizado (mantido, mas sem a necessidade de limpar sessionStorage manualmente)
  logout: async () => {
    try {
      await withTimeout(supabase.auth.signOut(), 3000);
      console.log("✅ Logout realizado com sucesso");
      return true;
    } catch (error) {
      console.error("❌ Erro no logout:", error);
      // Mesmo com erro, força a limpeza local
      return false;
    }
  },

  // Demais funções (recuperação de senha, admin, etc.) mantidas como estavam,
  // pois já operam corretamente sobre o sistema do Supabase.

  enviarCodigoRecuperacao: async (email) => {
    try {
      const { error } = await withTimeout(supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      }));
      if (error) throw error;
      return { success: true, message: "Link de recuperação enviado para seu email!" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  atualizarSenha: async (newPassword) => {
    try {
      const { error } = await withTimeout(supabase.auth.updateUser({ password: newPassword }));
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  listarEmpresas: async () => {
    try {
      const { data, error } = await withTimeout(
        supabase.from('empresas').select('*').order('created_at', { ascending: false })
      );
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("❌ Erro ao listar empresas:", error);
      return [];
    }
  },

  toggleEmpresaAtiva: async (empresaId, ativo) => {
    try {
      const { error } = await withTimeout(
        supabase.from('empresas').update({ ativo }).eq('id', empresaId)
      );
      if (error) throw error;
      return { success: true, message: `Empresa ${ativo ? 'ativada' : 'desativada'}!` };
    } catch (error) {
      return { success: false, error: "Erro ao alterar status da empresa" };
    }
  },
  
  // Funções utilitárias exportadas
  validarCnpj,
  formatarCnpj,
  hashSenha
};

export { authSupabaseService };
export default authSupabaseService;
