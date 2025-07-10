import { createClient } from '@supabase/supabase-js';

// ✅ CORRETO - usar variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anon key must be provided via environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Funções auxiliares
const validarCnpj = (cnpj) => {
  const cnpjLimpo = cnpj.replace(/\D/g, "");

  if (cnpjLimpo.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cnpjLimpo)) return false;

  // Validação dos dígitos verificadores
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
  return cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, 
    "$1.$2.$3/$4-$5"
  );
};

export const authSupabaseService = {
  // ✅ NOVA FUNÇÃO: Autenticar via CNPJ + Senha (para admin)
  autenticarCnpj: async (cnpj, senha) => {
    try {
      console.log("🔐 Iniciando autenticação via CNPJ:", cnpj);
      
      const cnpjLimpo = cnpj.replace(/\D/g, "");
      
      // Buscar empresa por CNPJ
      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .select("*")
        .eq("cnpj", cnpjLimpo)
        .single();

      if (empresaError || !empresaData) {
        console.error("❌ CNPJ não encontrado:", empresaError?.message);
        return {
          success: false,
          error: "CNPJ não cadastrado",
        };
      }

      // Verificar senha usando bcrypt
      const { data: senhaValida, error: senhaError } = await supabase.rpc(
        'verificar_senha', 
        { 
          senha_input: senha,
          senha_hash: empresaData.senha_hash 
        }
      );

      if (senhaError || !senhaValida) {
        console.error("❌ Senha inválida:", senhaError?.message);
        return {
          success: false,
          error: "Senha incorreta",
        };
      }

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
        loginTime: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 horas
      };

      // Armazenar sessão
      sessionStorage.setItem("userSession", JSON.stringify(sessionData));
      sessionStorage.setItem("cnpj", empresaData.cnpj_formatado);
      sessionStorage.setItem("nomeEmpresa", empresaData.nome_empresa);

      console.log("✅ Login via CNPJ realizado com sucesso");
      return {
        success: true,
        empresa: sessionData,
      };

    } catch (error) {
      console.error("❌ Erro geral na autenticação via CNPJ:", error);
      return {
        success: false,
        error: "Erro de conexão. Tente novamente.",
      };
    }
  },

  // Autenticar usuário via email (mantido para clientes normais)
  autenticar: async (email, senha) => {
    try {
      console.log("🔐 Iniciando autenticação para email:", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: senha,
      });

      if (error) {
        console.error("❌ Erro de autenticação Supabase:", error.message);
        return {
          success: false,
          error: error.message || "Erro na autenticação. Verifique suas credenciais.",
        };
      }

      if (data.user) {
        // Buscar dados adicionais da tabela 'empresas'
        const { data: empresaData, error: empresaError } = await supabase
          .from("empresas")
          .select("*, tipo_usuario")
          .eq("user_id", data.user.id)
          .single();

        if (empresaError) {
          console.error("❌ Erro ao buscar dados da empresa:", empresaError.message);
          return {
            success: false,
            error: "Usuário autenticado, mas dados da empresa não encontrados.",
          };
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
          loginTime: Date.now(),
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 horas
        };

        // Armazenar sessão
        sessionStorage.setItem("userSession", JSON.stringify(sessionData));

        console.log("✅ Login realizado com sucesso");
        return {
          success: true,
          empresa: sessionData,
        };
      } else {
        return {
          success: false,
          error: "Nenhum usuário retornado após autenticação.",
        };
      }
    } catch (error) {
      console.error("❌ Erro geral na autenticação:", error);
      return {
        success: false,
        error: "Erro de conexão. Tente novamente.",
      };
    }
  },

  // Registrar nova empresa (mantido)
  registrarEmpresa: async (email, senha, dadosEmpresa) => {
    try {
      console.log("📝 Iniciando cadastro para email:", email);

      // 1. Registrar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: senha,
      });

      if (authError) {
        console.error("❌ Erro no registro de autenticação Supabase:", authError.message);
        return {
          success: false,
          error: authError.message || "Erro no registro. Tente novamente.",
        };
      }

      if (authData.user) {
        // 2. Inserir dados da empresa na tabela 'empresas'
        const { data: empresaInsertData, error: empresaInsertError } = await supabase
          .from("empresas")
          .insert([
            {
              user_id: authData.user.id,
              cnpj: dadosEmpresa.cnpj.replace(/\D/g, ""),
              cnpj_formatado: formatarCnpj(dadosEmpresa.cnpj),
              email: email,
              nome_empresa: dadosEmpresa.nomeEmpresa || dadosEmpresa.nomeFantasia || dadosEmpresa.razaoSocial,
              razao_social: dadosEmpresa.razaoSocial,
              nome_fantasia: dadosEmpresa.nomeFantasia,
              telefone: dadosEmpresa.telefone,
              situacao: dadosEmpresa.situacao || "ATIVA",
              tipo_usuario: dadosEmpresa.tipoUsuario || "cliente",
              ativo: true,
              email_confirmado: authData.user.email_confirmed_at ? true : false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);

        if (empresaInsertError) {
          console.error("❌ Erro ao inserir dados da empresa:", empresaInsertError.message);
          return {
            success: false,
            error: "Erro ao salvar dados da empresa. Tente novamente.",
          };
        }

        console.log("✅ Cadastro realizado com sucesso para:", email);
        return {
          success: true,
          message: "Empresa cadastrada com sucesso!",
          empresa: {
            id: authData.user.id,
            email: email,
            cnpj: dadosEmpresa.cnpj,
            razaoSocial: dadosEmpresa.razaoSocial,
            nomeEmpresa: dadosEmpresa.nomeEmpresa,
            tipoUsuario: dadosEmpresa.tipoUsuario || "cliente",
          },
        };
      } else {
        return {
          success: false,
          error: "Nenhum usuário retornado após o registro.",
        };
      }
    } catch (error) {
      console.error("❌ Erro geral no registro:", error);
      return {
        success: false,
        error: "Erro de conexão. Tente novamente.",
      };
    }
  },

  // ✅ CORRIGIDO: Verifica sessão (funciona com sessão salva)
  verificarSessao: async () => {
    try {
      // Primeiro verifica se tem sessão salva
      const sessaoSalva = sessionStorage.getItem("userSession");
      if (sessaoSalva) {
        const sessionData = JSON.parse(sessaoSalva);
        
        // Verifica se não expirou
        if (sessionData.expiresAt && Date.now() < sessionData.expiresAt) {
          return sessionData;
        }
      }

      // Se não tem sessão salva, verifica Auth do Supabase
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("❌ Erro ao obter sessão Supabase:", error.message);
        return null;
      }

      if (session && session.user) {
        // Buscar dados adicionais da tabela 'empresas'
        const { data: empresaData, error: empresaError } = await supabase
          .from("empresas")
          .select("*, tipo_usuario")
          .eq("user_id", session.user.id)
          .single();

        if (empresaError) {
          console.error("❌ Erro ao buscar dados da empresa na sessão:", empresaError.message);
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
          loginTime: Date.now(),
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 horas
        };
        
        sessionStorage.setItem("userSession", JSON.stringify(sessionData));
        return sessionData;
      }
      return null;
    } catch (error) {
      console.warn("Erro ao verificar sessão:", error);
      return null;
    }
  },

  // Logout (mantido)
  logout: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("❌ Erro no logout Supabase:", error.message);
      }
      
      // Limpar todos os dados de sessão
      sessionStorage.removeItem("userSession");
      sessionStorage.removeItem("nomeEmpresa");
      sessionStorage.removeItem("empresaInfo");
      sessionStorage.removeItem("cnpj");
      localStorage.removeItem("loginBlock");
      
      console.log("🚪 Logout realizado");
      return true;
    } catch (error) {
      console.warn("Erro no logout:", error);
      return false;
    }
  },

  // Funções utilitárias
  validarCnpj: validarCnpj,
  formatarCnpj: formatarCnpj,

  // Demais funções mantidas...
  obterSessao: async () => {
    return await authSupabaseService.verificarSessao();
  },

  listarEmpresas: async () => {
    try {
      const { data, error } = await supabase.from("empresas").select("*");
      if (error) {
        console.error("Erro ao listar empresas:", error.message);
        return [];
      }
      return data.map(empresa => ({
        id: empresa.id,
        cnpj: empresa.cnpj,
        cnpj_formatado: empresa.cnpj_formatado,
        razao_social: empresa.razao_social,
        nome_fantasia: empresa.nome_fantasia,
        nome_empresa: empresa.nome_empresa,
        email: empresa.email,
        telefone: empresa.telefone,
        situacao: empresa.situacao,
        ativo: empresa.ativo,
        data_cadastro: empresa.created_at,
        ultimo_acesso: empresa.ultimo_acesso,
        tentativas_login: empresa.tentativas_login || 0,
        tipo_usuario: empresa.tipo_usuario,
      }));
    } catch (error) {
      console.error("Erro ao listar empresas:", error);
      return [];
    }
  },

  toggleEmpresaAtiva: async (empresaId, ativo) => {
    try {
      const { data, error } = await supabase
        .from("empresas")
        .update({ ativo: ativo, updated_at: new Date().toISOString() })
        .eq("id", empresaId);

      if (error) {
        console.error("Erro ao alterar status da empresa:", error.message);
        return {
          success: false,
          error: "Erro ao alterar status da empresa",
        };
      }

      return {
        success: true,
        message: `Empresa ${ativo ? "ativada" : "desativada"} com sucesso!`,
      };
    } catch (error) {
      console.error("Erro ao alterar status da empresa:", error);
      return {
        success: false,
        error: "Erro ao alterar status da empresa",
      };
    }
  },

  enviarCodigoRecuperacao: async (email) => {
    try {
      console.log("📧 Enviando código de recuperação para:", email);
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, { 
        redirectTo: window.location.origin + '/update-password'
      });

      if (error) {
        console.error("❌ Erro ao enviar código de recuperação Supabase:", error.message);
        return {
          success: false,
          error: error.message || "Erro ao enviar código. Verifique o email.",
        };
      }

      console.log("✅ Link de recuperação enviado para o email:", email);
      return {
        success: true,
        message: "Link de recuperação enviado para seu email!",
      };
    } catch (error) {
      console.error("❌ Erro geral ao enviar código:", error);
      return {
        success: false,
        error: "Erro de conexão. Tente novamente.",
      };
    }
  },
};