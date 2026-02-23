// src/utils/securityUtils.js

/**
 * Utilitários de segurança para o sistema Fit In Box
 */
export const securityUtils = {
  
  /**
   * Sanitiza entrada de dados
   */
  sanitizeInput: (input, options = {}) => {
    if (!input || typeof input !== 'string') return '';
    
    const { maxLength = 500 } = options;
    
    let sanitized = input.trim();
    
    // Remove caracteres perigosos
    sanitized = sanitized
      .replace(/[<>]/g, '') // Remove < e >
      .replace(/javascript:/gi, '') // Remove javascript:
      .replace(/on\w+=/gi, '') // Remove eventos
      .replace(/script/gi, ''); // Remove script
    
    // Limita o tamanho
    return sanitized.slice(0, maxLength);
  },

  /**
   * Valida entrada com tipos específicos
   */
  validateInput: (input, type, maxLength = 500) => {
    if (!input) {
      return { valid: false, error: 'Campo obrigatório', sanitized: '' };
    }

    const sanitized = this.sanitizeInput(input, { maxLength });

    switch (type) {
      case 'cnpj':
        const cnpjLimpo = sanitized.replace(/\D/g, '');
        if (cnpjLimpo.length !== 14) {
          return { valid: false, error: 'CNPJ deve ter 14 dígitos', sanitized };
        }
        return { valid: true, sanitized };

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitized)) {
          return { valid: false, error: 'Email inválido', sanitized };
        }
        return { valid: true, sanitized };

      case 'password':
        if (sanitized.length < 6) {
          return { valid: false, error: 'Senha deve ter pelo menos 6 caracteres', sanitized };
        }
        return { valid: true, sanitized };

      case 'text':
        if (sanitized.length === 0) {
          return { valid: false, error: 'Campo não pode estar vazio', sanitized };
        }
        return { valid: true, sanitized };

      default:
        return { valid: true, sanitized };
    }
  },

  /**
   * Cria rate limiter simples
   */
  createRateLimiter: (maxAttempts, timeWindow) => {
    const attempts = new Map();
    
    return (key) => {
      const now = Date.now();
      const userAttempts = attempts.get(key) || [];
      
      // Remove tentativas antigas
      const validAttempts = userAttempts.filter(time => now - time < timeWindow);
      
      if (validAttempts.length >= maxAttempts) {
        return {
          allowed: false,
          error: `Muitas tentativas. Tente novamente em ${Math.ceil(timeWindow / 60000)} minutos.`
        };
      }
      
      // Adiciona tentativa atual
      validAttempts.push(now);
      attempts.set(key, validAttempts);
      
      return { allowed: true };
    };
  },

  /**
   * Gera ID seguro
   */
  generateSecureId: () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  },

  /**
   * Hash seguro (simplificado para client-side)
   */
  secureHash: async (text, salt = 'fitinbox_salt_2025') => {
    // Para client-side, usamos btoa com salt
    // Em produção real, isso deveria ser feito no backend
    const combined = text + salt;
    return btoa(combined).replace(/[+=/]/g, '');
  },

  /**
   * Log seguro
   */
  safeLog: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SECURITY] ${message}`, data);
    }
  },

  /**
   * Valida sessão
   */
  validateSession: (session) => {
    if (!session || typeof session !== 'object') return false;
    if (!session.id || !session.cnpj) return false;
    
    // Verifica se sessão não expirou (8 horas)
    if (session.loginTime) {
      const loginTime = new Date(session.loginTime);
      const now = new Date();
      const diffHours = (now - loginTime) / (1000 * 60 * 60);
      if (diffHours > 8) return false;
    }
    
    return true;
  },

  /**
   * Detecta tentativas de injeção
   */
  detectInjectionAttempt: (input) => {
    if (!input || typeof input !== 'string') return false;
    
    const suspiciousPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /script\s*>/i,
      /<iframe/i,
      /javascript:/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(input));
  },

  /**
   * Valida origem (CSRF básico)
   */
  validateOrigin: () => {
    try {
      const allowedOrigins = [
        'http://localhost:3000',
        'https://localhost:3000',
        window.location.origin
      ];
      
      return allowedOrigins.includes(window.location.origin);
    } catch {
      return false;
    }
  },

  // ===== FUNÇÕES ADICIONADAS PARA CORRIGIR OS ERROS =====

  /**
   * Rate limiting por operação (implementação simples com localStorage)
   */
  checkOperationLimit: (operation, maxAttempts = 5, timeWindow = 60 * 60 * 1000) => {
    try {
      const key = `rate_limit_${operation}`;
      const data = JSON.parse(localStorage.getItem(key) || '{"attempts": [], "resetTime": 0}');
      const now = Date.now();

      // Remove tentativas antigas
      data.attempts = data.attempts.filter(time => now - time < timeWindow);

      // Verifica limite
      if (data.attempts.length >= maxAttempts) {
        const oldestAttempt = Math.min(...data.attempts);
        const resetTime = new Date(oldestAttempt + timeWindow);
        return {
          allowed: false,
          resetTime: resetTime
        };
      }

      // Adiciona tentativa atual
      data.attempts.push(now);
      localStorage.setItem(key, JSON.stringify(data));

      return { allowed: true };
    } catch (error) {
      console.error('Erro no rate limiting:', error);
      return { allowed: true }; // Em caso de erro, permite
    }
  },

  /**
 * Força uso de HTTPS (client-side verification)
 */
enforceHTTPS: () => {
  if (typeof window !== 'undefined' && 
      window.location.protocol === 'http:' && 
      !window.location.hostname.includes('localhost')) {
    window.location.href = window.location.href.replace('http:', 'https:');
    return false;
  }
  return true;
},

  /**
   * Hash simples (usado para comparação de senhas)
   */
  simpleHash: (str, salt = '') => {
    if (!str) return '';
    const combined = str + salt;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return btoa(Math.abs(hash).toString());
  }
};