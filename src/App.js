import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import ProsseguirPage from './components/ProsseguirPage';
import CnpjNaoCadastrado from './components/CnpjNaoCadastrado';
import PedidoProdutos from './components/PedidoProdutos';
import CarrinhoPage from './components/CarrinhoPage';
import CheckoutPage from './components/CheckoutPage';
import PedidoConfirmado from './components/PedidoConfirmado';
import AdminPage from './components/AdminPage';
import { NotificationProvider, useNotification } from './components/NotificationSystem';

// Wrapper do App para usar o hook de notificações
function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const [carrinho, setCarrinho] = useState([]);
  const { success, error, warning } = useNotification();

  // Carrega carrinho do sessionStorage ao iniciar
  useEffect(() => {
    const carrinhoSalvo = sessionStorage.getItem('carrinho');
    if (carrinhoSalvo) {
      try {
        const carrinhoData = JSON.parse(carrinhoSalvo);
        setCarrinho(carrinhoData);
        
        if (carrinhoData.length > 0) {
          const totalItens = carrinhoData.reduce((total, item) => total + item.quantidade, 0);
          success(`Carrinho restaurado com ${totalItens} item(s)`, 3000);
        }
      } catch (error) {
        console.error('Erro ao carregar carrinho:', error);
        setCarrinho([]);
        error('Erro ao restaurar carrinho anterior');
      }
    }
  }, [success, error]);

  // Salva carrinho no sessionStorage sempre que muda
  useEffect(() => {
    try {
      sessionStorage.setItem('carrinho', JSON.stringify(carrinho));
    } catch (error) {
      console.error('Erro ao salvar carrinho:', error);
      error('Erro ao salvar carrinho');
    }
  }, [carrinho, error]);

  // Função para navegar entre páginas
  const navigate = (page) => {
    setCurrentPage(page);
  };

  // Função para adicionar ao carrinho - MELHORADA
  const adicionarAoCarrinho = (produto, quantidadeAdicionar = 1) => {
    try {
      const itemExistente = carrinho.find(item => item.id === produto.id);
      
      if (itemExistente) {
        const novaQuantidade = itemExistente.quantidade + quantidadeAdicionar;
        setCarrinho(carrinho.map(item => 
          item.id === produto.id 
            ? { ...item, quantidade: novaQuantidade }
            : item
        ));
        
        success(`${quantidadeAdicionar}x ${produto.nome} adicionado ao carrinho`, 2000);
      } else {
        setCarrinho([...carrinho, { ...produto, quantidade: quantidadeAdicionar }]);
        success(`${produto.nome} adicionado ao carrinho!`, 2000);
      }
      
      // Aviso sobre pedido mínimo
      const novaQuantidadeTotal = calcularQuantidadeTotal() + quantidadeAdicionar;
      if (novaQuantidadeTotal >= 25 && novaQuantidadeTotal < 30) {
        warning(`Você está quase lá! Faltam ${30 - novaQuantidadeTotal} marmitas para o pedido mínimo.`);
      }
      
    } catch (err) {
      error('Erro ao adicionar produto ao carrinho');
      console.error('Erro ao adicionar ao carrinho:', err);
    }
  };

  // Função para atualizar quantidade - MELHORADA
  const atualizarQuantidade = (id, novaQuantidade) => {
    try {
      const produto = carrinho.find(item => item.id === id);
      
      if (novaQuantidade <= 0) {
        setCarrinho(carrinho.filter(item => item.id !== id));
        if (produto) {
          success(`${produto.nome} removido do carrinho`);
        }
      } else {
        setCarrinho(carrinho.map(item =>
          item.id === id
            ? { ...item, quantidade: novaQuantidade }
            : item
        ));
      }
    } catch (err) {
      error('Erro ao atualizar quantidade');
      console.error('Erro ao atualizar quantidade:', err);
    }
  };

  // Função para remover item - MELHORADA
  const removerItem = (id) => {
    try {
      const produto = carrinho.find(item => item.id === id);
      setCarrinho(carrinho.filter(item => item.id !== id));
      
      if (produto) {
        success(`${produto.nome} removido do carrinho`);
      }
    } catch (err) {
      error('Erro ao remover item');
      console.error('Erro ao remover item:', err);
    }
  };

  // Função para limpar carrinho - MELHORADA
  const limparCarrinho = () => {
    try {
      const quantidadeAnterior = calcularQuantidadeTotal();
      setCarrinho([]);
      
      if (quantidadeAnterior > 0) {
        success('Carrinho limpo com sucesso');
      }
    } catch (err) {
      error('Erro ao limpar carrinho');
      console.error('Erro ao limpar carrinho:', err);
    }
  };

  // Calcula total de marmitas
  const calcularQuantidadeTotal = () => {
    return carrinho.reduce((total, item) => total + item.quantidade, 0);
  };

  // Função para renderizar a página atual
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

      case 'checkout':
        return <CheckoutPage {...props} />;

      case 'pedido-confirmado':
        return <PedidoConfirmado onNavigate={navigate} />;

      case 'consultar-pedido':
        return (
          <div style={{ 
            padding: '50px', 
            textAlign: 'center',
            backgroundColor: '#f5f5f5',
            minHeight: '100vh',
            fontFamily: 'Arial, sans-serif'
          }}>
            <h1 style={{ color: '#009245' }}>📋 Consultar Pedidos</h1>
            <div style={{
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '10px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              maxWidth: '600px',
              margin: '20px auto'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚧</div>
              <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>
                Página de consulta em construção...
              </p>
              <p style={{ fontSize: '14px', color: '#999', marginBottom: '30px' }}>
                Em breve você poderá consultar todos os seus pedidos aqui.
              </p>
              <button 
                onClick={() => navigate('prosseguir')}
                style={{
                  backgroundColor: '#009245',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Voltar
              </button>
            </div>
          </div>
        );
      
      case 'admin':
        return <AdminPage onNavigate={navigate} />;
      
      default:
        return <HomePage onNavigate={navigate} />;
    }
  };

  return (
    <div className="App">
      {renderCurrentPage()}
      
      {/* Componente de teste das notificações - remover em produção */}
      {process.env.NODE_ENV === 'development' && (
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