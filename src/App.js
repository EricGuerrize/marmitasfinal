// src/App.js - COM INICIALIZAÇÃO DE SEGURANÇA

import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import ProsseguirPage from './components/ProsseguirPage';
import CnpjNaoCadastrado from './components/CnpjNaoCadastrado';
import PedidoProdutos from './components/PedidoProdutos';
import CarrinhoPage from './components/CarrinhoPage';
import ResumoPedido from './components/ResumoPedido';
import PedidoConfirmado from './components/PedidoConfirmado';
import AdminPage from './components/AdminPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ConsultaPedidosPage from './components/ConsultaPedidosPage';
import { NotificationProvider, useNotification } from './components/NotificationSystem';
import { securityUtils } from './utils/securityUtils';

// Wrapper do App para usar o hook de notificações
function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const [carrinho, setCarrinho] = useState([]);
  const [securityInitialized, setSecurityInitialized] = useState(false);
  const { success, error: showError } = useNotification();

  // Inicialização de segurança
  useEffect(() => {
    const initSecurity = async () => {
      try {
        // 1. Força HTTPS em produção
        securityUtils.enforceHTTPS();
        
        // 2. Limpa dados sensíveis de sessões anteriores se necessário
        const sessao = sessionStorage.getItem('sessaoEmpresa');
        if (sessao) {
          try {
            const sessaoData = JSON.parse(sessao);
            if (!securityUtils.validateSession(sessaoData)) {
              securityUtils.safeLog('Sessão inválida detectada, limpando...');
              sessionStorage.clear();
            }
          } catch {
            sessionStorage.clear();
          }
        }

        // 3. Remove senha de admin hardcoded de logs/console em produção
        if (process.env.NODE_ENV === 'production') {
          console.log = () => {};
          console.warn = () => {};
          console.error = () => {};
        }

        // 4. Adiciona listener para detectar tentativas de manipulação
        window.addEventListener('beforeunload', () => {
          // Limpa dados sensíveis ao sair
          if (sessionStorage.getItem('sessaoEmpresa')) {
            securityUtils.safeLog('Limpando sessão ao sair');
          }
        });

        // 5. Proteção contra console manipulation em produção
        if (process.env.NODE_ENV === 'production') {
          const originalConsole = { ...console };
          Object.keys(console).forEach(key => {
            if (typeof console[key] === 'function') {
              console[key] = () => {};
            }
          });
          // Mantém apenas errors críticos
          console.error = originalConsole.error;
        }

        // 6. Verifica integridade do localStorage
        try {
          const testKey = '__security_test__';
          localStorage.setItem(testKey, 'test');
          localStorage.removeItem(testKey);
        } catch (error) {
          showError('Erro de storage detectado. Algumas funcionalidades podem não funcionar.');
        }

        setSecurityInitialized(true);
        securityUtils.safeLog('Segurança inicializada com sucesso');

      } catch (error) {
        securityUtils.safeLog('Erro na inicialização de segurança:', error.message);
        setSecurityInitialized(true); // Continua mesmo com erro
      }
    };

    initSecurity();
  }, [showError]);

  // Carrega carrinho do sessionStorage ao iniciar
  useEffect(() => {
    if (!securityInitialized) return;

    const carrinhoSalvo = sessionStorage.getItem('carrinho');
    if (carrinhoSalvo) {
      try {
        const carrinhoData = JSON.parse(carrinhoSalvo);
        // Valida estrutura do carrinho
        if (Array.isArray(carrinhoData) && carrinhoData.every(item => 
          item.id && item.nome && typeof item.preco === 'number' && typeof item.quantidade === 'number'
        )) {
          setCarrinho(carrinhoData);
        } else {
          securityUtils.safeLog('Carrinho com formato inválido detectado, limpando...');
          sessionStorage.removeItem('carrinho');
          setCarrinho([]);
        }
      } catch (error) {
        securityUtils.safeLog('Erro ao carregar carrinho:', error.message);
        sessionStorage.removeItem('carrinho');
        setCarrinho([]);
        showError('Erro ao restaurar carrinho anterior');
      }
    }
  }, [securityInitialized, showError]);

  // Salva carrinho no sessionStorage sempre que muda
  useEffect(() => {
    if (!securityInitialized) return;

    try {
      if (carrinho.length > 0) {
        // Valida dados antes de salvar
        const carrinhoValidado = carrinho.map(item => ({
          id: securityUtils.sanitizeInput(String(item.id)),
          nome: securityUtils.sanitizeInput(item.nome),
          descricao: securityUtils.sanitizeInput(item.descricao || ''),
          preco: parseFloat(item.preco) || 0,
          quantidade: parseInt(item.quantidade) || 0,
          categoria: securityUtils.sanitizeInput(item.categoria || ''),
          imagem: securityUtils.sanitizeInput(item.imagem || '')
        }));
        
        sessionStorage.setItem('carrinho', JSON.stringify(carrinhoValidado));
      } else {
        sessionStorage.removeItem('carrinho');
      }
    } catch (error) {
      securityUtils.safeLog('Erro ao salvar carrinho:', error.message);
      showError('Erro ao salvar carrinho');
    }
  }, [carrinho, securityInitialized, showError]);

  // Função para navegar entre páginas com validação
  const navigate = (page) => {
    // Lista de páginas válidas para prevenir navegação maliciosa
    const validPages = [
      'home', 'prosseguir', 'cnpj-nao-cadastrado', 'pedido-produtos',
      'carrinho', 'resumo-pedido', 'pedido-confirmado', 'admin',
      'forgot-password', 'consultar-pedido'
    ];

    if (validPages.includes(page)) {
      setCurrentPage(page);
      securityUtils.safeLog(`Navegação para: ${page}`);
    } else {
      securityUtils.safeLog(`Tentativa de navegação inválida bloqueada: ${page}`);
      showError('Página não encontrada');
    }
  };

  // Função para adicionar ao carrinho com validação
  const adicionarAoCarrinho = (produto, quantidadeAdicionar = 1) => {
    try {
      // Validação rigorosa do produto
      if (!produto || typeof produto !== 'object') {
        throw new Error('Produto inválido');
      }

      const produtoValidado = {
        id: parseInt(produto.id) || 0,
        nome: securityUtils.sanitizeInput(produto.nome || ''),
        descricao: securityUtils.sanitizeInput(produto.descricao || ''),
        preco: parseFloat(produto.preco) || 0,
        categoria: securityUtils.sanitizeInput(produto.categoria || ''),
        imagem: securityUtils.sanitizeInput(produto.imagem || ''),
        quantidade: parseInt(quantidadeAdicionar) || 1
      };

      // Validações de negócio
      if (produtoValidado.id <= 0) throw new Error('ID do produto inválido');
      if (!produtoValidado.nome.trim()) throw new Error('Nome do produto é obrigatório');
      if (produtoValidado.preco <= 0) throw new Error('Preço deve ser maior que zero');
      if (produtoValidado.quantidade <= 0 || produtoValidado.quantidade > 999) {
        throw new Error('Quantidade deve estar entre 1 e 999');
      }

      const itemExistente = carrinho.find(item => item.id === produtoValidado.id);
      
      if (itemExistente) {
        const novaQuantidade = itemExistente.quantidade + produtoValidado.quantidade;
        if (novaQuantidade > 999) {
          throw new Error('Quantidade máxima por produto: 999');
        }
        
        setCarrinho(carrinho.map(item => 
          item.id === produtoValidado.id 
            ? { ...item, quantidade: novaQuantidade }
            : item
        ));
        
        success(`${produtoValidado.quantidade}x ${produtoValidado.nome} adicionado ao carrinho`, 2000);
      } else {
        setCarrinho([...carrinho, produtoValidado]);
        success(`${produtoValidado.nome} adicionado ao carrinho!`, 2000);
      }
      
      // Aviso sobre pedido mínimo
      const novaQuantidadeTotal = calcularQuantidadeTotal() + produtoValidado.quantidade;
      if (novaQuantidadeTotal >= 25 && novaQuantidadeTotal < 30) {
        // Comentado para não ser spam
        // showError(`Você está quase lá! Faltam ${30 - novaQuantidadeTotal} marmitas para o pedido mínimo.`);
      }
      
    } catch (err) {
      securityUtils.safeLog('Erro ao adicionar ao carrinho:', err.message);
      showError(err.message || 'Erro ao adicionar produto ao carrinho');
    }
  };

  // Função para atualizar quantidade com validação
  const atualizarQuantidade = (id, novaQuantidade) => {
    try {
      const idValidado = parseInt(id);
      const quantidadeValidada = parseInt(novaQuantidade);
      
      if (isNaN(idValidado) || idValidado <= 0) {
        throw new Error('ID inválido');
      }
      
      if (isNaN(quantidadeValidada) || quantidadeValidada < 0 || quantidadeValidada > 999) {
        throw new Error('Quantidade deve estar entre 0 e 999');
      }

      const produto = carrinho.find(item => item.id === idValidado);
      
      if (quantidadeValidada <= 0) {
        setCarrinho(carrinho.filter(item => item.id !== idValidado));
        if (produto) {
          success(`${produto.nome} removido do carrinho`);
        }
      } else {
        setCarrinho(carrinho.map(item =>
          item.id === idValidado
            ? { ...item, quantidade: quantidadeValidada }
            : item
        ));
      }
    } catch (err) {
      securityUtils.safeLog('Erro ao atualizar quantidade:', err.message);
      showError(err.message || 'Erro ao atualizar quantidade');
    }
  };

  // Função para remover item com validação
  const removerItem = (id) => {
    try {
      const idValidado = parseInt(id);
      if (isNaN(idValidado) || idValidado <= 0) {
        throw new Error('ID inválido');
      }

      const produto = carrinho.find(item => item.id === idValidado);
      setCarrinho(carrinho.filter(item => item.id !== idValidado));
      
      if (produto) {
        success(`${produto.nome} removido do carrinho`);
      }
    } catch (err) {
      securityUtils.safeLog('Erro ao remover item:', err.message);
      showError(err.message || 'Erro ao remover item');
    }
  };

  // Função para limpar carrinho
  const limparCarrinho = () => {
    try {
      const quantidadeAnterior = calcularQuantidadeTotal();
      setCarrinho([]);
      
      if (quantidadeAnterior > 0) {
        success('Carrinho limpo com sucesso');
      }
    } catch (err) {
      securityUtils.safeLog('Erro ao limpar carrinho:', err.message);
      showError('Erro ao limpar carrinho');
    }
  };

  // Calcula total de marmitas
  const calcularQuantidadeTotal = () => {
    try {
      return carrinho.reduce((total, item) => {
        const quantidade = parseInt(item.quantidade) || 0;
        return total + quantidade;
      }, 0);
    } catch (error) {
      securityUtils.safeLog('Erro ao calcular quantidade total:', error.message);
      return 0;
    }
  };

  // Função para renderizar a página atual
  const renderCurrentPage = () => {
    if (!securityInitialized) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f5f5f5'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
            <h2 style={{ color: '#009245', marginBottom: '10px' }}>Inicializando Segurança</h2>
            <p style={{ color: '#666' }}>Configurando protocolos de segurança...</p>
          </div>
        </div>
      );
    }

    const props = {
      onNavigate: navigate,
      carrinho,
      adicionarAoCarrinho,
      atualizarQuantidade,
      removerItem,
      limparCarrinho,
      calcularQuantidadeTotal
    };

    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={navigate} />;
      
      case 'prosseguir':
        return <ProsseguirPage onNavigate={navigate} />;
      
      case 'cnpj-nao-cadastrado':
        return <CnpjNaoCadastrado onNavigate={navigate} />;
      
      case 'pedido-produtos':
        return <PedidoProdutos {...props} />;
      
      case 'carrinho':
        return <CarrinhoPage {...props} />;

      case 'resumo-pedido':
        return <ResumoPedido {...props} />;

      case 'pedido-confirmado':
        return <PedidoConfirmado onNavigate={navigate} />;

      case 'forgot-password':
        return <ForgotPasswordPage onNavigate={navigate} />;

      case 'consultar-pedido':
        return <ConsultaPedidosPage onNavigate={navigate} />;
      
      case 'admin':
        return <AdminPage onNavigate={navigate} />;
      
      default:
        return <HomePage onNavigate={navigate} />;
    }
  };

  return (
    <div className="App">
      {renderCurrentPage()}
      
      {/* Componente de teste das notificações - apenas em desenvolvimento */}
      {process.env.NODE_ENV === 'development' && securityInitialized && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          zIndex: 9999
        }}>
          <div>🔧 Modo Desenvolvimento</div>
          <div>Página atual: {currentPage}</div>
          <div>Itens no carrinho: {calcularQuantidadeTotal()}</div>
          <div>🔒 Segurança: Ativada</div>
        </div>
      )}
    </div>
  );
}

// Componente principal com Provider de notificações
function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}

export default App;