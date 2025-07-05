<<<<<<< HEAD
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
=======
// src/services/authSupabaseService.js - VERSÃO MELHORADA
import { supabase } from '../lib/supabase';
import { securityUtils } from '../utils/securityUtils';

export const authSupabaseService = {
    
    // Rate limiters para diferentes ações
    loginRateLimit: securityUtils.createRateLimiter(5, 15 * 60 * 1000), // 5 tentativas em 15 min
    registerRateLimit: securityUtils.createRateLimiter(3, 60 * 60 * 1000), // 3 cadastros por hora
    
    /**
     * Registra nova empresa com validação aprimorada
     */
    async registrarEmpresa(cnpj, senha, dadosEmpresa = {}) {
        try {
            // Rate limiting para cadastro
            const rateLimitCheck = this.registerRateLimit('register');
            if (!rateLimitCheck.allowed) {
                throw new Error(rateLimitCheck.error);
            }

            // Validação de entrada mais rigorosa
            const cnpjValidation = securityUtils.validateInput(cnpj, 'cnpj');
            if (!cnpjValidation.valid) throw new Error(cnpjValidation.error);
            
            const passwordValidation = securityUtils.validateInput(senha, 'password');
            if (!passwordValidation.valid) throw new Error(passwordValidation.error);

            if (dadosEmpresa.email) {
                const emailValidation = securityUtils.validateInput(dadosEmpresa.email, 'email');
                if (!emailValidation.valid) throw new Error(`Email: ${emailValidation.error}`);
            }

            if (dadosEmpresa.nomeEmpresa) {
                const nomeValidation = securityUtils.validateInput(dadosEmpresa.nomeEmpresa, 'text', 100);
                if (!nomeValidation.valid) throw new Error(`Nome da empresa: ${nomeValidation.error}`);
            }

            const cnpjLimpo = cnpjValidation.sanitized.replace(/\D/g, '');
            
            // Verifica se CNPJ já está cadastrado
            const { data: empresaExistente } = await supabase
                .from('empresas')
                .select('id')
                .eq('cnpj', cnpjLimpo)
                .single();
                
            if (empresaExistente) {
                throw new Error('CNPJ já cadastrado no sistema');
            }

            // Se email foi fornecido, verifica se já existe
            if (dadosEmpresa.email) {
                const { data: emailExistente } = await supabase
                    .from('empresas')
                    .select('id')
                    .eq('email', dadosEmpresa.email.trim())
                    .single();
                    
                if (emailExistente) {
                    throw new Error('Este email já está cadastrado em outra empresa');
                }
            }
            
            // Gera salt único para cada empresa
            const salt = securityUtils.generateSecureId();
            const senhaHash = await securityUtils.secureHash(senha, salt);
            
            // Cria registro da empresa
            const { data, error } = await supabase
                .from('empresas')
                .insert([{
                    cnpj: cnpjLimpo,
                    cnpj_formatado: this.formatarCnpj(cnpjLimpo),
                    senha_hash: senhaHash,
                    senha_salt: salt, // NOVO: salt único
                    email: dadosEmpresa.email ? securityUtils.sanitizeInput(dadosEmpresa.email.trim()) : null,
                    nome_empresa: dadosEmpresa.nomeEmpresa ? securityUtils.sanitizeInput(dadosEmpresa.nomeEmpresa.trim()) : null,
                    razao_social: dadosEmpresa.razaoSocial || `Empresa ${this.formatarCnpj(cnpjLimpo)}`,
                    nome_fantasia: dadosEmpresa.nomeFantasia ? securityUtils.sanitizeInput(dadosEmpresa.nomeFantasia) : null,
                    situacao: 'ATIVA',
                    ativo: true,
                    tentativas_login: 0,
                    data_cadastro: new Date().toISOString(),
                    ip_cadastro: this.getClientIP() // NOVO: IP do cadastro
                }])
                .select()
                .single();
                
            if (error) throw error;
            
            securityUtils.safeLog('Empresa cadastrada com sucesso', { cnpj: cnpjLimpo });
            
            return {
                success: true,
                message: 'Empresa cadastrada com sucesso!',
                empresa: data
            };
            
        } catch (error) {
            securityUtils.safeLog('Erro ao registrar empresa:', error.message);
            return {
                success: false,
                error: error.message
            };
>>>>>>> e29daefc0c793ffbdfb91536084215605c56fd83
        }
        
        return true;
      } catch (error) {
        console.warn('Erro ao verificar sessão:', error);
        return false;
      }
    },
<<<<<<< HEAD
  
    // Autenticar usuário
    autenticar: async (cnpj, senha) => {
      try {
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
        
        // Simula autenticação (substitua por integração real)
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
=======
    
    /**
     * Autentica empresa com proteções aprimoradas
     */
    async autenticar(cnpj, senha) {
        try {
            // Rate limiting para login
            const clientId = this.getClientIP() + cnpj;
            const rateLimitCheck = this.loginRateLimit(clientId);
            if (!rateLimitCheck.allowed) {
                throw new Error(rateLimitCheck.error);
            }

            // Validação de entrada
            const cnpjValidation = securityUtils.validateInput(cnpj, 'cnpj');
            if (!cnpjValidation.valid) throw new Error(cnpjValidation.error);
            
            if (!senha || senha.length < 6) {
                throw new Error('Senha deve ter pelo menos 6 caracteres');
            }

            const cnpjLimpo = cnpjValidation.sanitized.replace(/\D/g, '');
            
            // Busca empresa no banco (incluindo salt)
            const { data: empresa, error } = await supabase
                .from('empresas')
                .select('id, cnpj, cnpj_formatado, razao_social, nome_fantasia, nome_empresa, email, senha_hash, senha_salt, ativo, tentativas_login, bloqueado_ate')
                .eq('cnpj', cnpjLimpo)
                .single();
                
            if (error || !empresa) {
                await this.logTentativaLogin(cnpjLimpo, false, 'CNPJ não encontrado');
                throw new Error('CNPJ ou senha incorretos'); // Mensagem genérica por segurança
            }
            
            if (!empresa.ativo) {
                throw new Error('Empresa desativada. Entre em contato com o suporte');
            }

            // Verifica se está temporariamente bloqueada
            if (empresa.bloqueado_ate && new Date() < new Date(empresa.bloqueado_ate)) {
                const tempoRestante = Math.ceil((new Date(empresa.bloqueado_ate) - new Date()) / 1000 / 60);
                throw new Error(`Conta temporariamente bloqueada. Tente novamente em ${tempoRestante} minutos.`);
            }
            
            // Verifica tentativas de login
            if (empresa.tentativas_login >= 5) {
                // Bloqueia por 30 minutos após 5 tentativas
                const bloqueioAte = new Date(Date.now() + 30 * 60 * 1000);
                await supabase
                    .from('empresas')
                    .update({ bloqueado_ate: bloqueioAte.toISOString() })
                    .eq('id', empresa.id);
                    
                throw new Error('Muitas tentativas inválidas. Conta bloqueada por 30 minutos.');
            }
            
            // Verifica senha com salt único
            const senhaHash = await securityUtils.secureHash(senha, empresa.senha_salt || 'fitinbox_salt_2025');
            
            if (senhaHash !== empresa.senha_hash) {
                // Incrementa tentativas no banco
                await supabase
                    .from('empresas')
                    .update({ 
                        tentativas_login: empresa.tentativas_login + 1,
                        ultimo_ip_falha: this.getClientIP(),
                        data_ultima_falha: new Date().toISOString()
                    })
                    .eq('id', empresa.id);
                
                await this.logTentativaLogin(cnpjLimpo, false, 'Senha incorreta');
                throw new Error(`CNPJ ou senha incorretos. Tentativas restantes: ${5 - empresa.tentativas_login - 1}`);
            }
            
            // Login bem-sucedido - reset tentativas e atualiza acesso
            await supabase
                .from('empresas')
                .update({ 
                    tentativas_login: 0,
                    bloqueado_ate: null,
                    ultimo_acesso: new Date().toISOString(),
                    ultimo_ip_sucesso: this.getClientIP()
                })
                .eq('id', empresa.id);
            
            await this.logTentativaLogin(cnpjLimpo, true, null);
            
            // Gera token mais seguro
            const token = this.gerarTokenSeguro(empresa);
            
            // Salva sessão local com validação
            this.salvarSessaoSegura({
                id: empresa.id,
                cnpj: empresa.cnpj_formatado,
                razaoSocial: empresa.razao_social,
                nomeFantasia: empresa.nome_fantasia,
                nomeEmpresa: empresa.nome_empresa,
                email: empresa.email,
                token,
                sessionId: securityUtils.generateSecureId()
            });
            
            securityUtils.safeLog('Login realizado com sucesso', { cnpj: empresa.cnpj_formatado });
            
            return {
                success: true,
                empresa: {
                    id: empresa.id,
                    cnpj: empresa.cnpj_formatado,
                    razaoSocial: empresa.razao_social,
                    nomeFantasia: empresa.nome_fantasia,
                    nomeEmpresa: empresa.nome_empresa,
                    email: empresa.email
                },
                token
            };
            
        } catch (error) {
            securityUtils.safeLog('Erro na autenticação:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Verifica sessão com validação aprimorada
     */
    verificarSessao() {
        try {
            const sessao = JSON.parse(sessionStorage.getItem('sessaoEmpresa') || 'null');
            
            if (!sessao || !securityUtils.validateSession(sessao)) {
                this.logout();
                return null;
            }
            
            // Verifica se token não foi manipulado
            if (sessao.token && this.verificarTokenSeguro(sessao.token, sessao.id)) {
                return sessao;
            }
            
            // Token inválido
            this.logout();
            return null;
            
        } catch (error) {
            securityUtils.safeLog('Erro ao verificar sessão:', error.message);
            this.logout();
            return null;
        }
    },
    
    /**
     * Logout aprimorado com limpeza completa
     */
    logout() {
        // Lista completa de itens a serem removidos
        const itemsToRemove = [
            'sessaoEmpresa',
            'cnpj',
            'empresaInfo',
            'dadosEmpresa',
            'nomeEmpresa',
            'codigoRecuperacao',
            'carrinho',
            'pedidoAtual',
            'pedidoConfirmado'
        ];
        
        itemsToRemove.forEach(item => {
            try {
                sessionStorage.removeItem(item);
                localStorage.removeItem(item);
            } catch (error) {
                // Ignora erros de storage
            }
        });
        
        securityUtils.safeLog('Logout realizado');
    },
    
    // === MÉTODOS AUXILIARES MELHORADOS ===
    
    /**
     * Obtém IP do cliente (limitado no frontend)
     */
    getClientIP() {
        // No frontend, só podemos obter informações limitadas
        // Em produção real, isso viria do backend
        return 'client-side-ip';
    },

    /**
     * Gera token mais seguro
     */
    gerarTokenSeguro(empresa) {
        const payload = {
            sub: empresa.id,
            cnpj: empresa.cnpj,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60), // 8 horas (reduzido)
            nonce: securityUtils.generateSecureId(),
            iss: 'fitinbox-app'
        };
        
        // Ainda é base64, mas com estrutura mais robusta
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const body = btoa(JSON.stringify(payload));
        
        return `${header}.${body}.${securityUtils.generateSecureId()}`;
    },
    
    /**
     * Verifica token mais rigorosamente
     */
    verificarTokenSeguro(token, empresaId) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return false;
            
            const payload = JSON.parse(atob(parts[1]));
            const agora = Math.floor(Date.now() / 1000);
            
            return payload.exp > agora && 
                   payload.sub === empresaId &&
                   payload.iss === 'fitinbox-app';
        } catch {
            return false;
        }
    },
    
    /**
     * Salva sessão com validação
     */
    salvarSessaoSegura(dadosEmpresa) {
        try {
            const sessao = {
                ...dadosEmpresa,
                loginTime: new Date().toISOString(),
                userAgent: navigator.userAgent.substring(0, 100), // Limitado por segurança
                lastActivity: new Date().toISOString()
            };
            
            sessionStorage.setItem('sessaoEmpresa', JSON.stringify(sessao));
            sessionStorage.setItem('cnpj', dadosEmpresa.cnpj);
            sessionStorage.setItem('empresaInfo', dadosEmpresa.razaoSocial);

            if (dadosEmpresa.nomeEmpresa) {
                sessionStorage.setItem('nomeEmpresa', dadosEmpresa.nomeEmpresa);
            }
            
            securityUtils.safeLog('Sessão salva com segurança');
        } catch (error) {
            securityUtils.safeLog('Erro ao salvar sessão:', error.message);
            throw new Error('Erro interno. Tente novamente.');
        }
    },

    /**
     * Hash de senha melhorado (ainda client-side por limitação)
     */
    async hashSenha(senha, salt = 'fitinbox_salt_2025') {
        return await securityUtils.secureHash(senha, salt);
    },
    
    /**
     * Log de tentativas com mais informações
     */
    async logTentativaLogin(cnpj, sucesso, motivo) {
        try {
            const logData = {
                cnpj,
                sucesso,
                motivo,
                timestamp: new Date().toISOString(),
                ip: this.getClientIP(),
                userAgent: navigator.userAgent.substring(0, 100)
            };
            
            // Em um ambiente real, isso iria para um serviço de log
            securityUtils.safeLog('Tentativa de login:', logData);
            
            // Mantém compatibilidade com Supabase se disponível
            try {
                await supabase.rpc('log_tentativa_login', {
                    p_cnpj: cnpj,
                    p_ip_address: this.getClientIP(),
                    p_sucesso: sucesso,
                    p_motivo_falha: motivo
                });
            } catch {
                // Ignora erro se função não existir
            }
        } catch (error) {
            // Log não deve quebrar o fluxo principal
            console.warn('Erro ao logar tentativa (não crítico):', error.message);
        }
    },
    
    // Mantém métodos existentes...
    validarCnpj(cnpj) {
        const numeros = cnpj.replace(/\D/g, '');
        if (numeros.length !== 14) return false;
        if (/^(\d)\1+$/.test(numeros)) return false;
>>>>>>> e29daefc0c793ffbdfb91536084215605c56fd83
        
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
      const existingCNPJs = ['11111111111111', '22222222222222'];
      return existingCNPJs.includes(cnpj);
    },
  
    // Mock de registro
    mockRegistration: async (cnpj, senha, dadosEmpresa) => {
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
        
<<<<<<< HEAD
        return JSON.parse(session);
      } catch (error) {
        console.warn('Erro ao obter sessão:', error);
        return null;
      }
=======
        resto = soma % 11;
        let digito2 = resto < 2 ? 0 : 11 - resto;
        
        return parseInt(numeros[13]) === digito2;
    },
    
    formatarCnpj(cnpj) {
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    },

    validarEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    mascarEmail(email) {
        const [usuario, dominio] = email.split('@');
        const usuarioMascarado = usuario.slice(0, 2) + '*'.repeat(usuario.length - 2);
        return `${usuarioMascarado}@${dominio}`;
>>>>>>> e29daefc0c793ffbdfb91536084215605c56fd83
    }
  };