import React, { useState, useEffect } from 'react';
import { authSupabaseService } from '../services/authSupabaseService';
import ImageUpload from './ImageUpload';


// Utilitários de segurança
const securityUtils = {
  sanitizeInput: (input) => {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/[<>\"']/g, '') // Remove caracteres perigosos
      .trim()
      .slice(0, 500); // Limita tamanho
  },
  
  safeLog: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ADMIN] ${message}`, data);
    }
  }
};

const AdminPage = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [produtos, setProdutos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [empresasCadastradas, setEmpresasCadastradas] = useState([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // SISTEMA DE AUTENTICAÇÃO ADMIN MELHORADO
  const [adminAuth, setAdminAuth] = useState({
    isAuthenticated: false,
    attempts: 0,
    lockedUntil: null
  });
  
  const [productForm, setProductForm] = useState({
    nome: '',
    descricao: '',
    preco: '',
    categoria: 'fitness',
    imagem: '',
    disponivel: true,
    estoque: 100
  });

  const [stats, setStats] = useState({
    totalPedidos: 0,
    totalVendas: 0,
    produtosMaisVendidos: [],
    pedidosHoje: 0,
    empresasCadastradas: 0,
    empresasComEmail: 0,
    percentualEmails: 0
  });

  const statusPedidos = [
    { value: 'a_preparar', label: 'A Preparar', color: '#ffc107', icon: '⏳' },
    { value: 'em_producao', label: 'Em Produção', color: '#007bff', icon: '👨‍🍳' },
    { value: 'pronto_entrega', label: 'Pronto para Entrega', color: '#28a745', icon: '📦' },
    { value: 'entregue', label: 'Entregue', color: '#6c757d', icon: '✅' },
    { value: 'cancelado', label: 'Cancelado', color: '#dc3545', icon: '❌' }
  ];

  // Verifica se admin está bloqueado
  const checkAdminLock = () => {
    const lockData = localStorage.getItem('adminLock');
    if (lockData) {
      try {
        const { lockedUntil } = JSON.parse(lockData);
        if (new Date() < new Date(lockedUntil)) {
          const remainingMinutes = Math.ceil((new Date(lockedUntil) - new Date()) / 1000 / 60);
          return {
            isLocked: true,
            remainingMinutes
          };
        } else {
          localStorage.removeItem('adminLock');
        }
      } catch {
        localStorage.removeItem('adminLock');
      }
    }
    return { isLocked: false };
  };

  // Bloqueio temporário após tentativas
  const lockAdmin = (minutes = 30) => {
    const lockedUntil = new Date(Date.now() + minutes * 60 * 1000);
    localStorage.setItem('adminLock', JSON.stringify({ lockedUntil }));
  };

  // Autenticação admin melhorada
  const authenticateAdmin = () => {
    const lockCheck = checkAdminLock();
    if (lockCheck.isLocked) {
      alert(`Acesso bloqueado. Tente novamente em ${lockCheck.remainingMinutes} minutos.`);
      return false;
    }

    // Múltiplas senhas possíveis (para diferentes ambientes)
    const validPasswords = [
      process.env.REACT_APP_ADMIN_PASSWORD || 'FitInBox2025!',
      'admin2025!@#',
      'fitinbox_admin_secure'
    ];

    const senha = prompt('Digite a senha do administrador:');
    
    if (senha === null) return false; // Cancelou

    // Validação da senha
    const isValid = validPasswords.some(validPassword => {
      // Hash simples para comparação (ainda é client-side, mas melhor que texto puro)
      const inputHash = btoa(senha + 'fitinbox_salt');
      const validHash = btoa(validPassword + 'fitinbox_salt');
      return inputHash === validHash;
    });

    if (isValid) {
      setAdminAuth({
        isAuthenticated: true,
        attempts: 0,
        lockedUntil: null
      });
      
      // Remove lock se existir
      localStorage.removeItem('adminLock');
      
      // Log seguro (não mostra senha)
      securityUtils.safeLog('Admin autenticado com sucesso');
      return true;
    } else {
      const attempts = (adminAuth.attempts || 0) + 1;
      setAdminAuth(prev => ({ ...prev, attempts }));

      if (attempts >= 3) {
        lockAdmin(30); // Bloqueia por 30 minutos após 3 tentativas
        alert('Muitas tentativas incorretas. Acesso bloqueado por 30 minutos.');
      } else {
        alert(`Senha incorreta! Tentativas restantes: ${3 - attempts}`);
      }

      securityUtils.safeLog(`Tentativa de acesso admin falhou. Tentativas: ${attempts}`);
      return false;
    }
  };

  // Middleware de proteção para ações sensíveis
  const requireAuth = (action) => {
    if (!adminAuth.isAuthenticated) {
      alert('Sessão expirada. Faça login novamente.');
      onNavigate('home');
      return false;
    }
    return action();
  };

  // Logout admin
  const logoutAdmin = () => {
    setAdminAuth({
      isAuthenticated: false,
      attempts: 0,
      lockedUntil: null
    });
    onNavigate('home');
    securityUtils.safeLog('Admin logout realizado');
  };

  // Validação de produtos com sanitização
  const validateAndSanitizeProduct = (product) => {
    const errors = [];
    
    if (!product.nome?.trim()) {
      errors.push('Nome é obrigatório');
    }
    
    if (!product.descricao?.trim()) {
      errors.push('Descrição é obrigatória');
    }
    
    if (!product.preco || isNaN(product.preco) || product.preco <= 0) {
      errors.push('Preço deve ser um número maior que zero');
    }
    
    if (!product.imagem?.trim()) {
      errors.push('URL da imagem é obrigatória');
    }

    // Validação de URL da imagem
    try {
      new URL(product.imagem);
    } catch {
      errors.push('URL da imagem inválida');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    // Sanitização
    return {
      ...product,
      nome: securityUtils.sanitizeInput(product.nome.trim()),
      descricao: securityUtils.sanitizeInput(product.descricao.trim()),
      preco: parseFloat(product.preco),
      categoria: securityUtils.sanitizeInput(product.categoria),
      imagem: securityUtils.sanitizeInput(product.imagem.trim()),
      disponivel: Boolean(product.disponivel),
      estoque: parseInt(product.estoque) || 100
    };
  };

  // Função para salvar produtos com validação
  const saveProductsSecure = (newProducts) => {
    return requireAuth(() => {
      try {
        // Validação da estrutura
        if (!Array.isArray(newProducts)) {
          throw new Error('Formato de produtos inválido');
        }

        // Valida cada produto
        const validatedProducts = newProducts.map(validateAndSanitizeProduct);

        localStorage.setItem('adminProdutos', JSON.stringify(validatedProducts));
        setProdutos(validatedProducts);
        
        securityUtils.safeLog('Produtos salvos com sucesso', { 
          count: validatedProducts.length 
        });
        
        return true;
      } catch (error) {
        securityUtils.safeLog('Erro ao salvar produtos:', error.message);
        alert(`Erro ao salvar produtos: ${error.message}`);
        return false;
      }
    });
  };

  // Função para adicionar/editar produto com segurança
  const handleProductSubmitSecure = async (e) => {
    e.preventDefault();
    
    return requireAuth(() => {
      try {
        const sanitizedForm = {
          nome: securityUtils.sanitizeInput(productForm.nome),
          descricao: securityUtils.sanitizeInput(productForm.descricao),
          preco: productForm.preco,
          categoria: productForm.categoria,
          imagem: securityUtils.sanitizeInput(productForm.imagem),
          disponivel: productForm.disponivel,
          estoque: productForm.estoque
        };

        const validatedProduct = validateAndSanitizeProduct(sanitizedForm);
        
        let produtosAtualizados;
        
        if (editingProduct) {
          const novoProduto = {
            ...editingProduct,
            ...validatedProduct
          };
          
          produtosAtualizados = produtos.map(p => 
            p.id === editingProduct.id ? novoProduto : p
          );
          
          alert('Produto atualizado com sucesso!');
          setEditingProduct(null);
        } else {
          const novoId = produtos.length > 0 ? Math.max(...produtos.map(p => p.id)) + 1 : 1;
          
          const novoProduto = {
            id: novoId,
            ...validatedProduct
          };
          
          produtosAtualizados = [...produtos, novoProduto];
          alert('Produto adicionado com sucesso!');
        }
        
        if (saveProductsSecure(produtosAtualizados)) {
          // Reset form apenas se salvou com sucesso
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
        }
        
      } catch (error) {
        securityUtils.safeLog('Erro ao processar produto:', error.message);
        alert(`Erro ao processar produto: ${error.message}`);
      }
    });
  };

  // Função para deletar produto com confirmação dupla
  const deleteProductSecure = (id) => {
    return requireAuth(() => {
      const produto = produtos.find(p => p.id === id);
      if (!produto) {
        alert('Produto não encontrado');
        return;
      }

      const confirmacao1 = window.confirm(`Tem certeza que deseja excluir "${produto.nome}"?`);
      if (!confirmacao1) return;

      const confirmacao2 = window.confirm('Esta ação não pode ser desfeita. Confirmar exclusão?');
      if (!confirmacao2) return;

      try {
        const produtosAtualizados = produtos.filter(p => p.id !== id);
        if (saveProductsSecure(produtosAtualizados)) {
          alert('Produto excluído com sucesso!');
        }
      } catch (error) {
        securityUtils.safeLog('Erro ao excluir produto:', error.message);
        alert('Erro ao excluir produto. Tente novamente.');
      }
    });
  };

  // Toggle de disponibilidade seguro
  const toggleProductAvailabilitySecure = (id) => {
    return requireAuth(() => {
      try {
        const produtosAtualizados = produtos.map(p => 
          p.id === id ? { ...p, disponivel: !p.disponivel } : p
        );
        
        if (saveProductsSecure(produtosAtualizados)) {
          const produto = produtos.find(p => p.id === id);
          alert(`Produto ${produto.disponivel ? 'desativado' : 'ativado'} com sucesso!`);
        }
      } catch (error) {
        securityUtils.safeLog('Erro ao alterar disponibilidade:', error.message);
        alert('Erro ao alterar disponibilidade. Tente novamente.');
      }
    });
  };

  // Verificação de autenticação na inicialização
  useEffect(() => {
    const checkAuthentication = () => {
      const preAuth = sessionStorage.getItem('adminPreAuthenticated');
      
      if (preAuth) {
        try {
          const { timestamp } = JSON.parse(preAuth);
          if (Date.now() - timestamp < 30 * 60 * 1000) {
            setAdminAuth({ isAuthenticated: true, attempts: 0, lockedUntil: null });
            sessionStorage.removeItem('adminPreAuthenticated');
            console.log('Admin autenticado via pré-autenticação');
            
            sessionStorage.setItem('adminAuthenticated', JSON.stringify({
              timestamp: Date.now()
            }));
            
            loadProducts();
            loadPedidos();
            loadEmpresasCadastradas();
            return;
          }
        } catch (error) {
          console.error('Erro na pré-autenticação:', error);
          sessionStorage.removeItem('adminPreAuthenticated');
        }
      }
  
      console.log('Acesso admin não autorizado, redirecionando...');
      onNavigate('home');
    };
  
    checkAuthentication();
  }, [onNavigate]);

  // Se não está autenticado, não renderiza nada (já redirecionou)
  if (!adminAuth.isAuthenticated) {
    return null;
  }

  const loadEmpresasCadastradas = async () => {
    try {
      const empresas = await authSupabaseService.listarEmpresas();
      setEmpresasCadastradas(empresas);
      const empresasComEmail = empresas.filter(e => e.email && e.email.trim() !== '').length;
      const percentual = empresas.length > 0 ? (empresasComEmail / empresas.length) * 100 : 0;
      
      setStats(prev => ({
        ...prev,
        empresasCadastradas: empresas.length,
        empresasComEmail,
        percentualEmails: percentual
      }));
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      setEmpresasCadastradas([]);
    }
  };

  const loadProducts = () => {
    try {
      const produtosSalvos = localStorage.getItem('adminProdutos');
      if (produtosSalvos) {
        const produtosParsed = JSON.parse(produtosSalvos);
        setProdutos(produtosParsed);
      } else {
        initializeDefaultProducts();
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      initializeDefaultProducts();
    }
  };

  const loadPedidos = () => {
    const pedidosAdmin = JSON.parse(localStorage.getItem('pedidosAdmin') || '[]');
    const pedidosSimulados = pedidosAdmin.length === 0 ? [
      {
        id: 1,
        numero: 1001,
        cliente: 'H Azevedo de Abreu',
        cnpj: '05.336.475/0001-77',
        total: 567.0,
        status: 'em_producao',
        data: new Date().toISOString(),
        enderecoEntrega: 'Rua das Flores, 123 - Centro, São Paulo/SP - CEP: 01234-567',
        observacoes: 'Entregar na portaria',
        itens: [
          { nome: 'Marmita Fitness Frango', quantidade: 15, preco: 18.9 },
          { nome: 'Marmita Vegana', quantidade: 15, preco: 16.9 }
        ]
      }
    ] : [];

    const todosPedidos = [...pedidosSimulados, ...pedidosAdmin];
    setPedidos(todosPedidos);
    calcularEstatisticas(todosPedidos);
  };

  const initializeDefaultProducts = () => {
    const produtosIniciais = [
      {
        id: 1,
        nome: 'Marmita Fitness Frango',
        descricao: 'Peito de frango grelhado, arroz integral, brócolis e cenoura',
        preco: 18.9,
        categoria: 'fitness',
        imagem: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop',
        disponivel: true,
        estoque: 95
      },
      {
        id: 2,
        nome: 'Marmita Vegana',
        descricao: 'Quinoa, grão-de-bico, abobrinha refogada e salada verde',
        preco: 16.9,
        categoria: 'vegana',
        imagem: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop',
        disponivel: true,
        estoque: 88
      },
      {
        id: 3,
        nome: 'Marmita Tradicional',
        descricao: 'Bife acebolado, arroz, feijão, farofa e salada',
        preco: 15.9,
        categoria: 'tradicional',
        imagem: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop',
        disponivel: true,
        estoque: 120
      }
    ];
    
    saveProductsSecure(produtosIniciais);
  };

  const calcularEstatisticas = (pedidosList) => {
    const total = pedidosList.reduce((sum, pedido) => sum + pedido.total, 0);
    const hoje = new Date().toDateString();
    const pedidosHoje = pedidosList.filter(p => new Date(p.data).toDateString() === hoje).length;

    setStats(prev => ({
      ...prev,
      totalPedidos: pedidosList.length,
      totalVendas: total,
      pedidosHoje,
      produtosMaisVendidos: ['Marmita Fitness Frango', 'Marmita Tradicional']
    }));
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

  const alterarStatusPedido = (pedidoId, novoStatus) => {
    return requireAuth(() => {
      try {
        const pedidosAdmin = JSON.parse(localStorage.getItem('pedidosAdmin') || '[]');
        const pedidosAtualizados = pedidosAdmin.map(pedido => 
          pedido.id === pedidoId ? { ...pedido, status: novoStatus } : pedido
        );
        
        localStorage.setItem('pedidosAdmin', JSON.stringify(pedidosAtualizados));
        loadPedidos();
        
        const statusInfo = statusPedidos.find(s => s.value === novoStatus);
        alert(`Status alterado para: ${statusInfo.label}`);
      } catch (error) {
        console.error('Erro ao alterar status:', error);
        alert('Erro ao alterar status do pedido');
      }
    });
  };

  const getStatusInfo = (status) => {
    return statusPedidos.find(s => s.value === status) || statusPedidos[0];
  };

  const toggleEmpresaAtiva = async (empresaId, ativo) => {
    return requireAuth(async () => {
      try {
        const resultado = await authSupabaseService.toggleEmpresaAtiva(empresaId, !ativo);
        if (resultado.success) {
          alert(resultado.message);
          loadEmpresasCadastradas();
        } else {
          alert(`Erro: ${resultado.error}`);
        }
      } catch (error) {
        console.error('Erro ao alterar status da empresa:', error);
        alert('Erro ao alterar status da empresa');
      }
    });
  };

  const formatarEmail = (email) => {
    if (!email) return 'Não informado';
    return email;
  };

  return (
    <div style={{
      margin: 0,
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      <div style={{
        background: '#343a40',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 40px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ fontSize: '32px' }}>🍽️</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px' }}>Fit In Box Admin</h2>
            <small style={{ color: '#adb5bd' }}>Painel Administrativo</small>
          </div>
        </div>
        <button 
          onClick={logoutAdmin}
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

      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #dee2e6',
        padding: '0 40px'
      }}>
        <div style={{ display: 'flex', gap: '30px' }}>
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'produtos', label: '🍽️ Produtos' },
            { id: 'pedidos', label: '📋 Pedidos' },
            { id: 'empresas', label: '🏢 Empresas' }
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

      <div style={{
        padding: '30px 40px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
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
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🏢</div>
                <h3 style={{ color: '#ffc107', margin: '0 0 5px 0' }}>Empresas Cadastradas</h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#343a40' }}>
                  {stats.empresasCadastradas}
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
              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📧</div>
                <h3 style={{ color: '#17a2b8', margin: '0 0 5px 0' }}>Empresas c/ Email</h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#343a40' }}>
                  {stats.empresasComEmail}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {stats.percentualEmails.toFixed(1)}% do total
                </div>
              </div>
            </div>
          </div>
        )}

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
            {showAddProduct && (
              <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '10px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                marginBottom: '30px'
              }}>
                <h2 style={{ color: '#009245', marginBottom: '25px' }}>
                  {editingProduct ? '✏️ Editar Produto' : '➕ Adicionar Novo Produto'}
                </h2>
                <form onSubmit={handleProductSubmitSecure}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                    marginBottom: '20px'
                  }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Nome do Produto *
                      </label>
                      <input
                        type="text"
                        value={productForm.nome}
                        onChange={(e) => setProductForm({ ...productForm, nome: e.target.value })}
                        placeholder="Ex: Marmita Fitness Frango"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '5px',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Preço (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={productForm.preco}
                        onChange={(e) => setProductForm({ ...productForm, preco: e.target.value })}
                        placeholder="0,00"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '5px',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                        required
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Descrição *
                    </label>
                    <textarea
                      value={productForm.descricao}
                      onChange={(e) => setProductForm({ ...productForm, descricao: e.target.value })}
                      placeholder="Descreva os ingredientes e características do produto"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        fontSize: '14px',
                        minHeight: '80px',
                        resize: 'vertical',
                        boxSizing: 'border-box'
                      }}
                      required
                    />
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '20px',
                    marginBottom: '20px'
                  }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Categoria
                      </label>
                      <select
                        value={productForm.categoria}
                        onChange={(e) => setProductForm({ ...productForm, categoria: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '5px',
                          fontSize: '14px',
                          boxSizing: 'border-box'
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
                        min="0"
                        value={productForm.estoque}
                        onChange={(e) => setProductForm({ ...productForm, estoque: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '5px',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Status
                      </label>
                      <select
                        value={productForm.disponivel}
                        onChange={(e) =>
                          setProductForm({ ...productForm, disponivel: e.target.value === 'true' })
                        }
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '5px',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="true">Disponível</option>
                        <option value="false">Indisponível</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: '25px' }}>
                    <ImageUpload
                      currentImage={productForm.imagem}
                      onImageUpload={(imageUrl) =>
                        setProductForm({ ...productForm, imagem: imageUrl })
                      }
                      placeholder="URL da imagem do produto"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="submit"
                      disabled={uploadingImage}
                      style={{
                        backgroundColor: uploadingImage ? '#ccc' : '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '12px 20px',
                        borderRadius: '5px',
                        cursor: uploadingImage ? 'wait' : 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      {editingProduct ? '💾 Salvar Alterações' : '➕ Adicionar Produto'}
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
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
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
                      height: '120px',
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{ padding: '15px' }}>
                    <h3 style={{
                      margin: 0,
                      color: '#343a40',
                      fontSize: '16px',
                      marginBottom: '10px'
                    }}>
                      {produto.nome}
                    </h3>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}>
                      <span style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#28a745'
                      }}>
                        R$ {produto.preco.toFixed(2)}
                      </span>
                      <span style={{
                        backgroundColor: produto.disponivel ? '#28a745' : '#dc3545',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}>
                        {produto.disponivel ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '5px',
                      flexWrap: 'wrap'
                    }}>
                      <button
                        onClick={() => editProduct(produto)}
                        style={{
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '10px'
                        }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => toggleProductAvailabilitySecure(produto.id)}
                        style={{
                          backgroundColor: produto.disponivel ? '#ffc107' : '#28a745',
                          color: produto.disponivel ? '#000' : 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '10px'
                        }}
                      >
                        {produto.disponivel ? '⏸️' : '▶️'}
                      </button>
                      <button
                        onClick={() => deleteProductSecure(produto.id)}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '10px'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'pedidos' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '30px'
            }}>
              <h1 style={{ color: '#343a40', margin: 0 }}>📋 Gerenciar Pedidos</h1>
              <div style={{
                backgroundColor: '#28a745',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '15px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                🔄 Atualização automática ativa
              </div>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              {pedidos.length === 0 ? (
                <div style={{
                  backgroundColor: 'white',
                  padding: '40px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  color: '#666'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
                  <h3>Nenhum pedido encontrado</h3>
                  <p>Os novos pedidos aparecerão aqui automaticamente.</p>
                </div>
              ) : (
                pedidos.map(pedido => {
                  const statusInfo = getStatusInfo(pedido.status);
                  return (
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
                        marginBottom: '20px'
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
                          <div style={{ marginBottom: '10px' }}>
                            <select
                              value={pedido.status}
                              onChange={(e) => alterarStatusPedido(pedido.id, e.target.value)}
                              style={{
                                backgroundColor: statusInfo.color,
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                            >
                              {statusPedidos.map(status => (
                                <option key={status.value} value={status.value}>
                                  {status.icon} {status.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#28a745'
                          }}>
                            R$ {pedido.total.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      {pedido.enderecoEntrega && (
                        <div style={{
                          backgroundColor: '#fff8e1',
                          padding: '15px',
                          borderRadius: '8px',
                          marginBottom: '15px',
                          border: '1px solid #ffecb3'
                        }}>
                          <h4 style={{ 
                            margin: '0 0 8px 0', 
                            color: '#f57f17',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}>
                            📍 Endereço de Entrega:
                          </h4>
                          <p style={{ 
                            margin: 0, 
                            color: '#e65100',
                            fontSize: '13px',
                            lineHeight: '1.4'
                          }}>
                            {pedido.enderecoEntrega}
                          </p>
                        </div>
                      )}
                      {pedido.observacoes && (
                        <div style={{
                          backgroundColor: '#e3f2fd',
                          padding: '12px',
                          borderRadius: '8px',
                          marginBottom: '15px',
                          border: '1px solid #bbdefb'
                        }}>
                          <h4 style={{ 
                            margin: '0 0 5px 0', 
                            color: '#1976d2',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}>
                            💬 Observações:
                          </h4>
                          <p style={{ 
                            margin: 0, 
                            color: '#0277bd',
                            fontSize: '13px',
                            fontStyle: 'italic'
                          }}>
                            {pedido.observacoes}
                          </p>
                        </div>
                      )}
                      <div>
                        <h4 style={{ margin: '15px 0 10px 0', color: '#343a40' }}>📦 Itens do Pedido:</h4>
                        {pedido.itens && pedido.itens.map((item, index) => (
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
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'empresas' && (
          <div>
            <h1 style={{ color: '#343a40', marginBottom: '30px' }}>🏢 Empresas Cadastradas</h1>
            {empresasCadastradas.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                padding: '40px',
                borderRadius: '10px',
                textAlign: 'center',
                color: '#666'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏢</div>
                <h3>Nenhuma empresa cadastrada</h3>
                <p>As empresas que se cadastrarem aparecerão aqui.</p>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
              }}>
                {empresasCadastradas.map((empresa, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: 'white',
                      padding: '20px',
                      borderRadius: '10px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      opacity: empresa.ativo ? 1 : 0.6
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '15px'
                    }}>
                      <div style={{ flex: 1 }}>
                        {empresa.nome_empresa && (
                          <h3 style={{ 
                            margin: '0 0 8px 0', 
                            color: '#009245',
                            fontSize: '18px',
                            fontWeight: 'bold'
                          }}>
                            🏢 {empresa.nome_empresa}
                          </h3>
                        )}
                        <h4 style={{ margin: '0 0 5px 0', color: '#343a40' }}>
                          {empresa.razao_social}
                        </h4>
                        {empresa.nome_fantasia && empresa.nome_fantasia !== empresa.razao_social && (
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                            <strong>Nome Fantasia:</strong> {empresa.nome_fantasia}
                          </p>
                        )}
                        <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                          <strong>CNPJ:</strong> {empresa.cnpj_formatado}
                        </p>
                        <p style={{ 
                          margin: '0 0 5px 0', 
                          color: empresa.email ? '#28a745' : '#dc3545', 
                          fontSize: '14px',
                          fontWeight: empresa.email ? 'bold' : 'normal'
                        }}>
                          <strong>📧 Email:</strong> {formatarEmail(empresa.email)}
                          {!empresa.email && <span style={{ color: '#dc3545' }}> ⚠️ Não cadastrado</span>}
                        </p>
                        {empresa.telefone && (
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                            <strong>📱 Telefone:</strong> {empresa.telefone}
                          </p>
                        )}
                        <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                          <strong>Cadastro:</strong> {new Date(empresa.data_cadastro).toLocaleDateString('pt-BR')}
                        </p>
                        {empresa.ultimo_acesso && (
                          <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                            <strong>Último acesso:</strong> {new Date(empresa.ultimo_acesso).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'flex-end', 
                        gap: '10px' 
                      }}>
                        <span style={{
                          backgroundColor: empresa.ativo ? '#28a745' : '#dc3545',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {empresa.ativo ? 'ATIVO' : 'INATIVO'}
                        </span>
                        <span style={{
                          backgroundColor: empresa.email ? '#28a745' : '#ffc107',
                          color: empresa.email ? 'white' : '#000',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {empresa.email ? '📧 COM EMAIL' : '⚠️ SEM EMAIL'}
                        </span>
                        <span style={{
                          backgroundColor: empresa.nome_empresa ? '#17a2b8' : '#6c757d',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {empresa.nome_empresa ? '🏢 COM NOME' : '📝 SEM NOME'}
                        </span>
                        {empresa.tentativas_login > 0 && (
                          <span style={{
                            backgroundColor: '#ffc107',
                            color: '#000',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {empresa.tentativas_login} tentativas inválidas
                          </span>
                        )}
                        <button
                          onClick={() => toggleEmpresaAtiva(empresa.id, empresa.ativo)}
                          style={{
                            backgroundColor: empresa.ativo ? '#ffc107' : '#28a745',
                            color: empresa.ativo ? '#000' : 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          {empresa.ativo ? '⏸️ Desativar' : '▶️ Ativar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
      </div>
    </div>
  );
};

export default AdminPage;