import React, { useState, useEffect } from 'react';

const PedidoProdutos = ({ onNavigate, carrinho, adicionarAoCarrinho, calcularQuantidadeTotal }) => {
  const [cnpjInfo, setCnpjInfo] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);

  // Produtos de exemplo (fallback)
  const produtos = [
    {
      id: 1,
      nome: 'Marmita Fitness Frango',
      descricao: 'Peito de frango grelhado, arroz integral, brócolis e cenoura',
      preco: 18.90,
      categoria: 'fitness',
      imagem: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop'
    },
    {
      id: 2,
      nome: 'Marmita Vegana',
      descricao: 'Quinoa, grão-de-bico, abobrinha refogada e salada verde',
      preco: 16.90,
      categoria: 'vegana',
      imagem: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop'
    },
    {
      id: 3,
      nome: 'Marmita Tradicional',
      descricao: 'Bife acebolado, arroz, feijão, farofa e salada',
      preco: 15.90,
      categoria: 'tradicional',
      imagem: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop'
    },
    {
      id: 4,
      nome: 'Marmita Low Carb',
      descricao: 'Salmão grelhado, couve-flor gratinada e aspargos',
      preco: 22.90,
      categoria: 'fitness',
      imagem: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=300&h=200&fit=crop'
    },
    {
      id: 5,
      nome: 'Marmita do Chef',
      descricao: 'Risotto de camarão com legumes e ervas finas',
      preco: 28.90,
      categoria: 'gourmet',
      imagem: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=300&h=200&fit=crop'
    },
    {
      id: 6,
      nome: 'Marmita Vegetariana',
      descricao: 'Lasanha de berinjela, salada de rúcula e tomate seco',
      preco: 17.90,
      categoria: 'vegana',
      imagem: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop'
    }
  ];

  const categorias = [
    { id: 'todos', nome: 'Todos os Produtos' },
    { id: 'fitness', nome: 'Fitness' },
    { id: 'vegana', nome: 'Vegana/Vegetariana' },
    { id: 'tradicional', nome: 'Tradicional' },
    { id: 'gourmet', nome: 'Gourmet' }
  ];

// No PedidoProdutos.jsx, substitua o useEffect:
useEffect(() => {
    // Recupera informações do sessionStorage
    const cnpj = sessionStorage.getItem('cnpj') || '';
    const empresa = sessionStorage.getItem('empresaInfo') || '';
    setCnpjInfo(`${empresa} - CNPJ: ${cnpj}`);
  
    // Carrega produtos do Supabase
    const carregarProdutos = async () => {
      try {
        const produtos = await produtoService.listarProdutos();
        setProdutosDisponiveis(produtos);
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        // Fallback para produtos padrão se der erro
        setProdutosDisponiveis(produtosPadrao);
      }
    };
  
    carregarProdutos();
  }, []);
  // Filtra produtos por categoria (usando produtos disponíveis)
  const produtosFiltrados = selectedCategory === 'todos' 
    ? produtosDisponiveis 
    : produtosDisponiveis.filter(produto => produto.categoria === selectedCategory);

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
        padding: '10px 40px',
        borderBottom: '1px solid #ccc',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <img 
          style={{ height: '60px' }}
          src="/assets/logo.jpg" 
          alt="Logo Fit In Box"
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <span style={{
            fontWeight: 'bold',
            color: '#009245',
            fontSize: '14px'
          }}>
            {cnpjInfo}
          </span>
          <button 
            onClick={irParaCarrinho}
            style={{
              padding: '10px 20px',
              borderRadius: '5px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: '#f38e3c',
              position: 'relative'
            }}
          >
            🛒 CARRINHO ({calcularQuantidadeTotal()})
          </button>
          <button 
            onClick={voltarProsseguir}
            style={{
              padding: '10px 20px',
              borderRadius: '5px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: '#009245'
            }}
          >
            VOLTAR
          </button>
        </div>
      </div>

      {/* Container Principal */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {/* Título */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <h1 style={{
            color: '#009245',
            fontSize: '32px',
            marginBottom: '10px'
          }}>
            🍽️ Nossos Produtos
          </h1>
          <p style={{
            color: '#666',
            fontSize: '16px'
          }}>
            Escolha suas marmitas saudáveis e saborosas
          </p>
        </div>

        {/* Filtros de Categoria */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '30px'
        }}>
          {categorias.map(categoria => (
            <button
              key={categoria.id}
              onClick={() => setSelectedCategory(categoria.id)}
              style={{
                padding: '10px 20px',
                border: '2px solid #009245',
                borderRadius: '25px',
                backgroundColor: selectedCategory === categoria.id ? '#009245' : 'white',
                color: selectedCategory === categoria.id ? 'white' : '#009245',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {categoria.nome}
            </button>
          ))}
        </div>

        {/* Grid de Produtos */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
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
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              {/* Imagem do Produto */}
              <img
                src={produto.imagem}
                alt={produto.nome}
                style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover'
                }}
              />
              
              {/* Conteúdo do Card */}
              <div style={{ padding: '20px' }}>
                <h3 style={{
                  color: '#009245',
                  fontSize: '18px',
                  marginBottom: '10px'
                }}>
                  {produto.nome}
                </h3>
                
                <p style={{
                  color: '#666',
                  fontSize: '14px',
                  lineHeight: '1.4',
                  marginBottom: '15px'
                }}>
                  {produto.descricao}
                </p>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#009245'
                  }}>
                    R$ {produto.preco.toFixed(2)}
                  </span>
                  
                  <button
                    onClick={() => adicionarAoCarrinho(produto)}
                    style={{
                      backgroundColor: '#f38e3c',
                      color: 'white',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '5px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    + Adicionar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Resumo do Carrinho */}
        {calcularQuantidadeTotal() > 0 && (
          <div style={{
            backgroundColor: '#009245',
            color: 'white',
            padding: '20px',
            borderRadius: '10px',
            textAlign: 'center',
            position: 'sticky',
            bottom: '20px'
          }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
              🛒 {calcularQuantidadeTotal()} marmita(s) no carrinho
              {calcularQuantidadeTotal() < 30 && (
                <span style={{ display: 'block', fontSize: '14px', marginTop: '5px' }}>
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
                padding: '15px 30px',
                borderRadius: '5px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '16px'
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