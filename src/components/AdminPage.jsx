import React, { useState, useEffect } from 'react';

const AdminPage = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('produtos');
  const [produtos, setProdutos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Form states para adicionar/editar produto
  const [productForm, setProductForm] = useState({
    nome: '',
    descricao: '',
    preco: '',
    categoria: 'fitness',
    imagem: '',
    disponivel: true,
    estoque: 100
  });

  // Estados para dashboard
  const [stats, setStats] = useState({
    totalPedidos: 0,
    totalVendas: 0,
    produtosMaisVendidos: [],
    pedidosHoje: 0
  });

  useEffect(() => {
    // Carrega produtos do localStorage (simulando backend)
    loadProducts();
    
    // Carrega pedidos simulados
    const pedidosSimulados = [
      {
        id: 1,
        numero: 1001,
        cliente: 'H Azevedo de Abreu',
        cnpj: '05.336.475/0001-77',
        total: 567.00,
        status: 'confirmado',
        data: new Date().toISOString(),
        itens: [
          { nome: 'Marmita Fitness Frango', quantidade: 15, preco: 18.90 },
          { nome: 'Marmita Vegana', quantidade: 15, preco: 16.90 }
        ]
      },
      {
        id: 2,
        numero: 1002,
        cliente: 'Empresa ABC Ltda',
        cnpj: '11.111.111/0001-11',
        total: 954.00,
        status: 'preparando',
        data: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        itens: [
          { nome: 'Marmita Tradicional', quantidade: 30, preco: 15.90 },
          { nome: 'Marmita Fitness Frango', quantidade: 30, preco: 18.90 }
        ]
      }
    ];
    setPedidos(pedidosSimulados);

    // Calcula estatísticas
    calcularEstatisticas(pedidosSimulados);
  }, []);

  const loadProducts = () => {
    const produtosSalvos = localStorage.getItem('adminProdutos');
    if (produtosSalvos) {
      setProdutos(JSON.parse(produtosSalvos));
    } else {
      // Produtos iniciais padrão
      const produtosIniciais = [
        {
          id: 1,
          nome: 'Marmita Fitness Frango',
          descricao: 'Peito de frango grelhado, arroz integral, brócolis e cenoura',
          preco: 18.90,
          categoria: 'fitness',
          imagem: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop',
          disponivel: true,
          estoque: 95
        },
        {
          id: 2,
          nome: 'Marmita Vegana',
          descricao: 'Quinoa, grão-de-bico, abobrinha refogada e salada verde',
          preco: 16.90,
          categoria: 'vegana',
          imagem: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop',
          disponivel: true,
          estoque: 88
        },
        {
          id: 3,
          nome: 'Marmita Tradicional',
          descricao: 'Bife acebolado, arroz, feijão, farofa e salada',
          preco: 15.90,
          categoria: 'tradicional',
          imagem: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop',
          disponivel: true,
          estoque: 120
        }
      ];
      setProdutos(produtosIniciais);
      localStorage.setItem('adminProdutos', JSON.stringify(produtosIniciais));
    }
  };

  const saveProducts = (newProducts) => {
    setProdutos(newProducts);
    localStorage.setItem('adminProdutos', JSON.stringify(newProducts));
    // Força re-render
    setTimeout(() => {
      loadProducts();
    }, 100);
  };

  const calcularEstatisticas = (pedidosList) => {
    const total = pedidosList.reduce((sum, pedido) => sum + pedido.total, 0);
    const hoje = new Date().toDateString();
    const pedidosHoje = pedidosList.filter(p => 
      new Date(p.data).toDateString() === hoje
    ).length;

    setStats({
      totalPedidos: pedidosList.length,
      totalVendas: total,
      pedidosHoje,
      produtosMaisVendidos: ['Marmita Fitness Frango', 'Marmita Tradicional']
    });
  };

  const handleProductSubmit = (e) => {
    e.preventDefault();
    
    let produtosAtualizados;
    
    if (editingProduct) {
      // Editar produto existente
      const novoProduto = {
        ...editingProduct,
        ...productForm,
        preco: parseFloat(productForm.preco),
        estoque: parseInt(productForm.estoque)
      };
      
      produtosAtualizados = produtos.map(p => 
        p.id === editingProduct.id ? novoProduto : p
      );
      
      setEditingProduct(null);
      alert('Produto atualizado com sucesso!');
    } else {
      // Adicionar novo produto
      const novoProduto = {
        id: Math.max(...produtos.map(p => p.id), 0) + 1,
        ...productForm,
        preco: parseFloat(productForm.preco),
        estoque: parseInt(productForm.estoque)
      };
      
      produtosAtualizados = [...produtos, novoProduto];
      alert('Produto adicionado com sucesso!');
    }
    
    saveProducts(produtosAtualizados);
    
    // Reset form
    setProductForm({
      nome: '',
      descricao: '',
      preco: '',
      categoria: 'fitness',
      imagem: '',
      disponivel: true,
      estoque: 100
    });
    setShowAddProduct(false);
  };

  const editProduct = (produto) => {
    setProductForm({
      nome: produto.nome,
      descricao: produto.descricao,
      preco: produto.preco.toString(),
      categoria: produto.categoria,
      imagem: produto.imagem,
      disponivel: produto.disponivel,
      estoque: produto.estoque.toString()
    });
    setEditingProduct(produto);
    setShowAddProduct(true);
  };

  const deleteProduct = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      const produtosAtualizados = produtos.filter(p => p.id !== id);
      saveProducts(produtosAtualizados);
      alert('Produto excluído com sucesso!');
    }
  };

  const toggleProductAvailability = (id) => {
    const produtosAtualizados = produtos.map(p => 
      p.id === id ? { ...p, disponivel: !p.disponivel } : p
    );
    saveProducts(produtosAtualizados);
    
    const produto = produtos.find(p => p.id === id);
    alert(`Produto ${produto.disponivel ? 'desativado' : 'ativado'} com sucesso!`);
  };

  const logout = () => {
    onNavigate('home');
  };

  return (
    <div style={{
      margin: 0,
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* Header Admin */}
      <div style={{
        background: '#343a40',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 40px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img 
            style={{ height: '50px' }}
            src="/assets/logo.jpg" 
            alt="Logo Fit In Box"
          />
          <div>
            <h2 style={{ margin: 0, fontSize: '24px' }}>Fit In Box Admin</h2>
            <small style={{ color: '#adb5bd' }}>Painel Administrativo</small>
          </div>
        </div>
        
        <button 
          onClick={logout}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🚪 Sair
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #dee2e6',
        padding: '0 40px'
      }}>
        <div style={{
          display: 'flex',
          gap: '30px'
        }}>
          {[
            { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
            { id: 'produtos', label: '🍽️ Produtos', icon: '🍽️' },
            { id: 'pedidos', label: '📋 Pedidos', icon: '📋' },
            { id: 'relatorios', label: '📈 Relatórios', icon: '📈' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '15px 0',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '3px solid #007bff' : '3px solid transparent',
                color: activeTab === tab.id ? '#007bff' : '#6c757d'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div style={{
        padding: '30px 40px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <h1 style={{ color: '#343a40', marginBottom: '30px' }}>📊 Dashboard</h1>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📦</div>
                <h3 style={{ color: '#28a745', margin: '0 0 5px 0' }}>Total de Pedidos</h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#343a40' }}>
                  {stats.totalPedidos}
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>💰</div>
                <h3 style={{ color: '#007bff', margin: '0 0 5px 0' }}>Total de Vendas</h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#343a40' }}>
                  R$ {stats.totalVendas.toFixed(2)}
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📅</div>
                <h3 style={{ color: '#ffc107', margin: '0 0 5px 0' }}>Pedidos Hoje</h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#343a40' }}>
                  {stats.pedidosHoje}
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🍽️</div>
                <h3 style={{ color: '#dc3545', margin: '0 0 5px 0' }}>Produtos Ativos</h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#343a40' }}>
                  {produtos.filter(p => p.disponivel).length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Produtos Tab */}
        {activeTab === 'produtos' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '30px'
            }}>
              <h1 style={{ color: '#343a40', margin: 0 }}>🍽️ Gerenciar Produtos</h1>
              <button
                onClick={() => {
                  setShowAddProduct(true);
                  setEditingProduct(null);
                  setProductForm({
                    nome: '',
                    descricao: '',
                    preco: '',
                    categoria: 'fitness',
                    imagem: '',
                    disponivel: true,
                    estoque: 100
                  });
                }}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ➕ Adicionar Produto
              </button>
            </div>

            {/* Form para adicionar/editar produto */}
            {showAddProduct && (
              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                marginBottom: '30px'
              }}>
                <h3>{editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}</h3>
                <form onSubmit={handleProductSubmit}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '15px',
                    marginBottom: '15px'
                  }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Nome do Produto
                      </label>
                      <input
                        type="text"
                        value={productForm.nome}
                        onChange={(e) => setProductForm({...productForm, nome: e.target.value})}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '5px'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Preço (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={productForm.preco}
                        onChange={(e) => setProductForm({...productForm, preco: e.target.value})}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '5px'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Descrição
                    </label>
                    <textarea
                      value={productForm.descricao}
                      onChange={(e) => setProductForm({...productForm, descricao: e.target.value})}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        height: '80px',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '15px',
                    marginBottom: '15px'
                  }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Categoria
                      </label>
                      <select
                        value={productForm.categoria}
                        onChange={(e) => setProductForm({...productForm, categoria: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '5px'
                        }}
                      >
                        <option value="fitness">Fitness</option>
                        <option value="vegana">Vegana</option>
                        <option value="tradicional">Tradicional</option>
                        <option value="gourmet">Gourmet</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Estoque
                      </label>
                      <input
                        type="number"
                        value={productForm.estoque}
                        onChange={(e) => setProductForm({...productForm, estoque: e.target.value})}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '5px'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '25px' }}>
                      <input
                        type="checkbox"
                        checked={productForm.disponivel}
                        onChange={(e) => setProductForm({...productForm, disponivel: e.target.checked})}
                      />
                      <label>Produto disponível</label>
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      URL da Imagem
                    </label>
                    <input
                      type="url"
                      value={productForm.imagem}
                      onChange={(e) => setProductForm({...productForm, imagem: e.target.value})}
                      placeholder="https://exemplo.com/imagem.jpg"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="submit"
                      style={{
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        padding: '12px 20px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      {editingProduct ? 'Atualizar' : 'Adicionar'} Produto
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddProduct(false);
                        setEditingProduct(null);
                      }}
                      style={{
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        padding: '12px 20px',
                        borderRadius: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lista de produtos */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '20px'
            }}>
              {produtos.map(produto => (
                <div
                  key={produto.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '10px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                    opacity: produto.disponivel ? 1 : 0.6
                  }}
                >
                  <img
                    src={produto.imagem}
                    alt={produto.nome}
                    style={{
                      width: '100%',
                      height: '150px',
                      objectFit: 'cover'
                    }}
                  />
                  
                  <div style={{ padding: '15px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '10px'
                    }}>
                      <h3 style={{
                        margin: 0,
                        color: '#343a40',
                        fontSize: '18px'
                      }}>
                        {produto.nome}
                      </h3>
                      <span style={{
                        backgroundColor: produto.disponivel ? '#28a745' : '#dc3545',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {produto.disponivel ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    
                    <p style={{
                      color: '#6c757d',
                      fontSize: '14px',
                      marginBottom: '10px'
                    }}>
                      {produto.descricao}
                    </p>
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '15px'
                    }}>
                      <span style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: '#28a745'
                      }}>
                        R$ {produto.preco.toFixed(2)}
                      </span>
                      <span style={{
                        fontSize: '14px',
                        color: '#6c757d'
                      }}>
                        Estoque: {produto.estoque}
                      </span>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <button
                        onClick={() => editProduct(produto)}
                        style={{
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ✏️ Editar
                      </button>
                      
                      <button
                        onClick={() => toggleProductAvailability(produto.id)}
                        style={{
                          backgroundColor: produto.disponivel ? '#ffc107' : '#28a745',
                          color: produto.disponivel ? '#000' : 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {produto.disponivel ? '⏸️ Desativar' : '▶️ Ativar'}
                      </button>
                      
                      <button
                        onClick={() => deleteProduct(produto.id)}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pedidos Tab */}
        {activeTab === 'pedidos' && (
          <div>
            <h1 style={{ color: '#343a40', marginBottom: '30px' }}>📋 Gerenciar Pedidos</h1>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              {pedidos.map(pedido => (
                <div
                  key={pedido.id}
                  style={{
                    backgroundColor: 'white',
                    padding: '25px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '15px'
                  }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px 0', color: '#343a40' }}>
                        Pedido #{pedido.numero}
                      </h3>
                      <p style={{ margin: 0, color: '#6c757d' }}>
                        {pedido.cliente} - {pedido.cnpj}
                      </p>
                      <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
                        {new Date(pedido.data).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        backgroundColor: pedido.status === 'confirmado' ? '#28a745' : '#ffc107',
                        color: pedido.status === 'confirmado' ? 'white' : '#000',
                        padding: '6px 12px',
                        borderRadius: '15px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        {pedido.status}
                      </span>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#28a745',
                        marginTop: '5px'
                      }}>
                        R$ {pedido.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 style={{ margin: '15px 0 10px 0', color: '#343a40' }}>Itens do Pedido:</h4>
                    {pedido.itens.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 0',
                          borderBottom: index < pedido.itens.length - 1 ? '1px solid #eee' : 'none'
                        }}
                      >
                        <span>{item.quantidade}x {item.nome}</span>
                        <span style={{ fontWeight: 'bold' }}>
                          R$ {(item.quantidade * item.preco).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Relatórios Tab */}
        {activeTab === 'relatorios' && (
          <div>
            <h1 style={{ color: '#343a40', marginBottom: '30px' }}>📈 Relatórios</h1>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              {/* Relatório de Vendas */}
              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ color: '#007bff', marginBottom: '15px' }}>💰 Vendas por Período</h3>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ color: '#6c757d' }}>Hoje:</span>
                  <strong style={{ float: 'right', color: '#28a745' }}>R$ 567,00</strong>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ color: '#6c757d' }}>Esta Semana:</span>
                  <strong style={{ float: 'right', color: '#28a745' }}>R$ 2.340,00</strong>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ color: '#6c757d' }}>Este Mês:</span>
                  <strong style={{ float: 'right', color: '#28a745' }}>R$ 12.580,00</strong>
                </div>
                <hr style={{ margin: '15px 0' }} />
                <div>
                  <span style={{ color: '#6c757d' }}>Total Geral:</span>
                  <strong style={{ float: 'right', color: '#007bff', fontSize: '18px' }}>
                    R$ {stats.totalVendas.toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* Produtos Mais Vendidos */}
              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ color: '#28a745', marginBottom: '15px' }}>🏆 Top Produtos</h3>
                {stats.produtosMaisVendidos.map((produto, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '5px'
                  }}>
                    <div>
                      <span style={{ fontSize: '18px', marginRight: '8px' }}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                      {produto}
                    </div>
                    <span style={{ fontWeight: 'bold', color: '#28a745' }}>
                      {Math.floor(Math.random() * 50) + 20} vendas
                    </span>
                  </div>
                ))}
              </div>

              {/* Estatísticas de Clientes */}
              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ color: '#ffc107', marginBottom: '15px' }}>👥 Clientes</h3>
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ color: '#6c757d', marginBottom: '5px' }}>Total de Empresas:</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                    {pedidos.length}
                  </div>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ color: '#6c757d', marginBottom: '5px' }}>Pedido Médio:</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
                    R$ {(stats.totalVendas / stats.totalPedidos).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#6c757d', marginBottom: '5px' }}>Clientes Ativos:</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffc107' }}>
                    {pedidos.filter(p => p.status === 'confirmado').length}
                  </div>
                </div>
              </div>
            </div>

            {/* Botões de Relatório */}
            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginBottom: '20px', color: '#343a40' }}>📋 Exportar Relatórios</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px'
              }}>
                <button
                  onClick={() => alert('Relatório de vendas seria exportado aqui')}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '15px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  📊 Relatório de Vendas
                </button>
                
                <button
                  onClick={() => alert('Relatório de produtos seria exportado aqui')}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '15px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  🍽️ Relatório de Produtos
                </button>
                
                <button
                  onClick={() => alert('Relatório de clientes seria exportado aqui')}
                  style={{
                    backgroundColor: '#ffc107',
                    color: '#000',
                    border: 'none',
                    padding: '15px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  👥 Relatório de Clientes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;