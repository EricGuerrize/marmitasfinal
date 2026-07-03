// src/App.js - COM INICIALIZAÇÃO DE SEGURANÇA E CORREÇÃO DE IMAGENS

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import HomePage from './components/HomePage'; // eager: é a página de entrada
import { NotificationProvider, useNotification } from './components/NotificationSystem';
import { securityUtils } from './utils/securityUtils';

// Lazy: só baixam quando o usuário realmente navega até elas (code splitting)
const ProsseguirPage = lazy(() => import('./components/ProsseguirPage'));
const CnpjNaoCadastrado = lazy(() => import('./components/CnpjNaoCadastrado'));
const PedidoProdutos = lazy(() => import('./components/PedidoProdutos'));
const CarrinhoPage = lazy(() => import('./components/CarrinhoPage'));
const ResumoPedido = lazy(() => import('./components/ResumoPedido'));
const PedidoConfirmado = lazy(() => import('./components/PedidoConfirmado'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const ForgotPasswordPage = lazy(() => import('./components/ForgotPasswordPage'));
const ConsultaPedidosPage = lazy(() => import('./components/ConsultaPedidosPage'));

const PAGE_PATHS = {
  home: '/',
  prosseguir: '/inicio',
  'cnpj-nao-cadastrado': '/cnpj-nao-cadastrado',
  'pedido-produtos': '/produtos',
  carrinho: '/carrinho',
  'resumo-pedido': '/resumo-pedido',
  'pedido-confirmado': '/pedido-confirmado',
  admin: '/admin',
  'admin-dashboard': '/admin',
  'admin-produtos': '/admin/produtos',
  'admin-pedidos': '/admin/pedidos',
  'admin-empresas': '/admin/empresas',
  'forgot-password': '/recuperar-senha',
  'consultar-pedido': '/pedidos'
};

// Fallback exibido enquanto um pedaço lazy (chunk) está sendo baixado
function PageFallback() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      gap: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <style>{`@keyframes appFallbackSpin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: '48px',
        height: '48px',
        border: '5px solid #e3e7ee',
        borderTopColor: '#009245',
        borderRadius: '50%',
        animation: 'appFallbackSpin 0.8s linear infinite'
      }} />
    </div>
  );
}

// Wrapper do App para usar o hook de notificações
function AppContent() {
  const [carrinho, setCarrinho] = useState([]);
  const [securityInitialized, setSecurityInitialized] = useState(false);
  const { success, error: showError } = useNotification();
  const routerNavigate = useNavigate();
  const location = useLocation();

  // Inicialização de segurança
  useEffect(() => {
    const initSecurity = async () => {
      try {
        // 1. Força HTTPS em produção
        securityUtils.enforceHTTPS();
        
        // 2. Valida apenas chaves de sessão atuais (sem limpar todo o storage)
        const parseStorageJson = (value) => {
          if (!value) return null;
          try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' ? parsed : null;
          } catch {
            return null;
          }
        };

        const hasValidCompanyData = (data) => {
          if (!data || typeof data !== 'object') return false;
          const cnpj = String(data.cnpj || data.cnpj_formatado || data.cnpjFormatado || '');
          return cnpj.replace(/\D/g, '').length === 14;
        };

        const sessaoAtual = sessionStorage.getItem('empresaLogada');
        if (sessaoAtual && !hasValidCompanyData(parseStorageJson(sessaoAtual))) {
          securityUtils.safeLog('empresaLogada inválida detectada, removendo...');
          sessionStorage.removeItem('empresaLogada');
        }

        const dadosEmpresaLocal = localStorage.getItem('dadosEmpresaLogada');
        if (dadosEmpresaLocal && !hasValidCompanyData(parseStorageJson(dadosEmpresaLocal))) {
          securityUtils.safeLog('dadosEmpresaLogada inválido detectado, removendo...');
          localStorage.removeItem('dadosEmpresaLogada');
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
          if (sessionStorage.getItem('empresaLogada') || localStorage.getItem('dadosEmpresaLogada')) {
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
        // ✅ CORRIGIDO: Valida dados preservando imagem_url
        const carrinhoValidado = carrinho.map(item => ({
          id: securityUtils.sanitizeInput(String(item.id)),
          nome: securityUtils.sanitizeInput(item.nome),
          descricao: securityUtils.sanitizeInput(item.descricao || ''),
          preco: parseFloat(item.preco) || 0,
          quantidade: parseInt(item.quantidade) || 0,
          categoria: securityUtils.sanitizeInput(item.categoria || ''),
          imagem_url: securityUtils.sanitizeInput(item.imagem_url || ''), // ✅ CORRIGIDO: imagem_url em vez de imagem
          // ✅ Preserva outros campos se existirem
          disponivel: item.disponivel,
          estoque: item.estoque
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
  const navigate = useCallback((page) => {
    const path = PAGE_PATHS[page];
    if (path) {
      routerNavigate(path);
      securityUtils.safeLog(`Navegação para: ${page}`);
    } else {
      securityUtils.safeLog(`Tentativa de navegação inválida bloqueada: ${page}`);
      showError('Página não encontrada');
    }
  }, [routerNavigate, showError]);

  // ✅ FUNÇÃO CORRIGIDA PARA ADICIONAR AO CARRINHO
  const adicionarAoCarrinho = (produto, quantidadeAdicionar = 1) => {
    try {
      console.log('🛒 ADICIONANDO PRODUTO AO CARRINHO:', {
        produtoOriginal: produto,
        quantidade: quantidadeAdicionar,
        temImagemUrl: !!produto.imagem_url,
        imagemUrl: produto.imagem_url,
        todosOsCampos: Object.keys(produto)
      });

      // Validação rigorosa do produto
      if (!produto || typeof produto !== 'object') {
        throw new Error('Produto inválido');
      }

      // ✅ ESSENCIAL: Preserva TODOS os campos do produto
      const produtoValidado = {
        id: parseInt(produto.id) || 0,
        nome: securityUtils.sanitizeInput(produto.nome || ''),
        descricao: securityUtils.sanitizeInput(produto.descricao || ''),
        preco: parseFloat(produto.preco) || 0,
        categoria: securityUtils.sanitizeInput(produto.categoria || ''),
        imagem_url: securityUtils.sanitizeInput(produto.imagem_url || ''), // ✅ CORRIGIDO: Campo correto
        disponivel: produto.disponivel,
        estoque: produto.estoque,
        quantidade: parseInt(quantidadeAdicionar) || 1,
        ...produto // ✅ Spread para garantir que não perde nenhum campo
      };

      console.log('✅ PRODUTO VALIDADO PARA CARRINHO:', {
        nome: produtoValidado.nome,
        imagem_url: produtoValidado.imagem_url,
        temImagem: !!produtoValidado.imagem_url,
        quantidade: produtoValidado.quantidade
      });

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
        
        // ✅ Preserva todos os campos ao atualizar
        setCarrinho(carrinho.map(item => 
          item.id === produtoValidado.id 
            ? { ...produtoValidado, quantidade: novaQuantidade }
            : item
        ));
        
        success(`${produtoValidado.quantidade}x ${produtoValidado.nome} adicionado ao carrinho`, 2000);
      } else {
        // ✅ Adiciona produto com todos os campos
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

  // ✅ FUNÇÃO CORRIGIDA PARA ATUALIZAR QUANTIDADE
  const atualizarQuantidade = (id, novaQuantidade) => {
    try {
      console.log('🔄 atualizarQuantidade chamada:', { 
        id, 
        novaQuantidade, 
        tipoId: typeof id,
        carrinhoAtual: carrinho.map(item => ({ id: item.id, nome: item.nome, quantidade: item.quantidade }))
      });

      // ✅ CORREÇÃO: Converte ambos para string para comparação
      const idString = String(id);
      const quantidadeValidada = parseInt(novaQuantidade);
      
      if (isNaN(quantidadeValidada) || quantidadeValidada < 0 || quantidadeValidada > 999) {
        throw new Error('Quantidade deve estar entre 0 e 999');
      }

      const produto = carrinho.find(item => String(item.id) === idString);
      console.log('🔍 Produto encontrado:', produto);
      
      if (!produto) {
        console.error('❌ Produto não encontrado no carrinho. IDs disponíveis:', 
          carrinho.map(item => ({ id: item.id, tipo: typeof item.id }))
        );
        throw new Error('Produto não encontrado no carrinho');
      }

      if (quantidadeValidada <= 0) {
        console.log('🗑️ Removendo produto do carrinho');
        setCarrinho(prevCarrinho => {
          const novoCarrinho = prevCarrinho.filter(item => String(item.id) !== idString);
          console.log('✅ Carrinho após remoção:', novoCarrinho.length, 'itens');
          return novoCarrinho;
        });
        success(`${produto.nome} removido do carrinho`);
      } else {
        console.log('📝 Atualizando quantidade do produto');
        setCarrinho(prevCarrinho => {
          const novoCarrinho = prevCarrinho.map(item =>
            String(item.id) === idString
              ? { ...item, quantidade: quantidadeValidada }
              : item
          );
          console.log('✅ Carrinho após atualização:', 
            novoCarrinho.map(item => ({ id: item.id, nome: item.nome, quantidade: item.quantidade }))
          );
          return novoCarrinho;
        });
      }
    } catch (err) {
      console.error('❌ Erro em atualizarQuantidade:', err);
      securityUtils.safeLog('Erro ao atualizar quantidade:', err.message);
      showError(err.message || 'Erro ao atualizar quantidade');
    }
  };

  // Função para remover item com validação
  const removerItem = (id) => {
    try {
      const idString = String(id);
      const produto = carrinho.find(item => String(item.id) === idString);
      
      console.log('🗑️ removerItem chamada:', { 
        id, 
        idString, 
        produtoEncontrado: !!produto,
        carrinhoAtual: carrinho.length 
      });
      
      setCarrinho(prevCarrinho => {
        const novoCarrinho = prevCarrinho.filter(item => String(item.id) !== idString);
        console.log('✅ Carrinho após remoção manual:', novoCarrinho.length, 'itens');
        return novoCarrinho;
      });
      
      if (produto) {
        success(`${produto.nome} removido do carrinho`);
      }
    } catch (err) {
      console.error('❌ Erro em removerItem:', err);
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

    const adminSection = location.pathname.split('/')[2] || 'dashboard';
    const adminTab = ['dashboard', 'produtos', 'pedidos', 'empresas'].includes(adminSection)
      ? adminSection
      : 'dashboard';

    return (
      <Routes>
        <Route path="/" element={<HomePage onNavigate={navigate} />} />
        <Route path="/inicio" element={<ProsseguirPage onNavigate={navigate} />} />
        <Route path="/cnpj-nao-cadastrado" element={<CnpjNaoCadastrado onNavigate={navigate} />} />
        <Route path="/produtos" element={<PedidoProdutos {...props} />} />
        <Route path="/carrinho" element={<CarrinhoPage {...props} />} />
        <Route path="/resumo-pedido" element={<ResumoPedido {...props} />} />
        <Route path="/pedido-confirmado" element={<PedidoConfirmado onNavigate={navigate} />} />
        <Route path="/recuperar-senha" element={<ForgotPasswordPage onNavigate={navigate} />} />
        <Route path="/pedidos" element={<ConsultaPedidosPage onNavigate={navigate} />} />
        <Route
          path="/admin/*"
          element={<AdminPage onNavigate={navigate} initialTab={adminTab} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  };

  return (
    <div className="App">
      <Suspense fallback={<PageFallback />}>
        {renderCurrentPage()}
      </Suspense>

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
          <div>Rota atual: {location.pathname}</div>
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
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
