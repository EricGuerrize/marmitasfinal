// src/hooks/useWindowSize.js
import { useState, useEffect } from 'react';

export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
    isMobile: false,
    isTablet: false,
    isDesktop: false
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setWindowSize({
        width,
        height,
        isMobile: width <= 768,
        isTablet: width > 768 && width <= 1024,
        isDesktop: width > 1024
      });
    };

    // Set size on mount
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

// =========================================
// src/services/whatsappService.js
// =========================================

export const whatsappService = {
  
  /**
   * Envia pedido via WhatsApp
   */
  enviarPedido(pedido, empresa) {
    const numeroWhatsApp = '5565992556938';
    
    let mensagem = `*🍽️ NOVO PEDIDO - FIT IN BOX*\n\n`;
    mensagem += `*📋 Pedido:* #${pedido.numero}\n`;
    mensagem += `*🏢 Empresa:* ${empresa.nomeEmpresa || empresa.razaoSocial}\n`;
    mensagem += `*📄 CNPJ:* ${empresa.cnpj}\n`;
    mensagem += `*📅 Data:* ${new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}\n\n`;
    
    mensagem += `*📦 ITENS DO PEDIDO:*\n`;
    pedido.itens.forEach(item => {
      mensagem += `• ${item.quantidade}x ${item.nome} - R$ ${(item.quantidade * item.preco).toFixed(2)}\n`;
    });
    
    mensagem += `\n*💰 RESUMO FINANCEIRO:*\n`;
    mensagem += `• Subtotal: R$ ${pedido.subtotal.toFixed(2)}\n`;
    mensagem += `• Taxa de entrega: ${pedido.taxaEntrega === 0 ? 'GRÁTIS' : `R$ ${pedido.taxaEntrega.toFixed(2)}`}\n`;
    mensagem += `• *TOTAL: R$ ${pedido.total.toFixed(2)}*\n\n`;
    
    mensagem += `*📍 ENDEREÇO DE ENTREGA:*\n${pedido.enderecoEntrega}\n\n`;
    
    if (pedido.observacoes) {
      mensagem += `*💬 OBSERVAÇÕES:*\n${pedido.observacoes}\n\n`;
    }
    
    mensagem += `Aguardo confirmação! 🙏`;

    const url = `https://wa.me/55${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    
    return { success: true, url };
  },

  /**
   * Envia consulta sobre pedido
   */
  consultarPedido(pedido, empresa) {
    const numeroWhatsApp = '5565992556938';
    
    let mensagem = `*🔍 CONSULTA DE PEDIDO - FIT IN BOX*\n\n`;
    mensagem += `*📋 Pedido:* #${pedido.numero}\n`;
    mensagem += `*🏢 Empresa:* ${empresa.nomeEmpresa || empresa.razaoSocial}\n`;
    mensagem += `*📄 CNPJ:* ${empresa.cnpj}\n`;
    mensagem += `*📅 Data:* ${new Date(pedido.data).toLocaleDateString('pt-BR')}\n`;
    mensagem += `*💰 Total:* R$ ${pedido.total.toFixed(2)}\n\n`;
    mensagem += `Gostaria de tirar algumas dúvidas sobre este pedido.`;

    const url = `https://wa.me/55${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    
    return { success: true, url };
  },

  /**
   * Envia mensagem de suporte
   */
  enviarSuporte(assunto, mensagem, empresa = null) {
    const numeroWhatsApp = '5565992556938';
    
    let mensagemCompleta = `*🆘 SUPORTE - FIT IN BOX*\n\n`;
    
    if (empresa) {
      mensagemCompleta += `*🏢 Empresa:* ${empresa.nomeEmpresa || empresa.razaoSocial}\n`;
      mensagemCompleta += `*📄 CNPJ:* ${empresa.cnpj}\n\n`;
    }
    
    mensagemCompleta += `*📋 Assunto:* ${assunto}\n\n`;
    mensagemCompleta += `*💬 Mensagem:*\n${mensagem}\n\n`;
    mensagemCompleta += `Aguardo retorno. Obrigado!`;

    const url = `https://wa.me/55${numeroWhatsApp}?text=${encodeURIComponent(mensagemCompleta)}`;
    window.open(url, '_blank');
    
    return { success: true, url };
  }
};

// =========================================
// src/utils/formatters.js
// =========================================

export const formatters = {
  
  /**
   * Formata valor monetário
   */
  currency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  /**
   * Formata data
   */
  date(date, options = {}) {
    const defaultOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...options
    };
    
    return new Date(date).toLocaleDateString('pt-BR', defaultOptions);
  },

  /**
   * Formata data e hora
   */
  datetime(date) {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Formata CNPJ
   */
  cnpj(value) {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  },

  /**
   * Formata CEP
   */
  cep(value) {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
  },

  /**
   * Formata telefone
   */
  phone(value) {
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    return value;
  },

  /**
   * Trunca texto
   */
  truncate(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  /**
   * Pluraliza texto
   */
  pluralize(count, singular, plural) {
    return count === 1 ? singular : plural;
  },

  /**
   * Formata número com separadores
   */
  number(value) {
    return new Intl.NumberFormat('pt-BR').format(value);
  }
};

// =========================================
// src/utils/validators.js
// =========================================

export const validators = {
  
  /**
   * Valida CNPJ
   */
  cnpj(cnpj) {
    const cleaned = cnpj.replace(/\D/g, '');
    
    if (cleaned.length !== 14) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false;
    
    // Validação dos dígitos verificadores
    let soma = 0;
    let peso = 2;
    
    for (let i = 11; i >= 0; i--) {
      soma += parseInt(cleaned[i]) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    
    let resto = soma % 11;
    let digito1 = resto < 2 ? 0 : 11 - resto;
    
    if (parseInt(cleaned[12]) !== digito1) return false;
    
    soma = 0;
    peso = 2;
    
    for (let i = 12; i >= 0; i--) {
      soma += parseInt(cleaned[i]) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    
    resto = soma % 11;
    let digito2 = resto < 2 ? 0 : 11 - resto;
    
    return parseInt(cleaned[13]) === digito2;
  },

  /**
   * Valida email
   */
  email(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  /**
   * Valida CEP
   */
  cep(cep) {
    const cleaned = cep.replace(/\D/g, '');
    return cleaned.length === 8;
  },

  /**
   * Valida telefone
   */
  phone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 || cleaned.length === 11;
  },

  /**
   * Valida senha
   */
  password(password, minLength = 6) {
    return password && password.length >= minLength;
  },

  /**
   * Valida campo obrigatório
   */
  required(value) {
    return value !== null && value !== undefined && value.toString().trim() !== '';
  },

  /**
   * Valida número
   */
  number(value, min = null, max = null) {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    if (min !== null && num < min) return false;
    if (max !== null && num > max) return false;
    return true;
  },

  /**
   * Valida URL
   */
  url(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
};

// =========================================
// src/utils/storage.js
// =========================================

export const storage = {
  
  /**
   * Salva item no localStorage com tratamento de erro
   */
  setLocal(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      console.error('Erro ao salvar no localStorage:', error);
      return false;
    }
  },

  /**
   * Recupera item do localStorage
   */
  getLocal(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Erro ao recuperar do localStorage:', error);
      return defaultValue;
    }
  },

  /**
   * Remove item do localStorage
   */
  removeLocal(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Erro ao remover do localStorage:', error);
      return false;
    }
  },

  /**
   * Salva item no sessionStorage
   */
  setSession(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      sessionStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      console.error('Erro ao salvar no sessionStorage:', error);
      return false;
    }
  },

  /**
   * Recupera item do sessionStorage
   */
  getSession(key, defaultValue = null) {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Erro ao recuperar do sessionStorage:', error);
      return defaultValue;
    }
  },

  /**
   * Remove item do sessionStorage
   */
  removeSession(key) {
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Erro ao remover do sessionStorage:', error);
      return false;
    }
  },

  /**
   * Limpa todo o storage
   */
  clearAll() {
    try {
      localStorage.clear();
      sessionStorage.clear();
      return true;
    } catch (error) {
      console.error('Erro ao limpar storage:', error);
      return false;
    }
  }
};

// =========================================
// src/constants/index.js
// =========================================

export const CONSTANTS = {
  
  // Configurações do pedido
  PEDIDO_MINIMO: 30,
  FRETE_GRATIS_VALOR: 50,
  TAXA_ENTREGA_PADRAO: 5.00,
  
  // Status dos pedidos
  STATUS_PEDIDO: {
    PENDENTE: 'pendente',
    ENVIADO: 'enviado',
    CONFIRMADO: 'confirmado',
    A_PREPARAR: 'a_preparar',
    EM_PRODUCAO: 'em_producao',
    PRONTO_ENTREGA: 'pronto_entrega',
    ENTREGUE: 'entregue',
    CANCELADO: 'cancelado'
  },

  // Labels dos status
  STATUS_LABELS: {
    pendente: 'Pendente',
    enviado: 'Enviado',
    confirmado: 'Confirmado',
    a_preparar: 'A Preparar',
    em_producao: 'Em Produção',
    pronto_entrega: 'Pronto p/ Entrega',
    entregue: 'Entregue',
    cancelado: 'Cancelado'
  },

  // Cores dos status
  STATUS_COLORS: {
    pendente: '#ffc107',
    enviado: '#007bff',
    confirmado: '#28a745',
    a_preparar: '#fd7e14',
    em_producao: '#dc3545',
    pronto_entrega: '#20c997',
    entregue: '#6c757d',
    cancelado: '#343a40'
  },

  // Categorias de produtos
  CATEGORIAS: [
    { id: 'fitness', nome: 'Fitness', cor: '#28a745' },
    { id: 'vegana', nome: 'Vegana/Vegetariana', cor: '#20c997' },
    { id: 'tradicional', nome: 'Tradicional', cor: '#007bff' },
    { id: 'gourmet', nome: 'Gourmet', cor: '#6f42c1' }
  ],

  // Métodos de pagamento
  METODOS_PAGAMENTO: [
    { id: 'pix', nome: 'PIX', disponivel: true },
    { id: 'cartao', nome: 'Cartão de Crédito', disponivel: false },
    { id: 'dinheiro', nome: 'Dinheiro', disponivel: false },
    { id: 'transferencia', nome: 'Transferência', disponivel: false }
  ],

  // Estados brasileiros
  ESTADOS: [
    { uf: 'AC', nome: 'Acre' },
    { uf: 'AL', nome: 'Alagoas' },
    { uf: 'AP', nome: 'Amapá' },
    { uf: 'AM', nome: 'Amazonas' },
    { uf: 'BA', nome: 'Bahia' },
    { uf: 'CE', nome: 'Ceará' },
    { uf: 'DF', nome: 'Distrito Federal' },
    { uf: 'ES', nome: 'Espírito Santo' },
    { uf: 'GO', nome: 'Goiás' },
    { uf: 'MA', nome: 'Maranhão' },
    { uf: 'MT', nome: 'Mato Grosso' },
    { uf: 'MS', nome: 'Mato Grosso do Sul' },
    { uf: 'MG', nome: 'Minas Gerais' },
    { uf: 'PA', nome: 'Pará' },
    { uf: 'PB', nome: 'Paraíba' },
    { uf: 'PR', nome: 'Paraná' },
    { uf: 'PE', nome: 'Pernambuco' },
    { uf: 'PI', nome: 'Piauí' },
    { uf: 'RJ', nome: 'Rio de Janeiro' },
    { uf: 'RN', nome: 'Rio Grande do Norte' },
    { uf: 'RS', nome: 'Rio Grande do Sul' },
    { uf: 'RO', nome: 'Rondônia' },
    { uf: 'RR', nome: 'Roraima' },
    { uf: 'SC', nome: 'Santa Catarina' },
    { uf: 'SP', nome: 'São Paulo' },
    { uf: 'SE', nome: 'Sergipe' },
    { uf: 'TO', nome: 'Tocantins' }
  ],

  // Configurações de contato
  CONTATO: {
    WHATSAPP: '5565992556938',
    EMAIL: 'contato@fitinbox.com',
    NOME_EMPRESA: 'Fit In Box',
    SLOGAN: 'Sua Alimentação, Nosso Compromisso'
  },

  // Configurações de tempo
  TEMPO: {
    SESSAO_EXPIRA: 8 * 60 * 60 * 1000, // 8 horas
    BLOQUEIO_LOGIN: 30 * 60 * 1000, // 30 minutos
    RATE_LIMIT_LOGIN: 15 * 60 * 1000, // 15 minutos
    TOKEN_RESET_EXPIRA: 10 * 60 * 1000 // 10 minutos
  },

  // URLs e endpoints
  URLS: {
    VIACEP: 'https://viacep.com.br/ws',
    RECEITA_WS: 'https://receitaws.com.br/v1/cnpj',
    MINHA_RECEITA: 'https://minhareceita.org'
  }
};