// src/services/authSupabaseService.js

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
        
        return true;
      } catch (error) {
        console.warn('Erro ao verificar sessão:', error);
        return false;
      }
    },
  
    // Autenticar usuário
    autenticar: async (cnpj, senha) => {
      try {
        console.log('Iniciando autenticação para CNPJ:', cnpj);
        
        // Simula delay de rede
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Remove formatação do CNPJ
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        
        // Validações básicas
        if (!cnpjLimpo || cnpjLimpo.length !== 14) {
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
        
        // Simula autenticação - aceita qualquer CNPJ válido
        const isValidLogin = await this.mockAuthentication(cnpjLimpo, senha);
        
        if (isValidLogin.success) {
          // Cria sessão
          const sessionData = {
            cnpj: cnpjLimpo,
            empresa: isValidLogin.empresa,
            loginTime: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
          };
          
          sessionStorage.setItem('userSession', JSON.stringify(sessionData));
          
          console.log('Login realizado com sucesso');
          return {
            success: true,
            empresa: isValidLogin.empresa
          };
        }
        
        return {
          success: false,
          error: 'CNPJ ou senha incorretos'
        };
        
      } catch (error) {
        console.error('Erro na autenticação:', error);
        return {
          success: false,
          error: 'Erro de conexão. Tente novamente.'
        };
      }
    },
  
    // Registrar nova empresa
    registrarEmpresa: async (cnpj, senha, dadosEmpresa) => {
      try {
        console.log('Iniciando cadastro para CNPJ:', cnpj);
        
        // Simula delay de rede
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Remove formatação do CNPJ
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        
        // Validações
        if (!cnpjLimpo || cnpjLimpo.length !== 14) {
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
        
        // Verifica se CNPJ já existe
        const existingCompany = await this.checkExistingCompany(cnpjLimpo);
        if (existingCompany) {
          return {
            success: false,
            error: 'CNPJ já cadastrado. Tente fazer login.'
          };
        }
        
        // Simula cadastro
        const registrationResult = await this.mockRegistration(cnpjLimpo, senha, dadosEmpresa);
        
        if (registrationResult.success) {
          console.log('Cadastro realizado com sucesso');
          return {
            success: true,
            message: 'Empresa cadastrada com sucesso!'
          };
        }
        
        return {
          success: false,
          error: registrationResult.error || 'Erro no cadastro'
        };
        
      } catch (error) {
        console.error('Erro no cadastro:', error);
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
        localStorage.removeItem('loginBlock');
        return true;
      } catch (error) {
        console.warn('Erro no logout:', error);
        return false;
      }
    },
  
    // Recuperar senha
    recuperarSenha: async (cnpj) => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        
        if (!cnpjLimpo || cnpjLimpo.length !== 14) {
          return {
            success: false,
            error: 'CNPJ inválido'
          };
        }
        
        // Simula envio de email de recuperação
        return {
          success: true,
          message: 'Se o CNPJ estiver cadastrado, você receberá um email com instruções para redefinir sua senha.'
        };
        
      } catch (error) {
        console.error('Erro na recuperação:', error);
        return {
          success: false,
          error: 'Erro de conexão. Tente novamente.'
        };
      }
    },
  
    // Mock de autenticação (substitua por integração real)
    mockAuthentication: async (cnpj, senha) => {
      console.log('Mock authentication para:', cnpj);
      
      // CNPJs de teste
      const testAccounts = {
        '12345678000123': {
          senha: '123456',
          empresa: {
            nomeEmpresa: 'Empresa Teste Ltda',
            email: 'teste@empresa.com'
          }
        },
        '98765432000100': {
          senha: 'senha123',
          empresa: {
            nomeEmpresa: 'Outra Empresa Ltda',
            email: 'contato@outraempresa.com'
          }
        }
      };
      
      const account = testAccounts[cnpj];
      
      if (account && account.senha === senha) {
        return {
          success: true,
          empresa: account.empresa
        };
      }
      
      // Para outros CNPJs, aceita qualquer senha com pelo menos 6 caracteres
      if (senha.length >= 6) {
        return {
          success: true,
          empresa: {
            nomeEmpresa: 'Empresa Demo',
            email: null
          }
        };
      }
      
      return {
        success: false
      };
    },
  
    // Mock de verificação de empresa existente
    checkExistingCompany: async (cnpj) => {
      console.log('Verificando se empresa existe:', cnpj);
      
      // Simula alguns CNPJs que já existem
      const existingCNPJs = ['11111111111111', '22222222222222'];
      return existingCNPJs.includes(cnpj);
    },
  
    // Mock de registro
    mockRegistration: async (cnpj, senha, dadosEmpresa) => {
      console.log('Mock registration para:', cnpj, dadosEmpresa);
      
      // Simula alguns CNPJs que falham no cadastro
      const failureCNPJs = ['00000000000000', '99999999999999'];
      
      if (failureCNPJs.includes(cnpj)) {
        return {
          success: false,
          error: 'CNPJ inválido ou não encontrado na Receita Federal'
        };
      }
      
      return {
        success: true
      };
    },
  
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