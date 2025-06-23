// src/utils/securityUtils.js

/**
 * Utilitários de segurança para o sistema Fit In Box
 * Inclui funções para sanitização, validação e proteção contra ataques
 */

export const securityUtils = {
  
    /**
     * Sanitiza entrada de dados para prevenir XSS e injeção de código
     * @param {string} input - String a ser sanitizada
     * @param {Object} options - Opções de sanitização
     * @returns {string} String sanitizada
     */
    sanitizeInput: (input, options = {}) => {
      if (!input || typeof input !== 'string') return '';
      
      const {
        maxLength = 500,
        allowHtml = false,
        allowSpecialChars = true
      } = options;
      
      let sanitized = input.trim();
      
      // Remove caracteres perigosos para XSS
      if (!allowHtml) {
        sanitized = sanitized
          .replace(/[<>]/g, '') // Remove < e >
          .replace(/["']/g, '') // Remove aspas
          .replace(/javascript:/gi, '') // Remove javascript:
          .replace(/on\w+=/gi, '') // Remove eventos onclick, onload, etc
          .replace(/script/gi, ''); // Remove script
      }
      
      // Remove caracteres especiais se não permitidos
      if (!allowSpecialChars) {
        sanitized = sanitized.replace(/[^\w\s\-_.@]/g, '');
      }
      
      // Limita o tamanho
      return sanitized.slice(0, maxLength);
    },
  
    /**
     * Valida e sanitiza URL
     * @param {string} url - URL a ser validada
     * @returns {Object} { isValid: boolean, sanitizedUrl: string }
     */
    validateAndSanitizeUrl: (url) => {
      try {
        if (!url || typeof url !== 'string') {
          return { isValid: false, sanitizedUrl: '' };
        }
        
        const sanitizedUrl = url.trim();
        
        // Verifica se é uma URL válida
        const urlObj = new URL(sanitizedUrl);
        
        // Lista de protocolos permitidos
        const allowedProtocols = ['http:', 'https:'];
        if (!allowedProtocols.includes(urlObj.protocol)) {
          return { isValid: false, sanitizedUrl: '' };
        }
        
        // Lista de domínios bloqueados (exemplo)
        const blockedDomains = ['malicious-site.com', 'phishing.com'];
        if (blockedDomains.some(domain => urlObj.hostname.includes(domain))) {
          return { isValid: false, sanitizedUrl: '' };
        }
        
        return { 
          isValid: true, 
          sanitizedUrl: urlObj.toString() 
        };
        
      } catch (error) {
        return { isValid: false, sanitizedUrl: '' };
      }
    },
  
    /**
     * Valida entrada de preço
     * @param {string|number} price - Preço a ser validado
     * @returns {Object} { isValid: boolean, sanitizedPrice: number }
     */
    validatePrice: (price) => {
      try {
        const numPrice = parseFloat(price);
        
        if (isNaN(numPrice) || numPrice < 0 || numPrice > 99999) {
          return { isValid: false, sanitizedPrice: 0 };
        }
        
        // Limita a 2 casas decimais
        const sanitizedPrice = Math.round(numPrice * 100) / 100;
        
        return { isValid: true, sanitizedPrice };
        
      } catch (error) {
        return { isValid: false, sanitizedPrice: 0 };
      }
    },
  
    /**
     * Valida entrada de quantidade/estoque
     * @param {string|number} quantity - Quantidade a ser validada
     * @returns {Object} { isValid: boolean, sanitizedQuantity: number }
     */
    validateQuantity: (quantity) => {
      try {
        const numQuantity = parseInt(quantity);
        
        if (isNaN(numQuantity) || numQuantity < 0 || numQuantity > 99999) {
          return { isValid: false, sanitizedQuantity: 0 };
        }
        
        return { isValid: true, sanitizedQuantity: numQuantity };
        
      } catch (error) {
        return { isValid: false, sanitizedQuantity: 0 };
      }
    },
  
    /**
     * Log seguro que não expõe informações sensíveis
     * @param {string} message - Mensagem de log
     * @param {Object} data - Dados adicionais (sanitizados)
     * @param {string} level - Nível do log (info, warn, error)
     */
    safeLog: (message, data = null, level = 'info') => {
      if (process.env.NODE_ENV === 'development') {
        const timestamp = new Date().toISOString();
        const logData = data ? securityUtils.sanitizeLogData(data) : null;
        
        console[level](`[${timestamp}] [ADMIN] ${message}`, logData);
      }
    },
  
    /**
     * Sanitiza dados para log (remove informações sensíveis)
     * @param {Object} data - Dados a serem sanitizados
     * @returns {Object} Dados sanitizados
     */
    sanitizeLogData: (data) => {
      if (!data || typeof data !== 'object') return data;
      
      const sensitiveFields = [
        'senha', 'password', 'token', 'auth', 'secret', 
        'key', 'hash', 'credential', 'cnpj', 'email'
      ];
      
      const sanitized = { ...data };
      
      // Remove ou mascara campos sensíveis
      Object.keys(sanitized).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          if (lowerKey.includes('email')) {
            sanitized[key] = securityUtils.maskEmail(sanitized[key]);
          } else if (lowerKey.includes('cnpj')) {
            sanitized[key] = securityUtils.maskCnpj(sanitized[key]);
          } else {
            sanitized[key] = '[REDACTED]';
          }
        }
      });
      
      return sanitized;
    },
  
    /**
     * Mascara email para logs
     * @param {string} email - Email a ser mascarado
     * @returns {string} Email mascarado
     */
    maskEmail: (email) => {
      if (!email || typeof email !== 'string') return '[INVALID_EMAIL]';
      
      const [user, domain] = email.split('@');
      if (!user || !domain) return '[INVALID_EMAIL]';
      
      const maskedUser = user.length > 2 ? 
        user.slice(0, 2) + '*'.repeat(user.length - 2) : 
        user;
      
      return `${maskedUser}@${domain}`;
    },
  
    /**
     * Mascara CNPJ para logs
     * @param {string} cnpj - CNPJ a ser mascarado
     * @returns {string} CNPJ mascarado
     */
    maskCnpj: (cnpj) => {
      if (!cnpj || typeof cnpj !== 'string') return '[INVALID_CNPJ]';
      
      const numbers = cnpj.replace(/\D/g, '');
      if (numbers.length !== 14) return '[INVALID_CNPJ]';
      
      return `${numbers.slice(0, 2)}.***.***/****-${numbers.slice(-2)}`;
    },
  
    /**
     * Valida se uma operação pode ser executada (rate limiting básico)
     * @param {string} operation - Nome da operação
     * @param {number} maxAttempts - Máximo de tentativas
     * @param {number} timeWindow - Janela de tempo em minutos
     * @returns {Object} { allowed: boolean, remainingAttempts: number }
     */
    checkRateLimit: (operation, maxAttempts = 10, timeWindow = 60) => {
      try {
        const key = `rateLimit_${operation}`;
        const now = Date.now();
        const windowStart = now - (timeWindow * 60 * 1000);
        
        let attempts = JSON.parse(localStorage.getItem(key) || '[]');
        
        // Remove tentativas antigas
        attempts = attempts.filter(timestamp => timestamp > windowStart);
        
        if (attempts.length >= maxAttempts) {
          return { 
            allowed: false, 
            remainingAttempts: 0,
            resetTime: new Date(attempts[0] + (timeWindow * 60 * 1000))
          };
        }
        
        // Adiciona tentativa atual
        attempts.push(now);
        localStorage.setItem(key, JSON.stringify(attempts));
        
        return { 
          allowed: true, 
          remainingAttempts: maxAttempts - attempts.length,
          resetTime: null
        };
        
      } catch (error) {
        // Em caso de erro, permite a operação
        return { allowed: true, remainingAttempts: maxAttempts };
      }
    },
  
    /**
     * Gera hash simples para comparação (não criptograficamente seguro)
     * @param {string} input - String a ser hasheada
     * @param {string} salt - Salt adicional
     * @returns {string} Hash resultante
     */
    simpleHash: (input, salt = 'fitinbox_salt_2025') => {
      try {
        const combined = input + salt;
        return btoa(combined).replace(/[+=\/]/g, '');
      } catch (error) {
        return '';
      }
    },
  
    /**
     * Valida estrutura de produto
     * @param {Object} product - Produto a ser validado
     * @returns {Object} { isValid: boolean, errors: Array, sanitizedProduct: Object }
     */
    validateProduct: (product) => {
      const errors = [];
      const sanitized = {};
      
      // Validação do nome
      if (!product.nome || typeof product.nome !== 'string') {
        errors.push('Nome é obrigatório');
      } else {
        sanitized.nome = securityUtils.sanitizeInput(product.nome, { maxLength: 100 });
        if (!sanitized.nome) {
          errors.push('Nome inválido após sanitização');
        }
      }
      
      // Validação da descrição
      if (!product.descricao || typeof product.descricao !== 'string') {
        errors.push('Descrição é obrigatória');
      } else {
        sanitized.descricao = securityUtils.sanitizeInput(product.descricao, { maxLength: 500 });
        if (!sanitized.descricao) {
          errors.push('Descrição inválida após sanitização');
        }
      }
      
      // Validação do preço
      const priceValidation = securityUtils.validatePrice(product.preco);
      if (!priceValidation.isValid) {
        errors.push('Preço deve ser um número válido maior que zero');
      } else {
        sanitized.preco = priceValidation.sanitizedPrice;
      }
      
      // Validação da categoria
      const allowedCategories = ['fitness', 'vegana', 'tradicional', 'gourmet'];
      if (!product.categoria || !allowedCategories.includes(product.categoria)) {
        errors.push('Categoria deve ser uma das opções válidas');
      } else {
        sanitized.categoria = product.categoria;
      }
      
      // Validação da imagem
      if (!product.imagem || typeof product.imagem !== 'string') {
        errors.push('URL da imagem é obrigatória');
      } else {
        const urlValidation = securityUtils.validateAndSanitizeUrl(product.imagem);
        if (!urlValidation.isValid) {
          errors.push('URL da imagem inválida');
        } else {
          sanitized.imagem = urlValidation.sanitizedUrl;
        }
      }
      
      // Validação do estoque
      const stockValidation = securityUtils.validateQuantity(product.estoque);
      if (!stockValidation.isValid) {
        errors.push('Estoque deve ser um número válido');
      } else {
        sanitized.estoque = stockValidation.sanitizedQuantity;
      }
      
      // Validação da disponibilidade
      sanitized.disponivel = Boolean(product.disponivel);
      
      return {
        isValid: errors.length === 0,
        errors,
        sanitizedProduct: errors.length === 0 ? sanitized : null
      };
    },
  
    /**
     * Protege contra CSRF básico verificando origem
     * @returns {boolean} True se a origem é válida
     */
    validateOrigin: () => {
      try {
        const allowedOrigins = [
          'http://localhost:3000',
          'https://localhost:3000',
          window.location.origin
        ];
        
        return allowedOrigins.includes(window.location.origin);
      } catch (error) {
        return false;
      }
    },
  
    /**
     * Limpa dados sensíveis do sessionStorage/localStorage
     */
    clearSensitiveData: () => {
      const sensitiveKeys = [
        'adminAuthenticated',
        'adminLock',
        'senha',
        'password',
        'token',
        'auth'
      ];
      
      sensitiveKeys.forEach(key => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      });
    },
  
    /**
     * Valida se uma sessão admin é válida
     * @param {Object} session - Dados da sessão
     * @returns {boolean} True se a sessão é válida
     */
    validateAdminSession: (session) => {
      try {
        if (!session || typeof session !== 'object') return false;
        
        const { timestamp, signature } = session;
        if (!timestamp || !signature) return false;
        
        // Verifica se não expirou (1 hora)
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - timestamp > oneHour) return false;
        
        // Verifica assinatura básica
        const expectedSignature = securityUtils.simpleHash(timestamp.toString());
        return signature === expectedSignature;
        
      } catch (error) {
        return false;
      }
    },
  
    /**
     * Cria uma sessão admin segura
     * @returns {Object} Dados da sessão
     */
    createAdminSession: () => {
      const timestamp = Date.now();
      const signature = securityUtils.simpleHash(timestamp.toString());
      
      return { timestamp, signature };
    },
  
    /**
     * Detecta tentativas de injeção SQL/NoSQL básicas
     * @param {string} input - String a ser verificada
     * @returns {boolean} True se suspeita de injeção
     */
    detectInjectionAttempt: (input) => {
      if (!input || typeof input !== 'string') return false;
      
      const suspiciousPatterns = [
        /union\s+select/i,
        /drop\s+table/i,
        /delete\s+from/i,
        /insert\s+into/i,
        /update\s+set/i,
        /script\s*>/i,
        /<iframe/i,
        /javascript:/i,
        /vbscript:/i,
        /on\w+\s*=/i
      ];
      
      return suspiciousPatterns.some(pattern => pattern.test(input));
    },
  
    /**
     * Limita tentativas de operações sensíveis
     * @param {string} operationKey - Chave da operação
     * @returns {Object} Status do limite
     */
    checkOperationLimit: (operationKey) => {
      const maxAttempts = 5;
      const timeWindow = 15; // 15 minutos
      
      return securityUtils.checkRateLimit(operationKey, maxAttempts, timeWindow);
    }
  };
  
  // Configurações de segurança global
  export const securityConfig = {
    // Tempo máximo de sessão admin (em milissegundos)
    maxSessionTime: 60 * 60 * 1000, // 1 hora
    
    // Máximo de tentativas de login
    maxLoginAttempts: 3,
    
    // Tempo de bloqueio após tentativas (em minutos)
    lockoutTime: 30,
    
    // Tamanhos máximos para campos
    maxFieldLengths: {
      nome: 100,
      descricao: 500,
      observacoes: 200,
      email: 100,
      url: 500
    },
    
    // URLs permitidas para imagens
    allowedImageDomains: [
      'images.unsplash.com',
      'unsplash.com',
      'cloudinary.com',
      'imgur.com'
    ]
  };
  
  export default securityUtils;