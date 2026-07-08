import React, { useState, useEffect, useCallback, useRef } from 'react';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { produtoService } from '../services/produtoService';
import { pedidoService } from '../services/pedidoService';
import ImageUpload from './ImageUpload';
import {
  onSnapshot, collection, query, orderBy, where, limit, startAfter,
  getDocs, getCountFromServer, getAggregateFromServer, sum, Timestamp
} from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { useWindowSize } from '../hooks/useWindowSize';
import './AdminPage.css';

// ─── Formatadores (padrão brasileiro) ───────────────────────────────────────
// Dinheiro: 535047.28 → "R$ 535.047,28"
const formatBRL = (valor) =>
  (Number(valor) || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

// Inteiros: 1250 → "1.250" (separador de milhar)
const formatInt = (valor) =>
  (Number(valor) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

const PEDIDOS_PAGE_SIZE = 30;

const formatPedidoDoc = (pedidoDoc) => {
  const pedido = pedidoDoc.data();
  return {
    id: pedidoDoc.id,
    ...pedido,
    cliente: pedido.empresa_nome || 'Cliente não informado',
    cnpj: pedido.empresa_cnpj || 'CNPJ não informado',
    total: Number(pedido.total) || 0,
    status: pedido.status || 'pendente',
    data: pedido.data_pedido || pedido.created_at,
    enderecoEntrega: pedido.endereco_entrega,
    itens: Array.isArray(pedido.itens) ? pedido.itens : []
  };
};

const AdminPage = ({ onNavigate, initialTab = 'dashboard' }) => {
  const { isMobile } = useWindowSize();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeOrderTab, setActiveOrderTab] = useState('pendentes');
  const [produtos, setProdutos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [empresasCadastradas, setEmpresasCadastradas] = useState([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadingImage] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMorePedidos, setLoadingMorePedidos] = useState(false);
  const [hasMorePedidos, setHasMorePedidos] = useState(false);
  const pedidosCursorRef = useRef(null);
  
  const [productForm, setProductForm] = useState({
    nome: '',
    descricao: '',
    preco: '',
    categoria: 'fitness',
    imagem_url: '',
    disponivel: true,
    estoque: 100
  });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);



  const obterNumeroPedido = (pedido) => {
    // Tenta diferentes campos para o número do pedido
    if (pedido.numero && pedido.numero !== undefined && pedido.numero !== null) {
      return pedido.numero;
    }
    if (pedido.numeroPedido) {
      return pedido.numeroPedido;
    }
    if (pedido.pedido_numero) {
      return pedido.pedido_numero;
    }
    if (pedido.order_number) {
      return pedido.order_number;
    }
    if (pedido.id) {
      // Usa os primeiros 8 caracteres do ID se for string longa
      if (typeof pedido.id === 'string' && pedido.id.length > 8) {
        return pedido.id.substring(0, 8);
      }
      return pedido.id;
    }
    return 'S/N';
  };
  

  const [stats, setStats] = useState({
    totalPedidos: 0,
    totalVendas: 0,
    pedidosPendentes: 0,
    produtosMaisVendidos: [],
    pedidosHoje: 0,
    empresasCadastradas: 0,
    empresasComEmail: 0,
    percentualEmails: 0,
    produtosAtivos: 0
  });

  // ✅ 1. CORRIGIR OS STATUS - deixar apenas 3 opções
  const statusPedidos = [
    { value: 'pendente', label: 'Pendente', color: '#ffc107', icon: '⏳' },
    { value: 'pronto', label: 'Finalizado', color: '#28a745', icon: '✅' }, // ✅ MUDANÇA: "Pronto" vira "Finalizado"
    { value: 'cancelado', label: 'Cancelado', color: '#dc3545', icon: '❌' }
  ];

  // ✅ 2. ATUALIZAR AS ABAS DE PEDIDOS para refletir os novos status
  const orderTabs = [
    { 
      id: 'pendentes', 
      label: '⏳ Pendentes', 
      count: pedidos.filter(p => p.status === 'pendente').length, // ✅ APENAS "pendente"
      description: 'Pedidos que precisam de ação'
    },
    { 
      id: 'finalizados', 
      label: '✅ Finalizados', 
      count: pedidos.filter(p => p.status === 'pronto').length, // ✅ APENAS "pronto"
      description: 'Pedidos finalizados'
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

  // ✅ 3. CORRIGIR FUNÇÃO DE FILTRAR PEDIDOS
  const getPedidosPorAba = (tabId) => {
    switch (tabId) {
      case 'pendentes':
        return pedidos.filter(p => p.status === 'pendente'); // ✅ APENAS "pendente"
      case 'finalizados':
        return pedidos.filter(p => p.status === 'pronto'); // ✅ APENAS "pronto" 
      case 'cancelados':
        return pedidos.filter(p => p.status === 'cancelado');
      case 'todos':
        return pedidos;
      default:
        return pedidos;
    }
  };



  // ✅ 6. CORRIGIR FUNÇÃO DE ALTERAR STATUS
  const alterarStatusPedido = async (pedidoId, novoStatus) => {
    try {
      console.log(`🔄 Iniciando alteração de status...`);
      console.log(`📋 ID recebido: ${pedidoId} (tipo: ${typeof pedidoId})`);
      console.log(`📝 Novo status: ${novoStatus}`);
      
      let pedidoExistente = pedidos.find(p => String(p.id) === String(pedidoId));
      
      if (!pedidoExistente) {
        pedidoExistente = pedidos.find(p => p.numero === pedidoId || String(p.numero) === String(pedidoId));
      }
      
      if (!pedidoExistente) {
        console.error('❌ Pedido não encontrado no estado local:', pedidoId);
        await loadPedidos();
        alert('Lista de pedidos atualizada. Tente novamente.');
        return;
      }
      
      console.log(`✅ Pedido encontrado: #${pedidoExistente.numero} (ID: ${pedidoExistente.id})`);
      
      // ✅ VALIDAÇÃO DO STATUS COM NOVOS STATUS
      const statusValido = statusPedidos.find(s => s.value === novoStatus);
      if (!statusValido) {
        console.error('❌ Status inválido:', novoStatus);
        alert('Erro: Status inválido selecionado');
        return;
      }
      
      console.log(`🔄 Chamando pedidoService.atualizarStatusPedido com ID: ${pedidoExistente.id}`);
      
      const resultado = await pedidoService.atualizarStatusPedido(pedidoExistente.id, novoStatus);
      
      if (resultado.success) {
        console.log('✅ Status atualizado com sucesso no backend');
        
        // ✅ ATUALIZA O ESTADO LOCAL
        setPedidos(prevPedidos => {
          const novosPedidos = prevPedidos.map(pedido => 
            String(pedido.id) === String(pedidoExistente.id) 
              ? { ...pedido, status: novoStatus } 
              : pedido
          );
          console.log('🔄 Estado local atualizado');
          
          // ✅ LOG PARA DEBUG
          const pedidosPendentesAposUpdate = novosPedidos.filter(p => p.status === 'pendente').length;
          console.log('📊 Pedidos pendentes após update:', pedidosPendentesAposUpdate);
          
          return novosPedidos;
        });
        
        // ✅ AUTO-NAVEGAÇÃO SIMPLIFICADA
        if (novoStatus === 'pronto') {
          setActiveOrderTab('finalizados');
          alert(`✅ Pedido #${pedidoExistente.numero} finalizado! Movido para "Finalizados"`);
        } else if (novoStatus === 'cancelado') {
          setActiveOrderTab('cancelados');
          alert(`❌ Pedido #${pedidoExistente.numero} cancelado! Movido para "Cancelados"`);
        } else if (novoStatus === 'pendente') {
          setActiveOrderTab('pendentes');
          alert(`⏳ Pedido #${pedidoExistente.numero} alterado para: Pendente`);
        }
        loadDashboardStats();
        
      } else {
        console.error('❌ Erro retornado pelo service:', resultado.error);
        
        if (resultado.error?.includes('not found') || resultado.error?.includes('não encontrado')) {
          alert(`Erro: Pedido #${pedidoExistente.numero} não foi encontrado no banco de dados. Recarregando a lista...`);
          await loadPedidos();
        } else if (resultado.error?.includes('permission') || resultado.error?.includes('unauthorized')) {
          alert('Erro: Sem permissão para alterar este pedido. Verifique sua autenticação.');
        } else {
          alert(`Erro ao alterar status do pedido #${pedidoExistente.numero}: ${resultado.error}`);
        }
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao alterar status:', error);
      alert(`Erro inesperado ao alterar status do pedido. Detalhes: ${error.message}`);
    }
  };

  const loadPedidos = useCallback(async () => {
    try {
      console.log('🔍 Carregando pedidos do Firebase...');
      const resultado = await pedidoService.listarTodosPedidos();
      
      if (resultado.success) {
        console.log(`✅ ${resultado.data.length} pedidos carregados do Firebase`);
        
        // ✅ Ordena pedidos: pendentes primeiro, depois por data mais recente
        const pedidosOrdenados = resultado.data.sort((a, b) => {
          // Primeiro critério: status (pendentes primeiro)
          const statusPriorityA = a.status === 'pendente' ? 0 : 1;
          const statusPriorityB = b.status === 'pendente' ? 0 : 1;
          
          if (statusPriorityA !== statusPriorityB) {
            return statusPriorityA - statusPriorityB;
          }
          
          // Segundo critério: data mais recente primeiro
          try {
            const dataA = a.data_pedido?.toDate ? a.data_pedido.toDate() : new Date(a.data_pedido || Date.now());
            const dataB = b.data_pedido?.toDate ? b.data_pedido.toDate() : new Date(b.data_pedido || Date.now());
            return dataB - dataA;
          } catch (error) {
            console.error('Erro ao ordenar por data:', error);
            return 0;
          }
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

  const loadDashboardStats = useCallback(async () => {
    try {
      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);
      const inicioAmanha = new Date(inicioHoje);
      inicioAmanha.setDate(inicioAmanha.getDate() + 1);

      const pedidosRef = collection(db, 'pedidos');
      const produtosRef = collection(db, 'produtos');
      const empresasRef = collection(db, 'empresas');

      const results = await Promise.allSettled([
        getCountFromServer(pedidosRef),
        getCountFromServer(query(pedidosRef, where('status', '==', 'pendente'))),
        getCountFromServer(query(
          pedidosRef,
          where('data_pedido', '>=', Timestamp.fromDate(inicioHoje)),
          where('data_pedido', '<', Timestamp.fromDate(inicioAmanha))
        )),
        getAggregateFromServer(pedidosRef, { totalVendas: sum('total') }),
        getCountFromServer(query(produtosRef, where('disponivel', '==', true))),
        getCountFromServer(empresasRef),
        getCountFromServer(query(empresasRef, where('email', '!=', '')))
      ]);

      const countResult = (index) => results[index].status === 'fulfilled'
        ? results[index].value.data().count
        : null;
      const totalPedidos = countResult(0);
      const pedidosPendentes = countResult(1);
      const pedidosHoje = countResult(2);
      const totalVendas = results[3].status === 'fulfilled'
        ? Number(results[3].value.data().totalVendas) || 0
        : null;
      const produtosAtivos = countResult(4);
      const totalEmpresas = countResult(5);
      const empresasComEmail = countResult(6);

      setStats(prev => ({
        ...prev,
        totalPedidos: totalPedidos ?? prev.totalPedidos,
        pedidosPendentes: pedidosPendentes ?? prev.pedidosPendentes,
        pedidosHoje: pedidosHoje ?? prev.pedidosHoje,
        totalVendas: totalVendas ?? prev.totalVendas,
        empresasCadastradas: totalEmpresas ?? prev.empresasCadastradas,
        empresasComEmail: empresasComEmail ?? prev.empresasComEmail,
        percentualEmails: totalEmpresas !== null && empresasComEmail !== null && totalEmpresas > 0
          ? (empresasComEmail / totalEmpresas) * 100
          : prev.percentualEmails,
        produtosAtivos: produtosAtivos ?? prev.produtosAtivos
      }));
    } catch (error) {
      console.error('Erro ao carregar métricas do dashboard:', error);
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
          loadDashboardStats();
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
            color: '#009245';
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            font-size: 13px;
          }
          
          .items-table th {
            background-color: '#009245';
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
            background-color: '#f8f9fa';
          }
          
          .items-table tfoot {
            background-color: '#e8f5e8';
            font-weight: bold;
          }
          
          .total-section {
            background-color: '#e8f5e8';
            padding: 12px;
            border-radius: 6px;
            text-align: right;
            border: 2px solid '#009245';
            margin-bottom: 15px;
          }
          
          .total-value {
            font-size: 20px;
            font-weight: bold;
            color: '#009245';
          }
          
          .endereco-section, .obs-section {
            background-color: '#fff3cd';
            border: 1px solid '#ffeaa7';
            padding: 10px;
            border-radius: 6px;
            margin: 12px 0;
            font-size: 13px;
          }
          
          .obs-section {
            background-color: '#d1ecf1';
            border-color: '#bee5eb';
          }
          
          .section-title {
            font-weight: bold;
            color: '#856404';
            margin-bottom: 6px;
            font-size: 12px;
          }
          
          .obs-section .section-title {
            color: '#0c5460';
          }
          
          .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            color: '#666';
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
                <td>${formatBRL(item.preco)}</td>
                <td>${formatBRL(item.quantidade * item.preco)}</td>
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
          <div class="total-value">${formatBRL(pedido.total)}</div>
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
  
  const formatarDataCompleta = (dataInput) => {
    if (!dataInput) return 'Data não informada';
    
    try {
      let data;
      
      // ✅ Se é um Timestamp do Firebase
      if (dataInput && typeof dataInput.toDate === 'function') {
        data = dataInput.toDate();
      }
      // ✅ Se é uma string
      else if (typeof dataInput === 'string') {
        if (dataInput.includes('T')) {
          // Formato ISO: "2024-01-15T10:30:00.000Z"
          data = new Date(dataInput);
        } else if (dataInput.includes('/')) {
          // Formato brasileiro: "15/01/2024 10:30"
          const [datePart, timePart = '00:00'] = dataInput.split(' ');
          const [day, month, year] = datePart.split('/');
          data = new Date(`${year}-${month}-${day}T${timePart}`);
        } else {
          // Tenta parsear diretamente
          data = new Date(dataInput);
        }
      }
      // ✅ Se já é um objeto Date
      else if (dataInput instanceof Date) {
        data = dataInput;
      }
      // ✅ Fallback
      else {
        data = new Date(dataInput);
      }
      
      // ✅ Verifica se a data é válida
      if (isNaN(data.getTime())) {
        console.error('Data inválida recebida:', dataInput);
        return 'Data inválida';
      }
      
      // ✅ Formata para português brasileiro
      return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
      });
      
    } catch (error) {
      console.error('Erro ao formatar data:', error, 'Data:', dataInput);
      return 'Data inválida';
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      const withTimeout = (promise, ms) => Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout ao carregar painel admin')), ms)
        )
      ]);

      try {
        const isAuth = await withTimeout(checkAdminAuth(), 15000);
        if (!isAuth) {
          setLoading(false);
          onNavigate('home');
          return;
        }
        setLoading(false);
      } catch (error) {
        console.error('❌ Erro ou timeout na inicialização do painel admin:', error.message);
        setLoading(false);
        onNavigate('home');
        return;
      }

    };
    init();
  }, [checkAdminAuth, onNavigate]);

  const loadMorePedidos = useCallback(async () => {
    if (!pedidosCursorRef.current || loadingMorePedidos) return;
    setLoadingMorePedidos(true);
    try {
      const statusPorAba = {
        pendentes: 'pendente',
        finalizados: 'pronto',
        cancelados: 'cancelado'
      };
      const baseConstraints = statusPorAba[activeOrderTab]
        ? [where('status', '==', statusPorAba[activeOrderTab])]
        : [orderBy('data_pedido', 'desc')];
      const nextQuery = query(
        collection(db, 'pedidos'),
        ...baseConstraints,
        startAfter(pedidosCursorRef.current),
        limit(PEDIDOS_PAGE_SIZE)
      );
      const snapshot = await getDocs(nextQuery);
      const novosPedidos = snapshot.docs.map(formatPedidoDoc);

      setPedidos(prev => {
        const existentes = new Set(prev.map(pedido => pedido.id));
        const todos = [...prev, ...novosPedidos.filter(pedido => !existentes.has(pedido.id))];
        
        // Ordena por data (mais recente primeiro)
        return todos.sort((a, b) => {
          try {
            const dataA = a.data_pedido?.toDate ? a.data_pedido.toDate() : new Date(a.data_pedido || a.data || 0);
            const dataB = b.data_pedido?.toDate ? b.data_pedido.toDate() : new Date(b.data_pedido || b.data || 0);
            return dataB - dataA;
          } catch (e) {
            return 0;
          }
        });
      });
      pedidosCursorRef.current = snapshot.docs[snapshot.docs.length - 1] || pedidosCursorRef.current;
      setHasMorePedidos(snapshot.size === PEDIDOS_PAGE_SIZE);
    } catch (error) {
      console.error('Erro ao carregar mais pedidos:', error);
    } finally {
      setLoadingMorePedidos(false);
    }
  }, [activeOrderTab, loadingMorePedidos]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'dashboard') return undefined;
    loadDashboardStats();
    const intervalId = setInterval(loadDashboardStats, 60000);
    return () => clearInterval(intervalId);
  }, [isAuthenticated, activeTab, loadDashboardStats]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'empresas') {
      loadEmpresasCadastradas();
    }
  }, [isAuthenticated, activeTab, loadEmpresasCadastradas]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'pedidos') return undefined;

    const statusPorAba = {
      pendentes: 'pendente',
      finalizados: 'pronto',
      cancelados: 'cancelado'
    };
    const baseConstraints = statusPorAba[activeOrderTab]
      ? [where('status', '==', statusPorAba[activeOrderTab])]
      : [orderBy('data_pedido', 'desc')];
    const firstPageQuery = query(
      collection(db, 'pedidos'),
      ...baseConstraints,
      limit(PEDIDOS_PAGE_SIZE)
    );

    pedidosCursorRef.current = null;
    setPedidos([]);
    setHasMorePedidos(false);

    return onSnapshot(firstPageQuery, (snapshot) => {
      const primeiraPagina = snapshot.docs.map(formatPedidoDoc);
      setPedidos(prev => {
        const idsPrimeiraPagina = new Set(primeiraPagina.map(pedido => pedido.id));
        const paginasExtras = prev.filter(pedido => !idsPrimeiraPagina.has(pedido.id));
        
        const todos = [...primeiraPagina, ...paginasExtras];
        
        // Ordena por data (mais recente primeiro)
        return todos.sort((a, b) => {
          try {
            const dataA = a.data_pedido?.toDate ? a.data_pedido.toDate() : new Date(a.data_pedido || a.data || 0);
            const dataB = b.data_pedido?.toDate ? b.data_pedido.toDate() : new Date(b.data_pedido || b.data || 0);
            return dataB - dataA;
          } catch (e) {
            return 0;
          }
        });
      });
      if (!pedidosCursorRef.current) {
        pedidosCursorRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
        setHasMorePedidos(snapshot.size === PEDIDOS_PAGE_SIZE);
      }
    }, (error) => {
      console.error('Erro no listener de pedidos:', error);
    });
  }, [isAuthenticated, activeTab, activeOrderTab]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'produtos') return undefined;

    return onSnapshot(collection(db, 'produtos'), (snapshot) => {
      const produtosAtualizados = snapshot.docs
        .map(produtoDoc => ({ id: produtoDoc.id, ...produtoDoc.data() }))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      setProdutos(produtosAtualizados);
    }, (error) => {
      console.error('Erro no listener de produtos:', error);
    });
  }, [isAuthenticated, activeTab]);


  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif',
        flexDirection: 'column',
        gap: '24px',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #eef1f5 100%)'
      }}>
        <style>{`
          @keyframes adminSpin { to { transform: rotate(360deg); } }
          @keyframes adminPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        `}</style>
        <div style={{
          width: '56px',
          height: '56px',
          border: '5px solid #e3e7ee',
          borderTopColor: '#2e7d32',
          borderRadius: '50%',
          animation: 'adminSpin 0.8s linear infinite'
        }} />
        <div style={{
          fontSize: '18px',
          color: '#555',
          fontWeight: 500,
          animation: 'adminPulse 1.5s ease-in-out infinite'
        }}>
          Carregando Painel Admin...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="admin-shell" style={{
      margin: 0,
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <header className="admin-header" style={{
        background: '#343a40',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px 16px' : '15px 40px',
        gap: '10px'
      }}>
        <div className="admin-brand" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '15px', minWidth: 0 }}>
          <div className="admin-brand__mark">FB</div>
          <div style={{ minWidth: 0 }}>
            <small className="admin-brand__eyebrow">OPERAÇÃO FIT IN BOX</small>
            <h2 className="admin-brand__title" style={{ margin: 0, fontSize: isMobile ? '18px' : '24px' }}>Central de gestão</h2>
          </div>
        </div>
        <button
          className="admin-logout"
          onClick={handleLogout}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: isMobile ? '8px 14px' : '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          Sair
        </button>
      </header>

      {/* Tabs */}
      <nav className="admin-nav" aria-label="Navegação administrativa" style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #dee2e6',
        padding: isMobile ? '0 8px' : '0 40px'
      }}>
        <div className="admin-nav__track" style={{
          display: 'flex',
          gap: isMobile ? '8px' : '30px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          {[
            { id: 'dashboard', label: 'Visão geral', index: '01' },
            { id: 'produtos', label: 'Produtos', index: '02' },
            { id: 'pedidos', label: 'Pedidos', index: '03' },
            { id: 'empresas', label: 'Empresas', index: '04' }
          ].map(tab => (
            <button
              key={tab.id}
              className="admin-nav__item"
              data-active={activeTab === tab.id}
              onClick={() => onNavigate(tab.id === 'dashboard' ? 'admin' : `admin-${tab.id}`)}
              style={{
                background: 'none',
                border: 'none',
                padding: isMobile ? '14px 10px' : '15px 0',
                fontSize: isMobile ? '14px' : '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                borderBottom: activeTab === tab.id ? '3px solid #007bff' : '3px solid transparent',
                color: activeTab === tab.id ? '#007bff' : '#6c757d'
              }}
            >
              <span className="admin-nav__index">{tab.index}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="admin-content" style={{
        padding: isMobile ? '16px 12px' : '30px 40px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* ✅ DASHBOARD TAB COMPLETO */}
{activeTab === 'dashboard' && (
  <section className="admin-section admin-dashboard">
    <div className="admin-section__heading">
      <div>
        <span className="admin-kicker">RESUMO OPERACIONAL</span>
        <h1 className="admin-page-title" style={{ color: '#343a40', marginBottom: isMobile ? '20px' : '30px', fontSize: isMobile ? '26px' : '32px' }}>O negócio, agora.</h1>
      </div>
      <p>Indicadores atualizados diretamente da operação.</p>
    </div>
    <div className="admin-metrics" style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: isMobile ? '16px' : '20px',
      marginBottom: '30px'
    }}>
      {/* Total de Pedidos Geral */}
      <div className="admin-metric" data-tone="ink" style={{
        backgroundColor: 'white',
        padding: isMobile ? '22px 18px' : '25px',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: isMobile ? '30px' : '40px', marginBottom: '8px' }}>📦</div>
        <h3 style={{ color: '#6c757d', margin: '0 0 5px 0' }}>Total de Pedidos</h3>
        <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#343a40' }}>
          {formatInt(stats.totalPedidos)}
        </div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          Todos os pedidos do site
        </div>
      </div>

      {/* ✅ NOVO: Pedidos Pendentes */}
      <div className="admin-metric" data-tone="amber" style={{
        backgroundColor: 'white',
        padding: isMobile ? '22px 18px' : '25px',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        textAlign: 'center',
        border: stats.pedidosPendentes > 0 ? '2px solid #ffc107' : 'none'
      }}>
        <div style={{ fontSize: isMobile ? '30px' : '40px', marginBottom: '8px' }}>⏳</div>
        <h3 style={{ color: '#ffc107', margin: '0 0 5px 0' }}>Pedidos Pendentes</h3>
        <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#343a40' }}>
          {stats.pedidosPendentes}
        </div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          Aguardando ação
        </div>
      </div>

      {/* Total de Vendas */}
      <div className="admin-metric admin-metric--wide" data-tone="green" style={{
        backgroundColor: 'white',
        padding: isMobile ? '22px 18px' : '25px',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: isMobile ? '30px' : '40px', marginBottom: '8px' }}>💰</div>
        <h3 style={{ color: '#007bff', margin: '0 0 5px 0' }}>Total de Vendas</h3>
        <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#343a40' }}>
          {formatBRL(stats.totalVendas)}
        </div>
      </div>

      {/* Empresas Cadastradas */}
      <div className="admin-metric" data-tone="leaf" style={{
        backgroundColor: 'white',
        padding: isMobile ? '22px 18px' : '25px',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: isMobile ? '30px' : '40px', marginBottom: '8px' }}>🏢</div>
        <h3 style={{ color: '#28a745', margin: '0 0 5px 0' }}>Empresas Cadastradas</h3>
        <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#343a40' }}>
          {formatInt(stats.empresasCadastradas)}
        </div>
      </div>

      {/* Produtos Ativos */}
      <div className="admin-metric" data-tone="tomato" style={{
        backgroundColor: 'white',
        padding: isMobile ? '22px 18px' : '25px',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: isMobile ? '30px' : '40px', marginBottom: '8px' }}>🍽️</div>
        <h3 style={{ color: '#dc3545', margin: '0 0 5px 0' }}>Produtos Ativos</h3>
        <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#343a40' }}>
          {formatInt(stats.produtosAtivos)}
        </div>
      </div>

      {/* Empresas com Email */}
      <div className="admin-metric" data-tone="blue" style={{
        backgroundColor: 'white',
        padding: isMobile ? '22px 18px' : '25px',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: isMobile ? '30px' : '40px', marginBottom: '8px' }}>📧</div>
        <h3 style={{ color: '#17a2b8', margin: '0 0 5px 0' }}>Empresas c/ Email</h3>
        <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#343a40' }}>
          {stats.empresasComEmail}
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {stats.percentualEmails.toFixed(1)}% do total
        </div>
      </div>
    </div>
  </section>
)}

        {/* Produtos Tab */}
        {activeTab === 'produtos' && (
          <section className="admin-section admin-products">
            <div className="admin-section__heading" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '30px'
            }}>
              <div><span className="admin-kicker">CATÁLOGO</span><h1 className="admin-page-title" style={{ color: '#343a40', margin: 0 }}>Produtos</h1></div>
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
                Adicionar produto
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
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
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
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
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
            <div className="admin-product-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {produtos.map(produto => (
                <article
                  className="admin-product-card"
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
                    loading="lazy"
                    decoding="async"
                    width="300"
                    height="120"
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
                        {formatBRL(produto.preco)}
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
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ✅ PEDIDOS TAB COM NOVA ORGANIZAÇÃO */}
        {activeTab === 'pedidos' && (
          <section className="admin-section admin-orders">
            <div className="admin-section__heading" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '30px'
            }}>
              <div><span className="admin-kicker">FLUXO DE PRODUÇÃO</span><h1 className="admin-page-title" style={{ color: '#343a40', margin: 0 }}>Pedidos</h1></div>
              <div style={{
                backgroundColor: '#28a745',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '15px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                Atualização em tempo real
              </div>
            </div>

            {/* ✅ ABAS DE ORGANIZAÇÃO DOS PEDIDOS */}
            <div className="admin-order-filters" style={{
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
            <div className="admin-order-list" style={{
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
                    <article
                      className="admin-order-card"
                      key={pedido.id}
                      style={{
                        backgroundColor: 'white',
                        padding: '25px',
                        borderRadius: '10px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        border: activeOrderTab === 'pendentes' && pedido.status === 'pendente'
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
                            Pedido #{obterNumeroPedido(pedido)}
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
                            {pedido.status === 'pendente' ? (
                              <>
                                <button
                                  onClick={() => alterarStatusPedido(pedido.id, 'pronto')}
                                  style={{
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 15px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    boxShadow: '0 2px 4px rgba(40,167,69,0.3)'
                                  }}
                                >
                                  ✅ Marcar como Finalizado
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Deseja realmente cancelar o pedido #${pedido.numero}?`)) {
                                      alterarStatusPedido(pedido.id, 'cancelado');
                                    }
                                  }}
                                  style={{
                                    backgroundColor: 'transparent',
                                    color: '#dc3545',
                                    border: '1px solid #dc3545',
                                    padding: '7px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    outline: 'none'
                                  }}
                                >
                                  ❌ Cancelar
                                </button>
                              </>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  backgroundColor: statusInfo.color,
                                  color: 'white',
                                  padding: '8px 15px',
                                  borderRadius: '20px',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}>
                                  {statusInfo.icon} {statusInfo.label}
                                </span>
                                <button
                                  onClick={() => alterarStatusPedido(pedido.id, 'pendente')}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#6c757d',
                                    fontSize: '11px',
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    padding: '0'
                                  }}
                                  title="Reverter para Pendente"
                                >
                                  Desfazer
                                </button>
                              </div>
                            )}
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
                            {formatBRL(pedido.total)}
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
                              {formatBRL(item.quantidade * item.preco)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
            {hasMorePedidos && (
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={loadMorePedidos}
                  disabled={loadingMorePedidos}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 0,
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontWeight: 'bold',
                    cursor: loadingMorePedidos ? 'wait' : 'pointer',
                    opacity: loadingMorePedidos ? 0.7 : 1
                  }}
                >
                  {loadingMorePedidos ? 'Carregando...' : `Carregar mais ${PEDIDOS_PAGE_SIZE} pedidos`}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Empresas Tab */}
        {activeTab === 'empresas' && (
          <section className="admin-section admin-companies">
            <div className="admin-section__heading"><div><span className="admin-kicker">CARTEIRA B2B</span><h1 className="admin-page-title" style={{ color: '#343a40', marginBottom: '30px' }}>Empresas</h1></div></div>
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
                  <article
                    className="admin-company-card"
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
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
