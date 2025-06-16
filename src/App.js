import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import ProsseguirPage from './components/ProsseguirPage';
import CnpjNaoCadastrado from './components/CnpjNaoCadastrado';
import PedidoProdutos from './components/PedidoProdutos';
import CarrinhoPage from './components/CarrinhoPage';
import CheckoutPage from './components/CheckoutPage';
import PedidoConfirmado from './components/PedidoConfirmado';
import AdminPage from './components/AdminPage';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [carrinho, setCarrinho] = useState([]);

  // Carrega carrinho do sessionStorage ao iniciar
  useEffect(() => {
    const carrinhoSalvo = sessionStorage.getItem('carrinho');
    if (carrinhoSalvo) {
      try {
        setCarrinho(JSON.parse(carrinhoSalvo));
      } catch (error) {
        console.error('Erro ao carregar carrinho:', error);
        setCarrinho([]);
      }
    }
  }, []);

  // Salva carrinho no sessionStorage sempre que muda
  useEffect(() => {
    try {
      sessionStorage.setItem('carrinho', JSON.stringify(carrinho));
    } catch (error) {
      console.error('Erro ao salvar carrinho:', error);
    }
  }, [carrinho]);

  // Função para navegar entre páginas
  const navigate = (page) => {
    setCurrentPage(page);
  };

  // Função para adicionar ao carrinho - CORRIGIDA
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
  };

  // Função para atualizar quantidade
  const atualizarQuantidade = (id, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      setCarrinho(carrinho.filter(item => item.id !== id));
    } else {
      setCarrinho(carrinho.map(item =>
        item.id === id
          ? { ...item, quantidade: novaQuantidade }
          : item
      ));
    }
  };

  // Função para remover item
  const removerItem = (id) => {
    setCarrinho(carrinho.filter(item => item.id !== id));
  };

  // Função para limpar carrinho
  const limparCarrinho = () => {
    setCarrinho([]);
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
            <p>Página de consulta em construção...</p>
            <button 
              onClick={() => navigate('prosseguir')}
              style={{
                backgroundColor: '#009245',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginTop: '20px'
              }}
            >
              Voltar
            </button>
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
    </div>
  );
}

export default App;