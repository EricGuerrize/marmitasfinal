// src/services/authSupabaseService.js

// Funções auxiliares fora do objeto para evitar problemas com 'this'
const validarCnpj = (cnpj) => {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  
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
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  return cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

const getEmpresasDatabase = () => {
  try {
    const empresas = localStorage.getItem('empresasDatabase');
    return empresas ? JSON.parse(empresas) : [];
  } catch (error) {
    console.error('Erro ao acessar banco de empresas:', error);
    return [];
  }
};

const saveEmpresasDatabase = (empresas) => {
  try {
    localStorage.setItem('empresasDatabase', JSON.stringify(empresas));
    return true;
  } catch (error) {
    console.error('Erro ao salvar banco de empresas:', error);
    return false;
  }
};

const buscarEmpresaPorCnpj = (cnpj) => {
  const empresas = getEmpresasDatabase();
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  return empresas.find(empresa => empresa.cnpj === cnpjLimpo);
};

const buscarDadosReceita = async (cnpj) => {
  console.log('🔍 Buscando dados na Receita Federal para:', cnpj);
  
  // Simula delay da API
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Dados simulados baseados no CNPJ
  const dadosSimulados = {
    '12345678000123': {
      razao_social: 'EMPRESA TESTE LTDA',
      nome_fantasia: 'Empresa Teste',
      situacao: 'ATIVA',
      telefone: '(11) 99999-9999'
    },
    '98765432000100': {
      razao_social: 'COMERCIO DE ALIMENTOS LTDA',
      nome_fantasia: 'Alimentos & Cia',
      situacao: 'ATIVA',
      telefone: '(11) 88888-8888'
    },
    '05336475000177': {
      razao_social: 'H AZEVEDO DE ABREU',
      nome_fantasia: 'H Azevedo',
      situacao: 'ATIVA',
      telefone: '(21) 77777-7777'
    }
  };
  
  // Se tem dados específicos, usa eles
  if (dadosSimulados[cnpj]) {
    return dadosSimulados[cnpj];
  }
  
  // Senão, gera dados genéricos baseados no CNPJ
  const nomes = [
    'COMERCIO', 'INDUSTRIA', 'SERVICOS', 'ALIMENTOS', 'TECNOLOGIA',
    'CONSULTORIA', 'LOGISTICA', 'MARKETING', 'CONSTRUCAO', 'EDUCACAO'
  ];
  
  const tipos = ['LTDA', 'EIRELI', 'SA', 'ME', 'EPP'];
  
  const randomNome = nomes[parseInt(cnpj.substring(0, 2)) % nomes.length];
  const randomTipo = tipos[parseInt(cnpj.substring(12, 14)) % tipos.length];
  
  return {
    razao_social: `${randomNome} E PARTICIPACOES ${randomTipo}`,
    nome_fantasia: `${randomNome.toLowerCase().replace(/^\w/, c => c.toUpperCase())} ${randomTipo}`,
    situacao: 'ATIVA',
    telefone: `(11) 9${cnpj.substring(0, 4)}-${cnpj.substring(4, 8)}`
  };
};

// Objeto principal
export const authSupabaseService = {
  // Verifica se existe sessão ativa
  verificarSessao: () => {
    try {
      const session = sessionStorage.getItem('userSession');
      if (!session) return false;
      
      const parsed = JSON.parse(session);
      const now = Date.now();
      
      // Verifica se a sessão não expirou (24 horas)
      if (now > parsed.expiresAt) {
        sessionStorage.removeItem('userSession');
        return false;
      }
      
      return parsed;
    } catch (error) {
      console.warn('Erro ao verificar sessão:', error);
      return false;
    }
  },

  // Autenticar usuário
  autenticar: async (cnpj, senha) => {
    try {
      console.log('🔐 Iniciando autenticação para CNPJ:', cnpj);
      
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Remove formatação do CNPJ
      const cnpjLimpo = cnpj.replace(/\D/g, '');
      
      // Validações básicas
      if (!validarCnpj(cnpjLimpo)) {
        return {
          success: false,
          error: 'CNPJ inválido'
        };
      }
      
      if (!senha || senha.length < 6) {
        return {
          success: false,
          error: 'Senha deve ter pelo menos 6 caracteres'
        };
      }
      
      // Busca empresa no banco de dados mock
      const empresa = buscarEmpresaPorCnpj(cnpjLimpo);
      
      if (!empresa) {
        return {
          success: false,
          error: 'CNPJ não cadastrado. Faça seu cadastro primeiro.'
        };
      }

      if (!empresa.ativo) {
        return {
          success: false,
          error: 'Empresa desativada. Entre em contato com o suporte.'
        };
      }
      
      // Verifica senha (em produção, use hash)
      if (empresa.senha !== senha) {
        // Incrementa tentativas de login inválidas
        empresa.tentativas_login = (empresa.tentativas_login || 0) + 1;
        empresa.ultimo_acesso_tentativa = new Date().toISOString();
        
        // Salva no banco
        const empresas = getEmpresasDatabase();
        const index = empresas.findIndex(e => e.cnpj === cnpjLimpo);
        if (index >= 0) {
          empresas[index] = empresa;
          saveEmpresasDatabase(empresas);
        }
        
        return {
          success: false,
          error: 'Senha incorreta'
        };
      }
      
      // Login bem-sucedido - atualiza dados da empresa
      empresa.ultimo_acesso = new Date().toISOString();
      empresa.tentativas_login = 0;
      
      // Salva no banco
      const empresas = getEmpresasDatabase();
      const index = empresas.findIndex(e => e.cnpj === cnpjLimpo);
      if (index >= 0) {
        empresas[index] = empresa;
        saveEmpresasDatabase(empresas);
      }
      
      // Cria sessão
      const sessionData = {
        id: empresa.id,
        cnpj: cnpjLimpo,
        cnpjFormatado: formatarCnpj(cnpjLimpo),
        razaoSocial: empresa.razao_social,
        nomeFantasia: empresa.nome_fantasia,
        nomeEmpresa: empresa.nome_empresa,
        email: empresa.email,
        loginTime: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
      };
      
      sessionStorage.setItem('userSession', JSON.stringify(sessionData));
      
      // Salva informações para uso em outras páginas
      sessionStorage.setItem('cnpj', formatarCnpj(cnpjLimpo));
      if (empresa.nome_empresa) {
        sessionStorage.setItem('nomeEmpresa', empresa.nome_empresa);
      }
      if (empresa.razao_social) {
        sessionStorage.setItem('empresaInfo', empresa.razao_social);
      }
      
      console.log('✅ Login realizado com sucesso');
      return {
        success: true,
        empresa: sessionData
      };
        
    } catch (error) {
      console.error('❌ Erro na autenticação:', error);
      return {
        success: false,
        error: 'Erro de conexão. Tente novamente.'
      };
    }
  },

  // Registrar nova empresa
  registrarEmpresa: async (cnpj, senha, dadosEmpresa) => {
    try {
      console.log('📝 Iniciando cadastro para CNPJ:', cnpj);
      
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Remove formatação do CNPJ
      const cnpjLimpo = cnpj.replace(/\D/g, '');
      
      // Validações
      if (!validarCnpj(cnpjLimpo)) {
        return {
          success: false,
          error: 'CNPJ inválido. Verifique os números digitados.'
        };
      }
      
      if (!senha || senha.length < 6) {
        return {
          success: false,
          error: 'Senha deve ter pelo menos 6 caracteres'
        };
      }
      
      // Verifica se CNPJ já existe
      const empresaExistente = buscarEmpresaPorCnpj(cnpjLimpo);
      if (empresaExistente) {
        return {
          success: false,
          error: 'CNPJ já cadastrado. Tente fazer login ou recuperar a senha.'
        };
      }
      
      // Busca dados da empresa via API da Receita Federal (simulado)
      const dadosReceita = await buscarDadosReceita(cnpjLimpo);
      
      // Cria nova empresa
      const novaEmpresa = {
        id: Date.now(),
        cnpj: cnpjLimpo,
        cnpj_formatado: formatarCnpj(cnpjLimpo),
        senha: senha, // Em produção, use hash
        razao_social: dadosReceita.razao_social,
        nome_fantasia: dadosReceita.nome_fantasia,
        nome_empresa: dadosEmpresa.nomeEmpresa || dadosReceita.nome_fantasia || dadosReceita.razao_social,
        email: dadosEmpresa.email || null,
        telefone: dadosReceita.telefone || null,
        situacao: dadosReceita.situacao || 'ATIVA',
        ativo: true,
        data_cadastro: new Date().toISOString(),
        ultimo_acesso: null,
        tentativas_login: 0
      };
      
      // Salva no banco de dados mock
      const empresas = getEmpresasDatabase();
      empresas.push(novaEmpresa);
      
      const salvou = saveEmpresasDatabase(empresas);
      
      if (!salvou) {
        return {
          success: false,
          error: 'Erro ao salvar cadastro. Tente novamente.'
        };
      }
      
      console.log('✅ Cadastro realizado com sucesso para:', novaEmpresa.razao_social);
      return {
        success: true,
        message: 'Empresa cadastrada com sucesso!',
        empresa: {
          cnpj: cnpjLimpo,
          razaoSocial: novaEmpresa.razao_social,
          nomeEmpresa: novaEmpresa.nome_empresa
        }
      };
        
    } catch (error) {
      console.error('❌ Erro no cadastro:', error);
      return {
        success: false,
        error: 'Erro de conexão. Tente novamente.'
      };
    }
  },

  // Logout
  logout: () => {
    try {
      sessionStorage.removeItem('userSession');
      sessionStorage.removeItem('nomeEmpresa');
      sessionStorage.removeItem('empresaInfo');
      sessionStorage.removeItem('cnpj');
      localStorage.removeItem('loginBlock');
      console.log('🚪 Logout realizado');
      return true;
    } catch (error) {
      console.warn('Erro no logout:', error);
      return false;
    }
  },

  // Sistema de recuperação de senha por email
  enviarCodigoRecuperacao: async (email) => {
    try {
      console.log('📧 Enviando código de recuperação para:', email);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Busca empresa por email
      const empresas = getEmpresasDatabase();
      const empresa = empresas.find(e => e.email && e.email.toLowerCase() === email.toLowerCase());
      
      if (!empresa) {
        return {
          success: false,
          error: 'Email não encontrado em nossos registros.'
        };
      }
      
      // Gera código de 6 dígitos
      const codigo = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Salva código temporariamente (em produção, salvaria no banco com expiração)
      const codigoData = {
        email: email,
        codigo: codigo,
        cnpj: empresa.cnpj,
        gerado: Date.now(),
        usado: false
      };
      
      sessionStorage.setItem('codigoRecuperacao', JSON.stringify(codigoData));
      
      console.log('✅ Código de recuperação gerado:', codigo);
      
      return {
        success: true,
        message: 'Código enviado para seu email!',
        codigo: codigo // Em produção, não retornaria o código
      };
      
    } catch (error) {
      console.error('❌ Erro ao enviar código:', error);
      return {
        success: false,
        error: 'Erro ao enviar código. Tente novamente.'
      };
    }
  },

  // Confirmar código e alterar senha
  confirmarCodigoEAlterarSenha: async (email, codigo, novaSenha) => {
    try {
      console.log('🔑 Confirmando código para alterar senha');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Recupera código salvo
      const codigoSalvo = sessionStorage.getItem('codigoRecuperacao');
      if (!codigoSalvo) {
        return {
          success: false,
          error: 'Código expirado. Solicite um novo código.'
        };
      }
      
      const codigoData = JSON.parse(codigoSalvo);
      
      // Valida código
      if (codigoData.email !== email || 
          codigoData.codigo !== codigo || 
          codigoData.usado ||
          Date.now() - codigoData.gerado > 15 * 60 * 1000) { // 15 minutos
        return {
          success: false,
          error: 'Código inválido ou expirado.'
        };
      }
      
      // Atualiza senha da empresa
      const empresas = getEmpresasDatabase();
      const empresaIndex = empresas.findIndex(e => e.cnpj === codigoData.cnpj);
      
      if (empresaIndex === -1) {
        return {
          success: false,
          error: 'Empresa não encontrada.'
        };
      }
      
      empresas[empresaIndex].senha = novaSenha; // Em produção, use hash
      empresas[empresaIndex].tentativas_login = 0;
      
      saveEmpresasDatabase(empresas);
      
      // Marca código como usado
      codigoData.usado = true;
      sessionStorage.setItem('codigoRecuperacao', JSON.stringify(codigoData));
      
      console.log('✅ Senha alterada com sucesso');
      
      return {
        success: true,
        message: 'Senha alterada com sucesso!'
      };
      
    } catch (error) {
      console.error('❌ Erro ao alterar senha:', error);
      return {
        success: false,
        error: 'Erro ao alterar senha. Tente novamente.'
      };
    }
  },

  // Utilitário para mascarar email
  mascarEmail: (email) => {
    if (!email || !email.includes('@')) return email;
    
    const [usuario, dominio] = email.split('@');
    const usuarioMascarado = usuario.length > 3 
      ? usuario.substring(0, 2) + '*'.repeat(usuario.length - 3) + usuario.slice(-1)
      : usuario.substring(0, 1) + '*'.repeat(usuario.length - 1);
    
    return `${usuarioMascarado}@${dominio}`;
  },

  // Listar empresas (para admin)
  listarEmpresas: async () => {
    try {
      const empresas = getEmpresasDatabase();
      return empresas.map(empresa => ({
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
        data_cadastro: empresa.data_cadastro,
        ultimo_acesso: empresa.ultimo_acesso,
        tentativas_login: empresa.tentativas_login || 0
      }));
    } catch (error) {
      console.error('Erro ao listar empresas:', error);
      return [];
    }
  },

  // Ativar/desativar empresa (para admin)
  toggleEmpresaAtiva: async (empresaId, ativo) => {
    try {
      const empresas = getEmpresasDatabase();
      const empresaIndex = empresas.findIndex(e => e.id === empresaId);
      
      if (empresaIndex === -1) {
        return {
          success: false,
          error: 'Empresa não encontrada'
        };
      }
      
      empresas[empresaIndex].ativo = ativo;
      saveEmpresasDatabase(empresas);
      
      return {
        success: true,
        message: `Empresa ${ativo ? 'ativada' : 'desativada'} com sucesso!`
      };
      
    } catch (error) {
      console.error('Erro ao alterar status da empresa:', error);
      return {
        success: false,
        error: 'Erro ao alterar status da empresa'
      };
    }
  },

  // Funções utilitárias também expostas no objeto para compatibilidade
  validarCnpj: validarCnpj,
  formatarCnpj: formatarCnpj,

  // Obter dados da sessão atual
  obterSessao: () => {
    try {
      const session = sessionStorage.getItem('userSession');
      if (!session) return null;
      
      return JSON.parse(session);
    } catch (error) {
      console.warn('Erro ao obter sessão:', error);
      return null;
    }
  }
};