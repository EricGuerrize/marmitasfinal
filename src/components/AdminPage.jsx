import React, { useState, useEffect, useCallback } from 'react';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { produtoService } from '../services/produtoService';
import { pedidoService } from '../services/pedidoService';
import ImageUpload from './ImageUpload';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';



const AdminPage = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeOrderTab, setActiveOrderTab] = useState('pendentes');; // Nova state para abas de pedidos
  const [produtos, setProdutos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [empresasCadastradas, setEmpresasCadastradas] = useState([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [productForm, setProductForm] = useState({
    nome: '',
    descricao: '',
    preco: '',
    categoria: 'fitness',
    imagem_url: '',
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

  // ✅ STATUS SIMPLIFICADOS - apenas 3 categorias principais
  const statusPedidos = [
    { value: 'pendente', label: 'Pendente', color: '#ffc107', icon: '⏳', categoria: 'pendentes' },
    { value: 'em_preparo', label: 'Em Preparo', color: '#007bff', icon: '👨‍🍳', categoria: 'pendentes' },
    { value: 'pronto', label: 'Pronto', color: '#28a745', icon: '✅', categoria: 'pendentes' },
    { value: 'entregue', label: 'Entregue', color: '#20c997', icon: '📦', categoria: 'finalizados' },
    { value: 'cancelado', label: 'Cancelado', color: '#dc3545', icon: '❌', categoria: 'cancelados' }
  ];

  // ✅ ABAS DE PEDIDOS ORGANIZADAS
  const orderTabs = [
    { 
      id: 'pendentes', 
      label: '⏳ Pendentes', 
      count: pedidos.filter(p => ['pendente', 'em_preparo', 'pronto'].includes(p.status)).length,
      description: 'Pedidos que precisam de ação'
    },
    { 
      id: 'finalizados', 
      label: '✅ Finalizados', 
      count: pedidos.filter(p => p.status === 'entregue').length,
      description: 'Pedidos entregues com sucesso'
    },
    { 
      id: 'cancelados', 
      label: '❌ Cancelados', 
      count: pedidos.filter(p => p.status === 'cancelado').length,
      description: 'Pedidos cancelados'
    },
    { 
      id: 'todos', 
      label: '📋 Todos', 
      count: pedidos.length,
      description: 'Visualizar todos os pedidos'
    }
  ];

  // ✅ FUNÇÃO PARA FILTRAR PEDIDOS POR ABA
  const getPedidosPorAba = (tabId) => {
    switch (tabId) {
      case 'pendentes':
        return pedidos.filter(p => ['pendente', 'em_preparo', 'pronto'].includes(p.status));
      case 'finalizados':
        return pedidos.filter(p => p.status === 'entregue');
      case 'cancelados':
        return pedidos.filter(p => p.status === 'cancelado');
      case 'todos':
        return pedidos;
      default:
        return pedidos;
    }
  };

  // ✅ FUNÇÃO PARA OBTER STATUS DISPONÍVEIS POR ABA
  const getStatusDisponiveis = (tabId) => {
    switch (tabId) {
      case 'pendentes':
        return statusPedidos.filter(s => ['pendente', 'em_preparo', 'pronto', 'entregue', 'cancelado'].includes(s.value));
      case 'finalizados':
        return statusPedidos.filter(s => ['entregue', 'pendente'].includes(s.value)); // Permite "reabrir" pedido
      case 'cancelados':
        return statusPedidos.filter(s => ['cancelado', 'pendente'].includes(s.value)); // Permite "reabrir" pedido
      default:
        return statusPedidos;
    }
  };

  // ✅ FUNÇÃO DE CARREGAMENTO DE PEDIDOS COM MELHOR DEBUG
  const loadPedidos = useCallback(async () => {
    try {
      console.log('🔍 Carregando pedidos do Firebase...');
      const resultado = await pedidoService.listarTodosPedidos();
      
      if (resultado.success) {
        console.log(`✅ ${resultado.data.length} pedidos carregados do Firebase`);
        
        // ✅ Debug melhorado: mostra tipos dos IDs
        if (resultado.data.length > 0) {
          console.log('🔍 Primeiros 3 pedidos carregados:', 
            resultado.data.slice(0, 3).map(p => ({ 
              id: p.id, 
              numero: p.numero, 
              tipo_id: typeof p.id,
              tipo_numero: typeof p.numero,
              status: p.status 
            }))
          );
        }
        
        // ✅ Ordena pedidos: pendentes primeiro, depois por data mais recente
        const pedidosOrdenados = resultado.data.sort((a, b) => {
          // Primeiro critério: status (pendentes primeiro)
          const statusPriorityA = ['pendente', 'em_preparo', 'pronto'].includes(a.status) ? 0 : 1;
          const statusPriorityB = ['pendente', 'em_preparo', 'pronto'].includes(b.status) ? 0 : 1;
          
          if (statusPriorityA !== statusPriorityB) {
            return statusPriorityA - statusPriorityB;
          }
          
          // Segundo critério: data mais recente primeiro
          return new Date(b.data) - new Date(a.data);
        });
        
        setPedidos(pedidosOrdenados);
      } else {
        console.error('❌ Erro ao carregar pedidos:', resultado.error);
        setPedidos([]);
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao carregar pedidos:', error);
      setPedidos([]);
    }
  }, []);

  const calcularEstatisticas = useCallback(async () => {
    try {
      const resultado = await pedidoService.obterEstatisticas();
      if (resultado.success) {
        setStats(prev => ({
          ...prev,
          totalPedidos: resultado.data.totalPedidos,
          totalVendas: resultado.data.totalVendas,
          pedidosHoje: resultado.data.pedidosHoje,
        }));
      }
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
    }
  }, []);

  const loadEmpresasCadastradas = useCallback(async () => {
    try {
      const empresas = await firebaseAuthService.listarEmpresas();
      
      const empresasComDatasCorrigidas = empresas.map(empresa => ({
        ...empresa,
        data_cadastro: empresa.data_cadastro || new Date().toISOString(),
        ultimo_acesso: empresa.ultimo_acesso || null
      }));
      
      setEmpresasCadastradas(empresasComDatasCorrigidas);
      const empresasComEmail = empresasComDatasCorrigidas.filter(e => e.email && e.email.trim() !== '').length;
      const percentual = empresasComDatasCorrigidas.length > 0 ? (empresasComEmail / empresasComDatasCorrigidas.length) * 100 : 0;
      
      setStats(prev => ({
        ...prev,
        empresasCadastradas: empresasComDatasCorrigidas.length,
        empresasComEmail,
        percentualEmails: percentual
      }));
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      setEmpresasCadastradas([]);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const data = await produtoService.listarProdutos();
      if (data) {
        setProdutos(data);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos do Firebase:', error);
      setProdutos([]);
    }
  }, []);

  const checkAdminAuth = useCallback(async () => {
    try {
      console.log('🔐 Verificando autenticação admin...');
      
      const preAuth = sessionStorage.getItem('adminPreAuthenticated');
      if (preAuth) {
        try {
          const { timestamp } = JSON.parse(preAuth);
          if (Date.now() - timestamp < 30 * 60 * 1000) {
            console.log('✅ Pré-autenticação válida');
            sessionStorage.removeItem('adminPreAuthenticated');
            setIsAuthenticated(true);
            return true;
          }
        } catch (error) {
          console.error('Erro na pré-autenticação:', error);
        }
        sessionStorage.removeItem('adminPreAuthenticated');
      }

      const sessao = await firebaseAuthService.verificarSessao();
      if (sessao && sessao.isAdmin) {
        console.log('✅ Admin autenticado via sessão principal');
        setIsAuthenticated(true);
        return true;
      }

      console.log('🚫 Acesso não autorizado');
      return false;
      
    } catch (error) {
      console.error('❌ Erro na verificação de auth:', error);
      return false;
    }
  }, []);

  const handleLogout = async () => {
    if (window.confirm('Tem certeza que deseja sair do painel admin?')) {
      try {
        setLoading(true);
        await firebaseAuthService.logout();
        sessionStorage.removeItem('adminPreAuthenticated');
        onNavigate('home');
      } catch (error) {
        console.error('Erro no logout:', error);
        onNavigate('home');
      }
    }
  };

  const validateProduct = (product) => {
    if (!product.nome?.trim()) throw new Error('Nome é obrigatório');
    if (!product.descricao?.trim()) throw new Error('Descrição é obrigatória');
    if (!product.preco || isNaN(product.preco) || product.preco <= 0) {
      throw new Error('Preço deve ser um número maior que zero');
    }
    if (!product.imagem_url?.trim()) throw new Error('URL da imagem é obrigatória');
    
    try {
      new URL(product.imagem_url);
    } catch {
      throw new Error('URL da imagem inválida');
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    
    try {
      validateProduct(productForm);
      
      const productData = {
        nome: productForm.nome.trim(),
        descricao: productForm.descricao.trim(),
        preco: parseFloat(productForm.preco),
        categoria: productForm.categoria,
        imagem_url: productForm.imagem_url.trim(),
        disponivel: productForm.disponivel,
        estoque: parseInt(productForm.estoque) || 100
      };
      
      let result;
      if (editingProduct) {
        result = await produtoService.atualizarProduto(editingProduct.id, productData);
        if (result.success) {
          alert('Produto atualizado com sucesso!');
          setEditingProduct(null);
        } else {
          throw new Error(result.error);
        }
      } else {
        result = await produtoService.adicionarProduto(productData);
        if (result.success) {
          alert('Produto adicionado com sucesso!');
        } else {
          throw new Error(result.error);
        }
      }
      
      loadProducts();
      
      setProductForm({
        nome: '',
        descricao: '',
        preco: '',
        categoria: 'fitness',
        imagem_url: '',
        disponivel: true,
        estoque: 100
      });
      setShowAddProduct(false);
      
    } catch (error) {
      alert(`Erro: ${error.message}`);
    }
  };

  const deleteProduct = async (id) => {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    if (window.confirm(`Tem certeza que deseja excluir "${produto.nome}"?`)) {
      try {
        const result = await produtoService.deletarProduto(id);
        if (result.success) {
          alert('Produto excluído com sucesso!');
          loadProducts();
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        alert(`Erro ao excluir produto: ${error.message}`);
      }
    }
  };

  const toggleProductAvailability = async (id) => {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    try {
      const result = await produtoService.atualizarProduto(id, { disponivel: !produto.disponivel });
      if (result.success) {
        alert('Status do produto atualizado com sucesso!');
        loadProducts();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      alert(`Erro ao alterar status do produto: ${error.message}`);
    }
  };

  const editProduct = (produto) => {
    setProductForm({
      nome: produto.nome,
      descricao: produto.descricao,
      preco: produto.preco.toString(),
      categoria: produto.categoria,
      imagem_url: produto.imagem_url,
      disponivel: produto.disponivel,
      estoque: produto.estoque.toString()
    });
    setEditingProduct(produto);
    setShowAddProduct(true);
  };

  // ✅ FUNÇÃO ATUALIZADA DE ALTERAR STATUS COM CORREÇÕES
  const alterarStatusPedido = async (pedidoId, novoStatus) => {
    try {
      console.log(`🔄 Iniciando alteração de status...`);
      console.log(`📋 ID recebido: ${pedidoId} (tipo: ${typeof pedidoId})`);
      console.log(`📝 Novo status: ${novoStatus}`);
      
      // ✅ BUSCA MAIS ROBUSTA - tenta com diferentes tipos
      let pedidoExistente = pedidos.find(p => String(p.id) === String(pedidoId));
      
      if (!pedidoExistente) {
        // Tenta buscar por número do pedido como fallback
        pedidoExistente = pedidos.find(p => p.numero === pedidoId || String(p.numero) === String(pedidoId));
      }
      
      if (!pedidoExistente) {
        console.error('❌ Pedido não encontrado no estado local:', pedidoId);
        console.log('📊 Pedidos disponíveis:', pedidos.map(p => ({ 
          id: p.id, 
          numero: p.numero, 
          tipo_id: typeof p.id,
          tipo_numero: typeof p.numero 
        })));
        
        // ✅ RECARREGA OS PEDIDOS EM VEZ DE RECARREGAR A PÁGINA
        console.log('🔄 Recarregando lista de pedidos...');
        await loadPedidos();
        alert('Lista de pedidos atualizada. Tente novamente.');
        return;
      }
      
      console.log(`✅ Pedido encontrado: #${pedidoExistente.numero} (ID: ${pedidoExistente.id})`);
      
      // ✅ VALIDAÇÃO DO STATUS
      const statusValido = statusPedidos.find(s => s.value === novoStatus);
      if (!statusValido) {
        console.error('❌ Status inválido:', novoStatus);
        alert('Erro: Status inválido selecionado');
        return;
      }
      
      console.log(`🔄 Chamando pedidoService.atualizarStatusPedido com ID: ${pedidoExistente.id}`);
      
      // ✅ USA O ID CORRETO DO PEDIDO ENCONTRADO
      const resultado = await pedidoService.atualizarStatusPedido(pedidoExistente.id, novoStatus);
      
      console.log('📥 Resultado do service:', resultado);
      
      if (resultado.success) {
        console.log('✅ Status atualizado com sucesso no backend');
        
        // ✅ ATUALIZA O ESTADO LOCAL USANDO O ID CORRETO
        setPedidos(prevPedidos => {
          const novosPedidos = prevPedidos.map(pedido => 
            String(pedido.id) === String(pedidoExistente.id) 
              ? { ...pedido, status: novoStatus } 
              : pedido
          );
          console.log('🔄 Estado local atualizado');
          return novosPedidos;
        });
        
        const statusInfo = statusPedidos.find(s => s.value === novoStatus);
        
        // ✅ AUTO-NAVEGAÇÃO PARA ABA CORRESPONDENTE
        if (novoStatus === 'entregue') {
          setActiveOrderTab('finalizados');
          alert(`✅ Pedido #${pedidoExistente.numero} finalizado! Movido para "Finalizados"`);
        } else if (novoStatus === 'cancelado') {
          setActiveOrderTab('cancelados');
          alert(`❌ Pedido #${pedidoExistente.numero} cancelado! Movido para "Cancelados"`);
        } else if (['pendente', 'em_preparo', 'pronto'].includes(novoStatus)) {
          setActiveOrderTab('pendentes');
          alert(`${statusInfo.icon} Status do pedido #${pedidoExistente.numero} alterado para: ${statusInfo.label}`);
        } else {
          alert(`Status do pedido #${pedidoExistente.numero} alterado para: ${statusInfo.label}`);
        }
        
        // ✅ RECARREGA ESTATÍSTICAS
        calcularEstatisticas();
        
      } else {
        console.error('❌ Erro retornado pelo service:', resultado.error);
        
        // ✅ TRATAMENTO DE ERROS ESPECÍFICOS
        if (resultado.error?.includes('not found') || resultado.error?.includes('não encontrado')) {
          alert(`Erro: Pedido #${pedidoExistente.numero} não foi encontrado no banco de dados. Recarregando a lista...`);
          await loadPedidos(); // Recarrega a lista de pedidos
        } else if (resultado.error?.includes('permission') || resultado.error?.includes('unauthorized')) {
          alert('Erro: Sem permissão para alterar este pedido. Verifique sua autenticação.');
        } else {
          alert(`Erro ao alterar status do pedido #${pedidoExistente.numero}: ${resultado.error}`);
        }
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao alterar status:', error);
      console.error('🔍 Stack trace:', error.stack);
      alert(`Erro inesperado ao alterar status do pedido. Detalhes: ${error.message}`);
    }
  };

  // ✅ FUNÇÃO ATUALIZADA DE EXCLUIR PEDIDO COM MESMAS CORREÇÕES
  const excluirPedido = async (pedidoId) => {
    // Busca mais robusta
    let pedido = pedidos.find(p => String(p.id) === String(pedidoId));
    
    if (!pedido) {
      pedido = pedidos.find(p => p.numero === pedidoId || String(p.numero) === String(pedidoId));
    }
    
    if (!pedido) {
      console.error('❌ Pedido não encontrado para exclusão:', pedidoId);
      await loadPedidos();
      alert('Lista de pedidos atualizada. Tente novamente.');
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir o pedido #${pedido.numero}?`)) {
      try {
        console.log(`🗑️ Excluindo pedido ${pedido.id}...`);
        
        const resultado = await pedidoService.excluirPedido(pedido.id);
        
        if (resultado.success) {
          const pedidosAtualizados = pedidos.filter(p => String(p.id) !== String(pedido.id));
          setPedidos(pedidosAtualizados);
          await calcularEstatisticas(); // ✅ CORRIGIDO: Chamada sem argumentos
          
          alert('Pedido excluído com sucesso!');
        } else {
          console.error('❌ Erro ao excluir no Firebase:', resultado.error);
          alert(`Erro ao excluir pedido: ${resultado.error}`);
        }
      } catch (error) {
        console.error('❌ Erro inesperado ao excluir pedido:', error);
        alert('Erro ao excluir pedido');
      }
    }
  };

  const imprimirPedido = (pedido) => {
    const statusInfo = getStatusInfo(pedido.status);
    const dataFormatada = formatarDataCompleta(pedido.data);
    const dataGeracao = formatarDataCompleta(new Date().toISOString());
    
    const quantidadeTotalMarmitas = pedido.itens 
      ? pedido.itens.reduce((total, item) => total + item.quantidade, 0)
      : 0;

    const conteudoImpressao = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Pedido #${pedido.numero} - Fit In Box</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
          
          body {
            font-family: Arial, sans-serif;
            line-height: 1.3;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 15px;
            font-size: 14px;
          }
          
          .header {
            text-align: center;
            border-bottom: 2px solid #009245;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          
          .logo {
            font-size: 24px;
            margin-bottom: 8px;
          }
          
          .empresa-nome {
            font-size: 20px;
            font-weight: bold;
            color: #009245;
            margin: 0;
          }
          
          .subtitle {
            color: #666;
            margin: 3px 0 0 0;
            font-size: 13px;
          }
          
          .info-section {
            background-color: #f8f9fa;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 15px;
            border-left: 3px solid #009245;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          
          .info-item {
            margin-bottom: 8px;
            font-size: 13px;
          }
          
          .label {
            font-weight: bold;
            color: #009245;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            font-size: 13px;
          }
          
          .items-table th {
            background-color: #009245;
            color: white;
            padding: 8px;
            text-align: left;
            font-weight: bold;
            font-size: 12px;
          }
          
          .items-table td {
            padding: 6px 8px;
            border-bottom: 1px solid #ddd;
          }
          
          .items-table tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          
          .items-table tfoot {
            background-color: #e8f5e8;
            font-weight: bold;
          }
          
          .total-section {
            background-color: #e8f5e8;
            padding: 12px;
            border-radius: 6px;
            text-align: right;
            border: 2px solid #009245;
            margin-bottom: 15px;
          }
          
          .total-value {
            font-size: 20px;
            font-weight: bold;
            color: #009245;
          }
          
          .endereco-section, .obs-section {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 10px;
            border-radius: 6px;
            margin: 12px 0;
            font-size: 13px;
          }
          
          .obs-section {
            background-color: #d1ecf1;
            border-color: #bee5eb;
          }
          
          .section-title {
            font-weight: bold;
            color: #856404;
            margin-bottom: 6px;
            font-size: 12px;
          }
          
          .obs-section .section-title {
            color: #0c5460;
          }
          
          .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 11px;
          }
          
          @media print {
            body { 
              margin: 0;
              padding: 10px;
              font-size: 12px;
            }
            .info-grid {
              grid-template-columns: 1fr;
              gap: 8px;
            }
            .header {
              margin-bottom: 15px;
            }
            .items-table {
              margin: 10px 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🍽️</div>
          <h1 class="empresa-nome">Fit In Box</h1>
          <p class="subtitle">Marmitas Saudáveis e Saborosas</p>
        </div>

        <div class="info-section">
          <div class="info-grid">
            <div>
              <div class="info-item">
                <span class="label">Pedido:</span> #${pedido.numero}
              </div>
              <div class="info-item">
                <span class="label">Data:</span> ${dataFormatada}
              </div>
            </div>
            <div>
              <div class="info-item">
                <span class="label">Cliente:</span> ${pedido.cliente}
              </div>
              <div class="info-item">
                <span class="label">CNPJ:</span> ${pedido.cnpj}
              </div>
            </div>
          </div>
        </div>

        ${pedido.enderecoEntrega ? `
          <div class="endereco-section">
            <div class="section-title">📍 Endereço de Entrega:</div>
            <div>${pedido.enderecoEntrega}</div>
          </div>
        ` : ''}

        ${pedido.observacoes ? `
          <div class="obs-section">
            <div class="section-title">💬 Observações:</div>
            <div>${pedido.observacoes}</div>
          </div>
        ` : ''}

        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qtd</th>
              <th>Valor Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${pedido.itens ? pedido.itens.map(item => `
              <tr>
                <td>${item.nome}</td>
                <td>${item.quantidade}</td>
                <td>R$ ${item.preco.toFixed(2)}</td>
                <td>R$ ${(item.quantidade * item.preco).toFixed(2)}</td>
              </tr>
            `).join('') : ''}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align: right; padding-right: 15px;">
                <strong>Total de Marmitas:</strong>
              </td>
              <td style="text-align: left;">
                <strong>${quantidadeTotalMarmitas} unidades</strong>
              </td>
            </tr>
          </tfoot>
        </table>

        <div class="total-section">
          <div style="margin-bottom: 5px;">Total do Pedido:</div>
          <div class="total-value">R$ ${pedido.total.toFixed(2)}</div>
        </div>

        <div class="footer">
          <p>Documento gerado em ${dataGeracao}</p>
          <p>Fit In Box - Alimentação Corporativa Saudável</p>
        </div>
      </body>
      </html>
    `;

    const janelaImpressao = window.open('', '_blank');
    janelaImpressao.document.write(conteudoImpressao);
    janelaImpressao.document.close();
    janelaImpressao.focus();
    
    setTimeout(() => {
      janelaImpressao.print();
    }, 250);
  };

  const getStatusInfo = (status) => {
    return statusPedidos.find(s => s.value === status) || statusPedidos[0];
  };

  const toggleEmpresaAtiva = async (empresaId, ativo) => {
    try {
      const resultado = await firebaseAuthService.toggleEmpresaAtiva(empresaId, !ativo);
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

  const formatarEmail = (email) => {
    if (!email) return 'Não informado';
    return email;
  };

  const formatarData = (dataString) => {
    if (!dataString) return 'Não informado';
    
    try {
      const data = new Date(dataString);
      
      if (isNaN(data.getTime())) {
        return 'Data inválida';
      }
      
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  };

  const formatarDataCompleta = (dataString) => {
    if (!dataString) return 'Não informado';
    
    try {
      const data = new Date(dataString);
      
      if (isNaN(data.getTime())) {
        return 'Data inválida';
      }
      
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Erro ao formatar data completa:', error);
      return 'Data inválida';
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const isAuth = await checkAdminAuth();
      if (!isAuth) {
        onNavigate('home');
        return;
      }
      await Promise.all([
        loadProducts(),
        loadPedidos(),
        loadEmpresasCadastradas(),
        calcularEstatisticas()
      ]);
      setLoading(false);
    };
    init();
  }, [checkAdminAuth, onNavigate, loadProducts, loadPedidos, loadEmpresasCadastradas, calcularEstatisticas]);

  // ✅ FIREBASE REAL-TIME LISTENER (Removido temporariamente)
// ✅ CÓDIGO CORRIGIDO (funcional):
useEffect(() => {
  if (!isAuthenticated) return;

  console.log('📡 Iniciando Firebase real-time listener...');
  
  try {
    // ✅ Configura listener para pedidos em tempo real
    const pedidosRef = collection(db, 'pedidos');
    const q = query(pedidosRef, orderBy('data', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('🔄 Mudanças detectadas nos pedidos:', snapshot.docChanges().length);
      
      snapshot.docChanges().forEach((change) => {
        const pedidoData = { id: change.doc.id, ...change.doc.data() };
        
        if (change.type === 'added') {
          console.log('✅ Novo pedido detectado:', pedidoData.numero);
          
          // Atualiza lista de pedidos
          setPedidos(prevPedidos => {
            // Verifica se o pedido já existe para evitar duplicatas
            const jaExiste = prevPedidos.some(p => p.id === pedidoData.id);
            if (jaExiste) return prevPedidos;
            
            // Adiciona novo pedido no início da lista
            return [pedidoData, ...prevPedidos];
          });
          
          // Recalcula estatísticas
          calcularEstatisticas();
          
          // Navega para aba de pedidos pendentes se novo pedido
          if (activeTab !== 'pedidos') {
            console.log('🔔 Novo pedido! Navegando para aba de pedidos...');
            setActiveTab('pedidos');
            setActiveOrderTab('pendentes');
          }
          
          // Notificação visual (opcional)
          if (Notification.permission === 'granted') {
            new Notification('Novo Pedido!', {
              body: `Pedido #${pedidoData.numero} recebido`,
              icon: '/favicon.ico'
            });
          }
          
        } else if (change.type === 'modified') {
          console.log('📝 Pedido atualizado:', pedidoData.numero);
          
          // Atualiza pedido existente
          setPedidos(prevPedidos => 
            prevPedidos.map(p => 
              p.id === pedidoData.id ? pedidoData : p
            )
          );
          
          // Recalcula estatísticas
          calcularEstatisticas();
          
        } else if (change.type === 'removed') {
          console.log('🗑️ Pedido removido:', pedidoData.numero);
          
          // Remove pedido da lista
          setPedidos(prevPedidos => 
            prevPedidos.filter(p => p.id !== pedidoData.id)
          );
          
          // Recalcula estatísticas
          calcularEstatisticas();
        }
      });
    }, (error) => {
      console.error('❌ Erro no listener de pedidos:', error);
    });

    // ✅ Listener para produtos em tempo real
    const produtosRef = collection(db, 'produtos');
    const unsubscribeProdutos = onSnapshot(produtosRef, (snapshot) => {
      console.log('🔄 Mudanças detectadas nos produtos:', snapshot.docChanges().length);
      
      snapshot.docChanges().forEach((change) => {
        const produtoData = { id: change.doc.id, ...change.doc.data() };
        
        if (change.type === 'added') {
          console.log('✅ Novo produto detectado:', produtoData.nome);
          
          setProdutos(prevProdutos => {
            const jaExiste = prevProdutos.some(p => p.id === produtoData.id);
            if (jaExiste) return prevProdutos;
            return [...prevProdutos, produtoData];
          });
          
        } else if (change.type === 'modified') {
          console.log('📝 Produto atualizado:', produtoData.nome);
          
          setProdutos(prevProdutos => 
            prevProdutos.map(p => 
              p.id === produtoData.id ? produtoData : p
            )
          );
          
        } else if (change.type === 'removed') {
          console.log('🗑️ Produto removido:', produtoData.nome);
          
          setProdutos(prevProdutos => 
            prevProdutos.filter(p => p.id !== produtoData.id)
          );
        }
      });
    }, (error) => {
      console.error('❌ Erro no listener de produtos:', error);
    });

    console.log('✅ Firebase real-time listeners configurados com sucesso!');

    // ✅ Cleanup function - remove listeners quando componente desmonta
    return () => {
      console.log('🔌 Desconectando Firebase listeners...');
      unsubscribe();
      unsubscribeProdutos();
    };
    
  } catch (error) {
    console.error('❌ Erro ao configurar Firebase listeners:', error);
  }
  
}, [isAuthenticated, calcularEstatisticas, activeTab]);


  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '48px' }}>🔄</div>
        <div style={{ fontSize: '18px', color: '#666' }}>Carregando Painel Admin...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{
      margin: 0,
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
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
          onClick={handleLogout}
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

      {/* Tabs */}
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

      {/* Content */}
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
                    imagem_url: '',
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

            {/* Form de adicionar/editar produto */}
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
                <form onSubmit={handleProductSubmit}>
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
                      currentImage={productForm.imagem_url}
                      onImageUpload={(imageUrl) =>
                        setProductForm({ ...productForm, imagem_url: imageUrl })
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

            {/* Lista de produtos */}
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
                    src={produto.imagem_url}
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
                        onClick={() => toggleProductAvailability(produto.id)}
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
                        onClick={() => deleteProduct(produto.id)}
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

        {/* ✅ PEDIDOS TAB COM NOVA ORGANIZAÇÃO */}
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
                🔄 Atualização manual
              </div>
            </div>

            {/* ✅ ABAS DE ORGANIZAÇÃO DOS PEDIDOS */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '10px',
              marginBottom: '20px',
              overflow: 'hidden',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                display: 'flex',
                borderBottom: '1px solid #dee2e6'
              }}>
                {orderTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveOrderTab(tab.id)}
                    style={{
                      flex: 1,
                      background: activeOrderTab === tab.id ? '#007bff' : 'white',
                      color: activeOrderTab === tab.id ? 'white' : '#6c757d',
                      border: 'none',
                      padding: '15px 10px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      borderBottom: activeOrderTab === tab.id ? '3px solid #0056b3' : '3px solid transparent',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ marginBottom: '3px' }}>{tab.label}</div>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 'bold',
                      color: activeOrderTab === tab.id ? '#ffd700' : '#28a745'
                    }}>
                      {tab.count}
                    </div>
                    <div style={{ 
                      fontSize: '10px', 
                      opacity: 0.8,
                      marginTop: '2px'
                    }}>
                      {tab.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ✅ LISTA DE PEDIDOS FILTRADA */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              {getPedidosPorAba(activeOrderTab).length === 0 ? (
                <div style={{
                  backgroundColor: 'white',
                  padding: '40px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  color: '#666',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>
                    {activeOrderTab === 'pendentes' ? '⏳' : 
                     activeOrderTab === 'finalizados' ? '✅' : 
                     activeOrderTab === 'cancelados' ? '❌' : '📋'}
                  </div>
                  <h3>
                    {activeOrderTab === 'pendentes' ? 'Nenhum pedido pendente' :
                     activeOrderTab === 'finalizados' ? 'Nenhum pedido finalizado' :
                     activeOrderTab === 'cancelados' ? 'Nenhum pedido cancelado' :
                     'Nenhum pedido encontrado'}
                  </h3>
                  <p>
                    {activeOrderTab === 'pendentes' ? 'Novos pedidos aparecerão aqui.' :
                     activeOrderTab === 'finalizados' ? 'Pedidos entregues aparecerão aqui.' :
                     activeOrderTab === 'cancelados' ? 'Pedidos cancelados aparecerão aqui.' :
                     'Todos os pedidos aparecerão aqui.'}
                  </p>
                </div>
              ) : (
                getPedidosPorAba(activeOrderTab).map(pedido => {
                  const statusInfo = getStatusInfo(pedido.status);
                  return (
                    <div
                      key={pedido.id}
                      style={{
                        backgroundColor: 'white',
                        padding: '25px',
                        borderRadius: '10px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        border: activeOrderTab === 'pendentes' && ['pendente', 'em_preparo'].includes(pedido.status) 
                          ? '2px solid #ffc107' : 'none'
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
                            {formatarDataCompleta(pedido.data)}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ 
                            marginBottom: '10px', 
                            display: 'flex', 
                            gap: '5px', 
                            alignItems: 'center', 
                            flexWrap: 'wrap', 
                            justifyContent: 'flex-end' 
                          }}>
                            <select
                              value={pedido.status}
                              onChange={(e) => {
                                const novoStatus = e.target.value;
                                console.log(`🎯 Select onChange - Status: ${novoStatus}, Pedido ID: ${pedido.id}, Pedido Número: ${pedido.numero}`);
                                console.log(`🔍 Tipos - ID: ${typeof pedido.id}, Número: ${typeof pedido.numero}`);
                                
                                // ✅ PASSA O ID DO PEDIDO, NÃO O NÚMERO
                                alterarStatusPedido(pedido.id, novoStatus);
                              }}
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
                              {getStatusDisponiveis(activeOrderTab).map(status => (
                                <option key={status.value} value={status.value}>
                                  {status.icon} {status.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => imprimirPedido(pedido)}
                              style={{
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                              title="Imprimir pedido"
                            >
                              🖨️ Imprimir
                            </button>
                            <button
                              onClick={() => {
                                console.log(`🗑️ Botão excluir clicado - Pedido ID: ${pedido.id}, Número: ${pedido.numero}`);
                                excluirPedido(pedido.id); // Passa o ID, não o número
                              }}
                              style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                              title="Excluir pedido"
                            >
                              🗑️ Excluir
                            </button>
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

        {/* Empresas Tab */}
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
                          <strong>Cadastro:</strong> {formatarData(empresa.data_cadastro)}
                        </p>
                        {empresa.ultimo_acesso && (
                          <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                            <strong>Último acesso:</strong> {formatarDataCompleta(empresa.ultimo_acesso)}
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