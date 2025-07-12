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

// Importa o AuthProvider e o hook useAuth
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const [carrinho, setCarrinho] = useState([]);
  const { success, error: showError } = useNotification();

  // Usa o hook de autenticação para obter o estado de login
  const { isAuthenticated, isAdmin } = useAuth();

  // Efeito para definir a página inicial com base no status de autenticação
  useEffect(() => {
    if (isAuthenticated) {
      setCurrentPage('prosseguir');
    } else {
      setCurrentPage('home');
    }
  }, [isAuthenticated]);

  // Lógica de segurança e carrinho (mantida como estava, pois é independente da sessão)
  useEffect(() => {
    securityUtils.enforceHTTPS();
    const carrinhoSalvo = sessionStorage.getItem('carrinho');
    if (carrinhoSalvo) {
      try {
        setCarrinho(JSON.parse(carrinhoSalvo));
      } catch (e) {
        sessionStorage.removeItem('carrinho');
      }
    }
  }, []);

  useEffect(() => {
    if (carrinho.length > 0) {
      sessionStorage.setItem('carrinho', JSON.stringify(carrinho));
    } else {
      sessionStorage.removeItem('carrinho');
    }
  }, [carrinho]);


  // Função de navegação agora protege as rotas
  const navigate = (page) => {
    const protectedPages = ['pedido-produtos', 'carrinho', 'resumo-pedido', 'consultar-pedido', 'prosseguir'];
    
    if (page === 'admin' && !isAdmin) {
      showError('Acesso negado. Você não tem permissão de administrador.');
      return;
    }

    if (protectedPages.includes(page) && !isAuthenticated) {
      showError('Você precisa fazer login para acessar esta página.');
      return;
    }
    
    setCurrentPage(page);
  };

  // Funções do carrinho (mantidas como estavam)
  const adicionarAoCarrinho = (produto, quantidadeAdicionar = 1) => {
    const itemExistente = carrinho.find(item => item.id === produto.id);
    if (itemExistente) {
      setCarrinho(carrinho.map(item =>
        item.id === produto.id
          ? { ...item, quantidade: item.quantidade + quantidadeAdicionar }
          : item
      ));
    } else {
      setCarrinho([...carrinho, { ...produto, quantidade: quantidadeAdicionar }]);
    }
    success(`${produto.nome} adicionado ao carrinho!`);
  };

  const atualizarQuantidade = (id, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      removerItem(id);
    } else {
      setCarrinho(carrinho.map(item => item.id === id ? { ...item, quantidade: novaQuantidade } : item));
    }
  };

  const removerItem = (id) => {
    setCarrinho(carrinho.filter(item => item.id !== id));
    success('Item removido do carrinho.');
  };

  const limparCarrinho = () => {
    setCarrinho([]);
    success('Carrinho limpo.');
  };

  const calcularQuantidadeTotal = () => {
    return carrinho.reduce((total, item) => total + item.quantidade, 0);
  };


  // Renderização de página baseada no estado de autenticação do Contexto
  const renderCurrentPage = () => {
    const props = {
      onNavigate: navigate,
      carrinho,
      adicionarAoCarrinho,
      atualizarQuantidade,
      removerItem,
      limparCarrinho,
      calcularQuantidadeTotal
    };

    // Páginas públicas (acessíveis sem login)
    if (!isAuthenticated) {
      switch (currentPage) {
        case 'home':
          return <HomePage onNavigate={navigate} />;
        case 'forgot-password':
          return <ForgotPasswordPage onNavigate={navigate} />;
        case 'cnpj-nao-cadastrado':
          return <CnpjNaoCadastrado onNavigate={navigate} />;
        default:
          // Se tentar acessar qualquer outra página, redireciona para home
          return <HomePage onNavigate={navigate} />;
      }
    }

    // Páginas privadas (acessíveis apenas com login)
    switch (currentPage) {
      case 'prosseguir':
        return <ProsseguirPage onNavigate={navigate} />;
      case 'pedido-produtos':
        return <PedidoProdutos {...props} />;
      case 'carrinho':
        return <CarrinhoPage {...props} />;
      case 'resumo-pedido':
        return <ResumoPedido {...props} />;
      case 'pedido-confirmado':
        return <PedidoConfirmado onNavigate={navigate} />;
      case 'consultar-pedido':
        return <ConsultaPedidosPage onNavigate={navigate} />;
      case 'admin':
        // A verificação de 'isAdmin' já foi feita na função navigate
        return <AdminPage onNavigate={navigate} />;
      default:
        // Se logado, a página padrão é a de 'prosseguir'
        return <ProsseguirPage onNavigate={navigate} />;
    }
  };

  return (
    <div className="App">
      {renderCurrentPage()}
    </div>
  );
}

// Componente principal que envolve a aplicação com os Providers
function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
