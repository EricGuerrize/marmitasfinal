import React, { useState, useEffect } from 'react';
import { authSupabaseService } from '../services/authSupabaseService';
import { cnpjService } from '../services/cnpjService';

const AdminPage = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [produtos, setProdutos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [empresasCadastradas, setEmpresasCadastradas] = useState([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Estados para consulta de CNPJ
  const [cnpjConsulta, setCnpjConsulta] = useState('');
  const [consultandoCnpj, setConsultandoCnpj] = useState(false);
  const [dadosEmpresaConsulta, setDadosEmpresaConsulta] = useState(null);
  const [erroConsultaCnpj, setErroConsultaCnpj] = useState('');
  
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
    pedidosHoje: 0,
    empresasCadastradas: 0
  });

  useEffect(() => {
    loadProducts();
    loadPedidos();
    loadEmpresasCadastradas();

    const intervalId = setInterval(() => {
      loadPedidos();
      loadEmpresasCadastradas();
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const loadEmpresasCadastradas = async () => {
    try {
      const empresas = await authSupabaseService.listarEmpresas();
      setEmpresasCadastradas(empresas);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      setEmpresasCadastradas([]);
    }
  };

  const loadProducts = () => {
    const produtosSalvos = localStorage.getItem('adminProdutos');
    if (produtosSalvos) {
      try {
        const produtosParsed = JSON.parse(produtosSalvos);
        setProdutos(produtosParsed);
      } catch (error) {
        console.error('Erro ao fazer parse dos produtos salvos:', error);
        initializeDefaultProducts();
      }
    } else {
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
        total: 567.00,
        status: 'confirmado',
        data: new Date().toISOString(),
        itens: [
          { nome: 'Marmita Fitness Frango', quantidade: 15, preco: 18.90 },
          { nome: 'Marmita Vegana', quantidade: 15, preco: 16.90 }
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
      produtosMaisVendidos: ['Marmita Fitness Frango', 'Marmita Tradicional'],
      empresasCadastradas: empresasCadastradas.length
    });
  };

  // Função para consultar CNPJ na aba admin
  const handleCnpjConsultaChange = (e) => {
    const maskedValue = cnpjService.aplicarMascaraCnpj(e.target.value);
    setCnpjConsulta(maskedValue);
    
    if (dadosEmpresaConsulta) {
      setDadosEmpresaConsulta(null);
      setErroConsultaCnpj('');
    }
  };

  const consultarCnpjAdmin = async () => {
    if (!cnpjConsulta.trim()) {
      alert('Por favor, informe o CNPJ');
      return;
    }

    if (!cnpjService.validarCep) {
      // Se não tem o cnpjService completo, usa validação básica
      if (cnpjConsulta.replace(/\D/g, '').length !== 14) {
        alert('CNPJ deve ter 14 dígitos');
        return;
      }
    }

    setConsultandoCnpj(true);
    setErroConsultaCnpj('');
    
    try {
      // Se tiver o cnpjService disponível, usa ele
      if (cnpjService.consultarCnpj) {
        const resultado = await cnpjService.consultarCnpj(cnpjConsulta);
        
        if (resultado.success) {
          setDadosEmpresaConsulta(resultado.data);
          setErroConsultaCnpj('');
        } else {
          setErroConsultaCnpj(resultado.error);
          setDadosEmpresaConsulta(null);
        }
      } else {
        // Fallback: simula consulta
        await new Promise(resolve => setTimeout(resolve, 2000));
        setDadosEmpresaConsulta({
          cnpj: cnpjConsulta,
          razaoSocial: `Empresa Consulta ${cnpjConsulta.substring(0, 8)}`,
          nomeFantasia: `Fantasia ${cnpjConsulta.substring(0, 8)}`,
          situacao: 'ATIVA',
          atividade: 'Atividade comercial em geral',
          municipio: 'São Paulo',
          uf: 'SP'
        });
      }
    } catch (error) {
      setErroConsultaCnpj('Erro ao consultar CNPJ. Tente novamente.');
      setDadosEmpresaConsulta(null);
    } finally {
      setConsultandoCnpj(false);
    }
  };

  // Função para ativar/desativar empresa
  const toggleEmpresaAtiva = async (empresaId, ativo) => {
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
  };

  // Resto das funções de produto (mantidas iguais)
  const saveProducts = (newProducts) => {
    try {
      setProdutos(newProducts);
      localStorage.setItem('adminProdutos', JSON.stringify(newProducts));
      setTimeout(() => loadProducts(), 100);
    } catch (error) {
      console.error('Erro ao salvar produtos:', error);
      alert('Erro ao salvar produtos. Tente novamente.');
    }
  };

  const handleImageUpload = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject('Nenhum arquivo selecionado');
        return;
      }

      if (!file.type.startsWith('image/')) {
        reject('Por favor, selecione apenas arquivos de imagem');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        reject('Imagem deve ter menos de 5MB');
        return;
      }

      setUploadingImage(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        setTimeout(() => {
          setUploadingImage(false);
          resolve(e.target.result);
        }, 2000);
      };
      reader.onerror = () => {
        setUploadingImage(false);
        reject('Erro ao ler arquivo');
      };
      reader.readAsDataURL(file);
    });
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let produtosAtualizados;
      
      if (editingProduct) {
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
    } catch (error) {
      console.error('Erro ao processar produto:', error);
      alert('Erro ao processar produto. Verifique os dados e tente novamente.');
    }
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
      try {
        const produtosAtualizados = produtos.filter(p => p.id !== id);
        saveProducts(produtosAtualizados);
        alert('Produto excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir produto:', error);
        alert('Erro ao excluir produto. Tente novamente.');
      }
    }
  };

  const toggleProductAvailability = (id) => {
    try {
      const produtosAtualizados = produtos.map(p => 
        p.id === id ? { ...p, disponivel: !p.disponivel } : p
      );
      saveProducts(produtosAtualizados);
      
      const produto = produtos.find(p => p.id === id);
      alert(`Produto ${produto.disponivel ? 'desativado' : 'ativado'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao alterar disponibilidade:', error);
      alert('Erro ao alterar disponibilidade. Tente novamente.');
    }
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
          <div style={{ fontSize: '32px' }}>🍽️</div>
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
        <div style={{ display: 'flex', gap: '30px' }}>
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'produtos', label: '🍽️ Produtos' },
            { id: 'pedidos', label: '📋 Pedidos' },
            { id: 'empresas', label: '🏢 Empresas' },
            { id: 'consulta-cnpj', label: '🔍 Consultar CNPJ' }
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
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🏢</div>
                <h3 style={{ color: '#ffc107', margin: '0 0 5px 0' }}>Empresas Cadastradas</h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#343a40' }}>
                  {empresasCadastradas.length}
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

        {/* Nova Aba: Consultar CNPJ */}
        {activeTab === 'consulta-cnpj' && (
          <div>
            <h1 style={{ color: '#343a40', marginBottom: '30px' }}>🔍 Consultar CNPJ</h1>
            
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3 style={{ color: '#007bff', marginBottom: '20px' }}>Consulta na Receita Federal</h3>
              
              <div style={{
                display: 'flex',
                gap: '15px',
                marginBottom: '20px',
                alignItems: 'flex-end'
              }}>
                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 'bold' 
                  }}>
                    CNPJ da Empresa
                  </label>
                  <input
                    type="text"
                    value={cnpjConsulta}
                    onChange={handleCnpjConsultaChange}
                    placeholder="00.000.000/0000-00"
                    maxLength="18"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                <button
                  onClick={consultarCnpjAdmin}
                  disabled={consultandoCnpj}
                  style={{
                    backgroundColor: consultandoCnpj ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '5px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: consultandoCnpj ? 'wait' : 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {consultandoCnpj ? '🔍 Consultando...' : '🔍 Consultar'}
                </button>
              </div>

              {/* Resultado da Consulta */}
              {consultandoCnpj && (
                <div style={{
                  backgroundColor: '#e7f3ff',
                  padding: '15px',
                  borderRadius: '5px',
                  textAlign: 'center',
                  color: '#0066cc'
                }}>
                  🔄 Consultando CNPJ na Receita Federal, aguarde...
                </div>
              )}

              {dadosEmpresaConsulta && !consultandoCnpj && (
                <div style={{
                  backgroundColor: '#d4edda',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #c3e6cb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '15px',
                    color: '#155724'
                  }}>
                    <span style={{ fontSize: '24px', marginRight: '10px' }}>✅</span>
                    <strong style={{ fontSize: '18px' }}>Empresa encontrada na Receita Federal!</strong>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '15px',
                    fontSize: '14px',
                    color: '#155724'
                  }}>
                    <div>
                      <strong>CNPJ:</strong> {dadosEmpresaConsulta.cnpj}
                    </div>
                    <div>
                      <strong>Razão Social:</strong> {dadosEmpresaConsulta.razaoSocial}
                    </div>
                    {dadosEmpresaConsulta.nomeFantasia && (
                      <div>
                        <strong>Nome Fantasia:</strong> {dadosEmpresaConsulta.nomeFantasia}
                      </div>
                    )}
                    <div>
                      <strong>Situação:</strong> {dadosEmpresaConsulta.situacao}
                    </div>
                    {dadosEmpresaConsulta.atividade && (
                      <div>
                        <strong>Atividade Principal:</strong> {dadosEmpresaConsulta.atividade}
                      </div>
                    )}
                    {dadosEmpresaConsulta.municipio && dadosEmpresaConsulta.uf && (
                      <div>
                        <strong>Localização:</strong> {dadosEmpresaConsulta.municipio}/{dadosEmpresaConsulta.uf}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {erroConsultaCnpj && !consultandoCnpj && (
                <div style={{
                  backgroundColor: '#f8d7da',
                  padding: '15px',
                  borderRadius: '5px',
                  color: '#721c24',
                  border: '1px solid #f5c6cb'
                }}>
                  <strong>❌ Erro na consulta:</strong> {erroConsultaCnpj}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nova Aba: Empresas Cadastradas */}
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
                      <div>
                        <h3 style={{ margin: '0 0 5px 0', color: '#343a40' }}>
                          {empresa.razaoSocial}
                        </h3>
                        {empresa.nomeFantasia && empresa.nomeFantasia !== empresa.razaoSocial && (
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                            <strong>Nome Fantasia:</strong> {empresa.nomeFantasia}
                          </p>
                        )}
                        <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                          <strong>CNPJ:</strong> {empresa.cnpj}
                        </p>
                        <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                          <strong>Cadastro:</strong> {new Date(empresa.dataCadastro).toLocaleDateString('pt-BR')}
                        </p>
                        {empresa.ultimoAcesso && (
                          <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                            <strong>Último acesso:</strong> {new Date(empresa.ultimoAcesso).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
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
                        
                        {empresa.tentativasLogin > 0 && (
                          <span style={{
                            backgroundColor: '#ffc107',
                            color: '#000',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {empresa.tentativasLogin} tentativas inválidas
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

        {/* Produtos Tab - mantido igual */}
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
                    
                    {productForm.imagem && (
                      <div style={{ marginTop: '10px' }}>
                        <img
                          src={productForm.imagem}
                          alt="Preview"
                          style={{
                            width: '100px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '5px',
                            border: '1px solid #ddd'
                          }}
                        />
                      </div>
                    )}
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
                pedidos.map(pedido => (
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
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;