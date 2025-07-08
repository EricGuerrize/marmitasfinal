import React, { useState, useEffect } from 'react';
import { produtoService } from '../services/produtoService';
import LogoComponent from './LogoComponent';
import OptimizedImage from './OptimizedImage';

const PedidoProdutos = ({ onNavigate, carrinho, adicionarAoCarrinho, calcularQuantidadeTotal }) => {
  const [cnpj, setCnpj] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [quantidades, setQuantidades] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  // Produtos de exemplo otimizados (fallback)
  const produtos = [
    {
      id: 1,
      nome: 'Marmita Fitness Frango',
      descricao: 'Peito de frango grelhado, arroz integral, brócolis e cenoura',
      preco: 18.90,
      categoria: 'fitness',
      imagem: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
      disponivel: true
    },
    {
      id: 2,
      nome: 'Marmita Vegana',
      descricao: 'Quinoa, grão-de-bico, abobrinha refogada e salada verde',
      preco: 16.90,
      categoria: 'vegana',
      imagem: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
      disponivel: true
    },
    {
      id: 3,
      nome: 'Marmita Tradicional',
      descricao: 'Bife acebolado, arroz, feijão, farofa e salada',
      preco: 15.90,
      categoria: 'tradicional',
      imagem: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445',
      disponivel: true
    },
    {
      id: 4,
      nome: 'Marmita Low Carb',
      descricao: 'Salmão grelhado, couve-flor gratinada e aspargos',
      preco: 22.90,
      categoria: 'fitness',
      imagem: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
      disponivel: true
    },
    {
      id: 5,
      nome: 'Marmita do Chef',
      descricao: 'Risotto de camarão com legumes e ervas finas',
      preco: 28.90,
      categoria: 'gourmet',
      imagem: 'https://images.unsplash.com/photo-1563379091339-03246963d96c',
      disponivel: true
    },
    {
      id: 6,
      nome: 'Marmita Vegetariana',
      descricao: 'Lasanha de berinjela, salada de rúcula e tomate seco',
      preco: 17.90,
      categoria: 'vegana',
      imagem: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b',
      disponivel: true
    },
    {
      id: 7,
      nome: 'Marmita Proteica',
      descricao: 'Carne vermelha magra, batata doce e mix de vegetais',
      preco: 21.90,
      categoria: 'fitness',
      imagem: 'https://images.unsplash.com/photo-1551782450-17144efb9c50',
      disponivel: true
    },
    {
      id: 8,
      nome: 'Marmita Detox',
      descricao: 'Salada completa com grãos, frutas e molho especial',
      preco: 19.90,
      categoria: 'vegana',
      imagem: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
      disponivel: true
    },
    {
      id: 9,
      nome: 'Marmita Executiva',
      descricao: 'Peixe grelhado, arroz de brócolis e legumes sauteados',
      preco: 25.90,
      categoria: 'gourmet',
      imagem: 'https://images.unsplash.com/photo-1546793665-c74683f339c1',
      disponivel: true
    },
    {
      id: 10,
      nome: 'Marmita Caseira',
      descricao: 'Frango desfiado, purê de batata e salada mista',
      preco: 16.90,
      categoria: 'tradicional',
      imagem: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445',
      disponivel: true
    },
    {
      id: 11,
      nome: 'Marmita Mediterrânea',
      descricao: 'Salmão com ervas, quinoa e mix de folhas verdes',
      preco: 26.90,
      categoria: 'gourmet',
      imagem: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
      disponivel: true
    },
    {
      id: 12,
      nome: 'Marmita Kids',
      descricao: 'Frango empanado, arroz colorido e cenoura refogada',
      preco: 14.90,
      categoria: 'tradicional',
      imagem: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b',
      disponivel: true
    }
  ];

  const categorias = [
    { id: 'todos', nome: 'Todos os Produtos' },
    { id: 'fitness', nome: 'Fitness' },
    { id: 'vegana', nome: 'Vegana/Vegetariana' },
    { id: 'tradicional', nome: 'Tradicional' },
    { id: 'gourmet', nome: 'Gourmet' }
  ];

  // Detecta se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Recupera informações do sessionStorage - APENAS CNPJ
    const cnpjInfo = sessionStorage.getItem('cnpj') || '';
    setCnpj(cnpjInfo);

    // Carrega produtos do localStorage/admin ou usa produtos padrão
    const carregarProdutos = async () => {
      try {
        // Primeiro tenta carregar do localStorage (produtos do admin)
        const produtosAdmin = localStorage.getItem('adminProdutos');
        if (produtosAdmin) {
          const produtosParsed = JSON.parse(produtosAdmin);
          const produtosAtivos = produtosParsed.filter(p => p.disponivel);
          if (produtosAtivos.length > 0) {
            setProdutosDisponiveis(produtosAtivos);
            return;
          }
        }

        // Se não tem produtos do admin, tenta Supabase
        const produtosSupabase = await produtoService.listarProdutos();
        if (produtosSupabase && produtosSupabase.length > 0) {
          setProdutosDisponiveis(produtosSupabase);
        } else {
          // Fallback para produtos padrão
          setProdutosDisponiveis(produtos);
        }
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        // Fallback para produtos padrão se der erro
        setProdutosDisponiveis(produtos);
      }
    };

    carregarProdutos();

    // Atualiza produtos a cada 5 segundos para pegar mudanças do admin
    const intervalId = setInterval(carregarProdutos, 5000);
    
    // Intercepta o botão voltar do navegador
    const handlePopState = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onNavigate('prosseguir');
      return false;
    };
    
    // Remove qualquer listener anterior
    window.removeEventListener('popstate', handlePopState);
    window.addEventListener('popstate', handlePopState);
    
    // Adiciona uma entrada no histórico para interceptar o botão voltar
    window.history.pushState({ page: 'produtos' }, '', window.location.pathname);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearInterval(intervalId);
    };
  }, [onNavigate]);

  // Filtra produtos por categoria
  const produtosFiltrados = selectedCategory === 'todos' 
    ? produtosDisponiveis 
    : produtosDisponiveis.filter(produto => produto.categoria === selectedCategory);

  // Funções para controlar quantidade
  const getQuantidade = (produtoId) => {
    return quantidades[produtoId] || 1;
  };

  const updateQuantidade = (produtoId, novaQuantidade) => {
    if (novaQuantidade >= 1 && novaQuantidade <= 999) {
      setQuantidades(prev => ({
        ...prev,
        [produtoId]: novaQuantidade
      }));
    }
  };

  // Função para lidar com input direto da quantidade
  const handleQuantidadeInput = (produtoId, value) => {
    const quantidade = parseInt(value) || 1;
    updateQuantidade(produtoId, quantidade);
  };

  // Adiciona produto com quantidade escolhida
  const adicionarProdutoComQuantidade = (produto) => {
    const quantidade = getQuantidade(produto.id);
    adicionarAoCarrinho(produto, quantidade);
    // Reset quantidade após adicionar
    setQuantidades(prev => ({
      ...prev,
      [produto.id]: 1
    }));
  };

  const irParaCarrinho = () => {
    onNavigate('carrinho');
  };

  const voltarProsseguir = () => {
    onNavigate('prosseguir');
  };

  return (
    <div style={{
      margin: 0,
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '10px 15px' : '10px 40px',
        borderBottom: '1px solid #ccc',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        <LogoComponent 
          size={isMobile ? 'small' : 'medium'}
          showText={true}
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '10px' : '20px',
          flexDirection: isMobile ? 'column' : 'row',
          marginTop: isMobile ? '10px' : '0',
          width: isMobile ? '100%' : 'auto'
        }}>
          <span style={{
            fontWeight: 'bold',
            color: '#009245',
            fontSize: isMobile ? '12px' : '14px',
            textAlign: 'center'
          }}>
            CNPJ: {cnpj}
          </span>
          <div style={{
            display: 'flex',
            gap: '10px',
            flexDirection: isMobile ? 'column' : 'row',
            width: isMobile ? '100%' : 'auto'
          }}>
            <button 
              onClick={irParaCarrinho}
              style={{
                padding: isMobile ? '8px 15px' : '10px 20px',
                borderRadius: '5px',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                border: 'none',
                backgroundColor: '#f38e3c',
                position: 'relative',
                fontSize: isMobile ? '14px' : '16px',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              🛒 CARRINHO ({calcularQuantidadeTotal()})
            </button>
            <button 
              onClick={voltarProsseguir}
              style={{
                padding: isMobile ? '8px 15px' : '10px 20px',
                borderRadius: '5px',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                border: 'none',
                backgroundColor: '#009245',
                fontSize: isMobile ? '14px' : '16px',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              VOLTAR
            </button>
          </div>
        </div>
      </div>

      {/* Container Principal */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: isMobile ? '10px' : '20px'
      }}>
        {/* Título */}
        <div style={{
          textAlign: 'center',
          marginBottom: isMobile ? '20px' : '30px'
        }}>
          <h1 style={{
            color: '#009245',
            fontSize: isMobile ? '24px' : '32px',
            marginBottom: '10px',
            margin: isMobile ? '10px 0' : '0 0 10px 0'
          }}>
            🍽️ Nossos Produtos
          </h1>
          <p style={{
            color: '#666',
            fontSize: isMobile ? '14px' : '16px',
            margin: 0,
            padding: isMobile ? '0 10px' : '0'
          }}>
            Escolha suas marmitas saudáveis e saborosas
          </p>
        </div>

        {/* Filtros de Categoria */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: isMobile ? '8px' : '10px',
          marginBottom: isMobile ? '20px' : '30px',
          padding: isMobile ? '0 10px' : '0'
        }}>
          {categorias.map(categoria => (
            <button
              key={categoria.id}
              onClick={() => setSelectedCategory(categoria.id)}
              style={{
                padding: isMobile ? '8px 12px' : '10px 20px',
                border: '2px solid #009245',
                borderRadius: isMobile ? '20px' : '25px',
                backgroundColor: selectedCategory === categoria.id ? '#009245' : 'white',
                color: selectedCategory === categoria.id ? 'white' : '#009245',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: isMobile ? '12px' : '14px',
                whiteSpace: 'nowrap'
              }}
            >
              {categoria.nome}
            </button>
          ))}
        </div>

        {/* Loading ou mensagem se não tem produtos */}
        {produtosDisponiveis.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: isMobile ? '30px 20px' : '50px',
            color: '#666'
          }}>
            <div style={{ fontSize: isMobile ? '32px' : '48px', marginBottom: '20px' }}>🍽️</div>
            <h3 style={{ fontSize: isMobile ? '18px' : '24px' }}>Carregando produtos...</h3>
            <p style={{ fontSize: isMobile ? '14px' : '16px' }}>Aguarde enquanto carregamos nosso delicioso cardápio!</p>
          </div>
        )}

        {/* Grid de Produtos */}
        {produtosDisponiveis.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile 
              ? '1fr' 
              : 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: isMobile ? '15px' : '20px',
            marginBottom: isMobile ? '20px' : '40px',
            padding: isMobile ? '0 10px' : '0'
          }}>
            {produtosFiltrados.map(produto => (
              <div
                key={produto.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  transition: 'transform 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) e.currentTarget.style.transform = 'translateY(-5px)';
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Imagem do Produto Otimizada */}
                <OptimizedImage
                  src={produto.imagem}
                  alt={produto.nome}
                  width={300}
                  height={200}
                  isMobile={isMobile}
                  lazy={true}
                />
                
                {/* Conteúdo do Card */}
                <div style={{ padding: isMobile ? '15px' : '20px' }}>
                  <h3 style={{
                    color: '#009245',
                    fontSize: isMobile ? '16px' : '18px',
                    marginBottom: '10px',
                    lineHeight: '1.2'
                  }}>
                    {produto.nome}
                  </h3>
                  
                  <p style={{
                    color: '#666',
                    fontSize: isMobile ? '13px' : '14px',
                    lineHeight: '1.4',
                    marginBottom: '15px'
                  }}>
                    {produto.descricao}
                  </p>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '15px' : '0'
                  }}>
                    <span style={{
                      fontSize: isMobile ? '20px' : '24px',
                      fontWeight: 'bold',
                      color: '#009245'
                    }}>
                      R$ {produto.preco.toFixed(2)}
                    </span>
                    
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                      width: isMobile ? '100%' : 'auto'
                    }}>
                      {/* Controle de Quantidade */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '20px',
                        padding: '5px',
                        width: isMobile ? '100%' : 'auto',
                        justifyContent: isMobile ? 'center' : 'flex-start'
                      }}>
                        <button
                          onClick={() => updateQuantidade(produto.id, getQuantidade(produto.id) - 1)}
                          style={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            width: isMobile ? '35px' : '30px',
                            height: isMobile ? '35px' : '30px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold'
                          }}
                        >
                          -
                        </button>
                        
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={getQuantidade(produto.id)}
                          onChange={(e) => handleQuantidadeInput(produto.id, e.target.value)}
                          style={{
                            width: isMobile ? '60px' : '50px',
                            height: '30px',
                            border: '1px solid #ddd',
                            borderRadius: '5px',
                            textAlign: 'center',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#009245',
                            backgroundColor: 'white'
                          }}
                        />
                        
                        <button
                          onClick={() => updateQuantidade(produto.id, getQuantidade(produto.id) + 1)}
                          style={{
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            width: isMobile ? '35px' : '30px',
                            height: isMobile ? '35px' : '30px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold'
                          }}
                        >
                          +
                        </button>
                      </div>
                      
                      {/* Botão Adicionar */}
                      <button
                        onClick={() => adicionarProdutoComQuantidade(produto)}
                        style={{
                          backgroundColor: '#f38e3c',
                          color: 'white',
                          border: 'none',
                          padding: isMobile ? '10px 20px' : '8px 16px',
                          borderRadius: '5px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: isMobile ? '16px' : '14px',
                          width: isMobile ? '100%' : '100px'
                        }}
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mensagem se categoria não tem produtos */}
        {produtosDisponiveis.length > 0 && produtosFiltrados.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: isMobile ? '30px 20px' : '50px',
            color: '#666'
          }}>
            <div style={{ fontSize: isMobile ? '32px' : '48px', marginBottom: '20px' }}>🔍</div>
            <h3 style={{ fontSize: isMobile ? '18px' : '24px' }}>Nenhum produto encontrado</h3>
            <p style={{ fontSize: isMobile ? '14px' : '16px' }}>Não há produtos disponíveis nesta categoria no momento.</p>
          </div>
        )}

        {/* Resumo do Carrinho */}
        {calcularQuantidadeTotal() > 0 && (
          <div style={{
            backgroundColor: '#009245',
            color: 'white',
            padding: isMobile ? '15px' : '20px',
            borderRadius: '10px',
            textAlign: 'center',
            position: 'sticky',
            bottom: isMobile ? '10px' : '20px',
            margin: isMobile ? '0 10px' : '0',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <p style={{ 
              margin: '0 0 10px 0', 
              fontSize: isMobile ? '14px' : '16px',
              lineHeight: '1.4'
            }}>
              🛒 {calcularQuantidadeTotal()} marmita(s) no carrinho
              {calcularQuantidadeTotal() < 30 && (
                <span style={{ 
                  display: 'block', 
                  fontSize: isMobile ? '12px' : '14px', 
                  marginTop: '5px' 
                }}>
                  ⚠️ Mínimo: 30 marmitas (faltam {30 - calcularQuantidadeTotal()})
                </span>
              )}
            </p>
            <button
              onClick={irParaCarrinho}
              style={{
                backgroundColor: '#f38e3c',
                color: 'white',
                border: 'none',
                padding: isMobile ? '12px 20px' : '15px 30px',
                borderRadius: '5px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: isMobile ? '14px' : '16px',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              Ver Carrinho e Finalizar Pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PedidoProdutos;
