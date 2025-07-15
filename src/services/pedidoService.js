
import supabase from '../lib/supabase';
import { cnpjService } from './cnpjService';

// ✅ Cache para reduzir operações desnecessárias
let pedidosCache = null;
let pedidosCacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 segundos

// ✅ Função para operações localStorage assíncronas
const localStorageAsync = {
  getItem: (key) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const value = localStorage.getItem(key);
          resolve(value ? JSON.parse(value) : null);
        } catch (error) {
          console.error('Erro ao ler localStorage:', error);
          resolve(null);
        }
      }, 0);
    });
  },

  setItem: (key, value) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          resolve(true);
        } catch (error) {
          console.error('Erro ao salvar localStorage:', error);
          resolve(false);
        }
      }, 0);
    });
  }
};

// ✅ Helper para timeout em operações
const withTimeout = (promise, ms = 5000) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
};

// ✅ Helper para operações batch no localStorage (evita múltiplas gravações)
const batchLocalStorageUpdate = (() => {
  let pendingUpdates = new Map();
  let timeoutId = null;

  const executeBatch = async () => {
    const updates = Array.from(pendingUpdates.entries());
    pendingUpdates.clear();
    
    // Executa todas as atualizações em paralelo
    await Promise.allSettled(
      updates.map(([key, value]) => localStorageAsync.setItem(key, value))
    );
  };

  return (key, value) => {
    pendingUpdates.set(key, value);
    
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(executeBatch, 100); // Agrupa updates em 100ms
  };
})();

// ✅ Helper para verificar se usuário é admin
const verificarSeEAdmin = async () => {
  try {
    const { data: usuario } = await supabase.auth.getUser();
    if (!usuario?.user?.email) {
      return { isAdmin: false, error: 'Usuário não autenticado' };
    }

    // Verificar se é admin pela tabela empresas
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('tipo_usuario')
      .eq('email', usuario.user.email)
      .eq('ativo', true)
      .single();

    if (empresaError || !empresa) {
      return { isAdmin: false, error: 'Usuário não encontrado' };
    }

    return { 
      isAdmin: empresa.tipo_usuario === 'admin', 
      email: usuario.user.email 
    };

  } catch (error) {
    console.error('Erro ao verificar admin:', error);
    return { isAdmin: false, error: error.message };
  }
};

export const pedidoService = {
  
  // ✅ Banco de dados mock otimizado
  getPedidosDatabase: async () => {
    try {
      return await localStorageAsync.getItem('pedidosDatabase') || [];
    } catch (error) {
      console.error('Erro ao acessar banco de pedidos:', error);
      return [];
    }
  },

  savePedidosDatabase: async (pedidos) => {
    try {
      // ✅ Usa batch update para não bloquear UI
      batchLocalStorageUpdate('pedidosDatabase', pedidos);
      return true;
    } catch (error) {
      console.error('Erro ao salvar banco de pedidos:', error);
      return false;
    }
  },

  // ✅ Criar pedido otimizado com debug
  criarPedido: async (dadosPedido) => {
    try {
      console.log('📝 Criando novo pedido:', dadosPedido);
      
      // ✅ Validação rápida
      const empresaCnpj = cnpjService.removerMascaraCnpj(dadosPedido.cnpj);
      console.log('📝 CNPJ limpo para salvar:', empresaCnpj);
      
      const validacaoCnpj = cnpjService.validarCnpj(empresaCnpj);
      if (!validacaoCnpj.valido) {
        console.error('❌ CNPJ inválido:', validacaoCnpj.erro);
        return {
          success: false,
          error: validacaoCnpj.erro
        };
      }

      // ✅ Buscar empresa com timeout
      const empresaPromise = supabase
        .from('empresas')
        .select('id, nome_empresa')
        .eq('cnpj', empresaCnpj)
        .eq('ativo', true)
        .single();

      const { data: empresa, error: empresaError } = await withTimeout(empresaPromise, 3000);

      if (empresaError || !empresa) {
        console.error('❌ Empresa não encontrada:', empresaError?.message || 'CNPJ não cadastrado');
        return {
          success: false,
          error: 'CNPJ não cadastrado ou empresa inativa'
        };
      }

      // ✅ Preparar dados do pedido com ambos campos CNPJ
      const novoPedido = {
        numero: Math.floor(Math.random() * 10000) + 1000,
        empresa_id: empresa.id,
        empresa_cnpj: empresaCnpj, // ✅ CNPJ limpo sem formatação
        empresa_nome: dadosPedido.empresaNome || empresa.nome_empresa,
        itens: dadosPedido.itens,
        subtotal: dadosPedido.subtotal,
        taxa_entrega: dadosPedido.taxaEntrega,
        total: dadosPedido.total,
        endereco_entrega: dadosPedido.enderecoEntrega,
        observacoes: dadosPedido.observacoes || '',
        status: 'enviado',
        data_pedido: new Date().toISOString(),
        data_atualizacao: new Date().toISOString(),
        metodo_pagamento: dadosPedido.metodoPagamento || 'pix',
        origem: 'supabase',
        previsao_entrega: dadosPedido.previsaoEntrega || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      console.log('📝 Dados do pedido que será salvo:', {
        numero: novoPedido.numero,
        empresa_cnpj: novoPedido.empresa_cnpj,
        cnpj: novoPedido.cnpj,
        empresa_nome: novoPedido.empresa_nome,
        total: novoPedido.total
      });

      // ✅ Salvar no Supabase com timeout
      const insertPromise = supabase
        .from('pedidos')
        .insert(novoPedido)
        .select()
        .single();

      const { data, error } = await withTimeout(insertPromise, 8000);

      if (error) {
        console.error('❌ Erro ao criar pedido no Supabase:', error.message);
        return {
          success: false,
          error: 'Erro ao criar pedido. Tente novamente.'
        };
      }

      console.log('✅ Pedido salvo no Supabase com ID:', data.id);

      // ✅ Atualizar storages em background (não bloqueia retorno)
      this.updateLocalStoragesBackground(data, novoPedido);

      // ✅ Limpa cache
      pedidosCache = null;
      pedidosCacheTimestamp = 0;

      console.log('✅ Pedido criado com sucesso:', novoPedido.numero);

      return {
        success: true,
        pedido: data,
        message: 'Pedido criado com sucesso!'
      };
    } catch (error) {
      console.error('❌ Erro ao criar pedido:', error);
      return {
        success: false,
        error: error.message === 'Timeout' ? 'Tempo esgotado. Tente novamente.' : 'Erro ao criar pedido. Tente novamente.'
      };
    }
  },

  // ✅ Helper para atualizar localStorage em background
  updateLocalStoragesBackground: async (data, novoPedido) => {
    try {
      // ✅ Executa em background para não bloquear UI
      setTimeout(async () => {
        try {
          // Atualiza pedidos database
          const pedidos = await this.getPedidosDatabase();
          pedidos.push({ id: data.id, ...novoPedido });
          await this.savePedidosDatabase(pedidos);

          // Atualiza pedidos admin
          const pedidosAdmin = await localStorageAsync.getItem('pedidosAdmin') || [];
          pedidosAdmin.push({
            id: data.id,
            numero: novoPedido.numero,
            cliente: novoPedido.empresa_nome,
            empresa_cnpj: novoPedido.empresa_cnpj,
            total: novoPedido.total,
            status: novoPedido.status,
            data: novoPedido.data_pedido,
            itens: novoPedido.itens,
            enderecoEntrega: novoPedido.endereco_entrega,
            observacoes: novoPedido.observacoes
          });
          batchLocalStorageUpdate('pedidosAdmin', pedidosAdmin);
          
        } catch (error) {
          console.error('Erro ao atualizar localStorage em background:', error);
        }
      }, 0);
    } catch (error) {
      console.error('Erro no updateLocalStoragesBackground:', error);
    }
  },

  // ✅ Buscar pedidos com cache inteligente e debug completo
  buscarPedidosPorEmpresa: async (cnpj) => {
    try {
      console.log('🔍 pedidoService.buscarPedidosPorEmpresa - CNPJ recebido:', cnpj);
      
      const empresaCnpj = cnpjService.removerMascaraCnpj(cnpj);
      console.log('🔍 CNPJ limpo para busca:', empresaCnpj);
      
      // ✅ Verificar cache
      const cacheKey = `pedidos_${empresaCnpj}`;
      const now = Date.now();
      
      if (pedidosCache && pedidosCache[cacheKey] && (now - pedidosCacheTimestamp) < CACHE_DURATION) {
        console.log('✅ Usando pedidos do cache:', pedidosCache[cacheKey].length);
        return pedidosCache[cacheKey];
      }

      console.log('🔍 Buscando no Supabase...');

      // ✅ PRIMEIRA TENTATIVA: Buscar por empresa_cnpj
      let pedidosPromise = supabase
        .from('pedidos')
        .select('*')
        .eq('empresa_cnpj', empresaCnpj)
        .order('data_pedido', { ascending: false });

      let { data: pedidos, error } = await withTimeout(pedidosPromise, 5000);

      // ✅ SEGUNDA TENTATIVA: Se não encontrou, buscar por cnpj
      if (!error && (!pedidos || pedidos.length === 0)) {
        console.log('🔍 Nenhum pedido encontrado com empresa_cnpj, tentando campo cnpj...');
        
        pedidosPromise = supabase
          .from('pedidos')
          .select('*')
          .eq('cnpj', empresaCnpj)
          .order('data_pedido', { ascending: false });

        const resultado = await withTimeout(pedidosPromise, 5000);
        pedidos = resultado.data;
        error = resultado.error;
      }

      if (error) {
        console.error('❌ Erro na query Supabase:', error);
        console.error('❌ Detalhes do erro:', error.message);
        return [];
      }

      console.log('📦 Dados retornados do Supabase:', pedidos);
      console.log('📦 Quantidade de pedidos encontrados:', pedidos?.length || 0);

      if (!pedidos || pedidos.length === 0) {
        console.log('⚠️ NENHUM PEDIDO ENCONTRADO NO SUPABASE!');
        console.log('🔍 Verificações:');
        console.log('   - CNPJ usado na busca:', empresaCnpj);
        console.log('   - Campos testados: empresa_cnpj e cnpj');
        console.log('   - Tabela: pedidos');
        
        // ✅ TESTE: Buscar TODOS os pedidos para debug
        const { data: todosPedidos, error: errorTodos } = await supabase
          .from('pedidos')
          .select('empresa_cnpj, cnpj, numero, empresa_nome')
          .limit(5);
        
        if (!errorTodos && todosPedidos) {
          console.log('🔍 Primeiros 5 pedidos na tabela (para debug):', todosPedidos);
        } else {
          console.log('❌ Erro ao buscar pedidos para debug:', errorTodos);
        }
        
        return [];
      }

      const pedidosFormatados = pedidos.map(pedido => ({
        id: pedido.id,
        numero: pedido.numero,
        total: pedido.total,
        status: pedido.status,
        data: pedido.data_pedido,
        itens: pedido.itens,
        enderecoEntrega: pedido.endereco_entrega,
        observacoes: pedido.observacoes,
        metodoPagamento: pedido.metodo_pagamento,
        previsaoEntrega: pedido.previsao_entrega,
        origem: 'supabase'
      }));

      // ✅ Atualizar cache
      if (!pedidosCache) pedidosCache = {};
      pedidosCache[cacheKey] = pedidosFormatados;
      pedidosCacheTimestamp = now;

      console.log(`✅ Encontrados ${pedidos.length} pedidos formatados`);
      return pedidosFormatados;

    } catch (error) {
      console.error('❌ Erro geral ao buscar pedidos:', error);
      console.error('❌ Stack trace:', error.stack);
      return [];
    }
  },

  // ✅ NOVO: Listar todos os pedidos para AdminPage
  listarTodosPedidos: async () => {
    try {
      console.log('🔍 Carregando todos os pedidos para AdminPage...');
      
      // ✅ Verificar se usuário é admin
      const adminCheck = await verificarSeEAdmin();
      if (!adminCheck.isAdmin) {
        return { success: false, error: adminCheck.error || 'Acesso negado: apenas administradores podem listar todos os pedidos' };
      }

      console.log('✅ Usuário confirmado como admin:', adminCheck.email);
      
      const pedidosPromise = supabase
        .from('pedidos')
        .select('*')
        .order('data_pedido', { ascending: false });

      const { data: pedidos, error } = await withTimeout(pedidosPromise, 8000);

      if (error) {
        console.error('❌ Erro ao listar pedidos:', error);
        return { success: false, error: error.message };
      }

      // ✅ Formatar dados para AdminPage
      const pedidosFormatados = pedidos.map(pedido => ({
        id: pedido.id,
        numero: pedido.numero,
        cliente: pedido.empresa_nome || 'Cliente não informado',
        cnpj: pedido.empresa_cnpj || pedido.cnpj || 'CNPJ não informado',
        total: parseFloat(pedido.total || 0),
        status: pedido.status || 'a_preparar',
        data: pedido.data_pedido || pedido.created_at,
        enderecoEntrega: pedido.endereco_entrega,
        observacoes: pedido.observacoes,
        empresa_id: pedido.empresa_id,
        // Converte itens JSONB para array esperado pelo AdminPage
        itens: Array.isArray(pedido.itens) ? pedido.itens.map(item => ({
          nome: item.nome || item.produto?.nome || 'Produto não encontrado',
          quantidade: item.quantidade || 1,
          preco: parseFloat(item.preco || item.preco_unitario || 0)
        })) : []
      }));

      console.log(`✅ ${pedidosFormatados.length} pedidos formatados para AdminPage`);
      return { success: true, data: pedidosFormatados };

    } catch (error) {
      console.error('❌ Erro ao listar pedidos:', error);
      return { success: false, error: error.message };
    }
  },

  // ✅ Atualizar status otimizado
  atualizarStatusPedido: async (pedidoId, novoStatus) => {
    try {
      console.log('🔄 Atualizando status do pedido:', pedidoId, 'para:', novoStatus);

      // ✅ Verificar se usuário é admin
      const adminCheck = await verificarSeEAdmin();
      if (!adminCheck.isAdmin) {
        return { success: false, error: adminCheck.error || 'Acesso negado: apenas administradores podem alterar status de pedidos' };
      }

      // ✅ Atualizar no Supabase com timeout
      const updatePromise = supabase
        .from('pedidos')
        .update({ 
          status: novoStatus, 
          data_atualizacao: new Date().toISOString() 
        })
        .eq('id', pedidoId)
        .select()
        .single();

      const { data, error } = await withTimeout(updatePromise, 3000);

      if (error) {
        console.error('❌ Erro ao atualizar status no Supabase:', error.message);
        return {
          success: false,
          error: 'Pedido não encontrado'
        };
      }

      // ✅ Atualizar localStorage em background
      this.updateStatusLocalStorageBackground(pedidoId, novoStatus);

      // ✅ Limpar cache para forçar refresh
      pedidosCache = null;
      pedidosCacheTimestamp = 0;

      console.log('✅ Status atualizado com sucesso');

      return {
        success: true,
        pedido: data,
        message: 'Status atualizado com sucesso!'
      };
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      return {
        success: false,
        error: error.message === 'Timeout' ? 'Tempo esgotado. Tente novamente.' : 'Erro ao atualizar status do pedido'
      };
    }
  },

  // ✅ Helper para atualizar status no localStorage em background
  updateStatusLocalStorageBackground: (pedidoId, novoStatus) => {
    setTimeout(async () => {
      try {
        // Atualizar pedidos database
        const pedidos = await this.getPedidosDatabase();
        const pedidoIndex = pedidos.findIndex(p => p.id === pedidoId);
        if (pedidoIndex >= 0) {
          pedidos[pedidoIndex].status = novoStatus;
          pedidos[pedidoIndex].data_atualizacao = new Date().toISOString();
          await this.savePedidosDatabase(pedidos);
        }

        // Atualizar pedidos admin
        const pedidosAdmin = await localStorageAsync.getItem('pedidosAdmin') || [];
        const adminIndex = pedidosAdmin.findIndex(p => p.id === pedidoId);
        if (adminIndex >= 0) {
          pedidosAdmin[adminIndex].status = novoStatus;
          batchLocalStorageUpdate('pedidosAdmin', pedidosAdmin);
        }
      } catch (error) {
        console.error('Erro ao atualizar status no localStorage:', error);
      }
    }, 0);
  },

  // ✅ NOVO: Excluir pedido (para AdminPage)
  excluirPedido: async (pedidoId) => {
    try {
      console.log('🗑️ Excluindo pedido:', pedidoId);

      // ✅ Verificar se usuário é admin
      const adminCheck = await verificarSeEAdmin();
      if (!adminCheck.isAdmin) {
        return { success: false, error: adminCheck.error || 'Acesso negado: apenas administradores podem excluir pedidos' };
      }

      const deletePromise = supabase
        .from('pedidos')
        .delete()
        .eq('id', pedidoId)
        .select()
        .single();

      const { data, error } = await withTimeout(deletePromise, 3000);

      if (error) {
        console.error('❌ Erro ao excluir pedido no Supabase:', error);
        return {
          success: false,
          error: 'Erro ao excluir pedido'
        };
      }

      // ✅ Remover do localStorage em background
      this.updateDeleteLocalStorageBackground(pedidoId);

      // ✅ Limpar cache
      pedidosCache = null;
      pedidosCacheTimestamp = 0;

      console.log('✅ Pedido excluído com sucesso');
      return {
        success: true,
        data,
        message: 'Pedido excluído com sucesso!'
      };

    } catch (error) {
      console.error('❌ Erro ao excluir pedido:', error);
      return {
        success: false,
        error: error.message === 'Timeout' ? 'Tempo esgotado. Tente novamente.' : 'Erro ao excluir pedido'
      };
    }
  },

  // ✅ Helper para excluir do localStorage em background
  updateDeleteLocalStorageBackground: (pedidoId) => {
    setTimeout(async () => {
      try {
        // Remover do pedidos database
        const pedidos = await this.getPedidosDatabase();
        const pedidosFiltrados = pedidos.filter(p => p.id !== pedidoId);
        await this.savePedidosDatabase(pedidosFiltrados);

        // Remover do pedidos admin
        const pedidosAdmin = await localStorageAsync.getItem('pedidosAdmin') || [];
        const adminFiltrados = pedidosAdmin.filter(p => p.id !== pedidoId);
        batchLocalStorageUpdate('pedidosAdmin', adminFiltrados);
        
      } catch (error) {
        console.error('Erro ao excluir do localStorage:', error);
      }
    }, 0);
  },

  // ✅ Buscar pedido por número otimizado
  buscarPedidoPorNumero: async (numero) => {
    try {
      const pedidoPromise = supabase
        .from('pedidos')
        .select('*')
        .eq('numero', numero)
        .single();

      const { data: pedido, error } = await withTimeout(pedidoPromise, 3000);

      if (error || !pedido) {
        return {
          success: false,
          error: 'Pedido não encontrado'
        };
      }

      return {
        success: true,
        pedido: {
          id: pedido.id,
          numero: pedido.numero,
          empresa_cnpj: pedido.empresa_cnpj,
          empresa_nome: pedido.empresa_nome,
          total: pedido.total,
          status: pedido.status,
          data: pedido.data_pedido,
          itens: pedido.itens,
          enderecoEntrega: pedido.endereco_entrega,
          observacoes: pedido.observacoes,
          metodoPagamento: pedido.metodo_pagamento,
          previsaoEntrega: pedido.previsao_entrega,
          origem: pedido.origem
        }
      };
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      return {
        success: false,
        error: error.message === 'Timeout' ? 'Tempo esgotado. Tente novamente.' : 'Erro ao buscar pedido'
      };
    }
  },

  // ✅ NOVO: Obter estatísticas para AdminPage
  obterEstatisticas: async () => {
    try {
      console.log('📊 Calculando estatísticas para AdminPage...');
      
      // ✅ Verificar se usuário é admin
      const adminCheck = await verificarSeEAdmin();
      if (!adminCheck.isAdmin) {
        return { 
          success: false, 
          error: adminCheck.error || 'Acesso negado: apenas administradores podem acessar estatísticas globais',
          data: {
            totalPedidos: 0,
            pedidosHoje: 0,
            totalVendas: 0,
            produtosMaisVendidos: []
          }
        };
      }
      
      const estatisticasPromise = supabase
        .from('pedidos')
        .select('status, total, data_pedido');

      const { data: pedidos, error } = await withTimeout(estatisticasPromise, 5000);

      if (error) {
        console.error('❌ Erro ao obter estatísticas:', error);
        return { 
          success: false, 
          error: error.message,
          data: {
            totalPedidos: 0,
            pedidosHoje: 0,
            totalVendas: 0,
            produtosMaisVendidos: []
          }
        };
      }

      // ✅ Cálculos otimizados para AdminPage
      const hoje = new Date().toDateString();
      let pedidosHojeCount = 0;
      let totalVendas = 0;

      for (const pedido of pedidos) {
        // Contar pedidos de hoje
        if (new Date(pedido.data_pedido).toDateString() === hoje) {
          pedidosHojeCount++;
        }
        
        // Somar vendas
        totalVendas += parseFloat(pedido.total || 0);
      }

      const estatisticas = {
        totalPedidos: pedidos.length,
        pedidosHoje: pedidosHojeCount,
        totalVendas: totalVendas,
        produtosMaisVendidos: ['Marmita Fitness Frango', 'Marmita Tradicional'] // TODO: Calcular dos items JSONB
      };

      console.log('✅ Estatísticas calculadas para AdminPage:', estatisticas);
      return { success: true, data: estatisticas };

    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return { 
        success: false, 
        error: error.message,
        data: {
          totalPedidos: 0,
          pedidosHoje: 0,
          totalVendas: 0,
          produtosMaisVendidos: []
        }
      };
    }
  },

  // ✅ Cancelar pedido otimizado
  cancelarPedido: async (pedidoId, motivo = '') => {
    try {
      console.log('❌ Cancelando pedido:', pedidoId);

      const cancelPromise = supabase
        .from('pedidos')
        .update({
          status: 'cancelado',
          motivo_cancelamento: motivo,
          data_atualizacao: new Date().toISOString()
        })
        .eq('id', pedidoId)
        .select()
        .single();

      const { data, error } = await withTimeout(cancelPromise, 3000);

      if (error) {
        console.error('❌ Erro ao cancelar pedido:', error);
        return {
          success: false,
          error: 'Erro ao cancelar pedido'
        };
      }

      // ✅ Atualizar localStorage em background
      this.updateCancelLocalStorageBackground(pedidoId, motivo);

      // ✅ Limpar cache
      pedidosCache = null;
      pedidosCacheTimestamp = 0;

      return {
        success: true,
        message: 'Pedido cancelado com sucesso!'
      };
    } catch (error) {
      console.error('❌ Erro ao cancelar pedido:', error);
      return {
        success: false,
        error: error.message === 'Timeout' ? 'Tempo esgotado. Tente novamente.' : 'Erro ao cancelar pedido'
      };
    }
  },

  // ✅ Helper para cancelar no localStorage em background
  updateCancelLocalStorageBackground: (pedidoId, motivo) => {
    setTimeout(async () => {
      try {
        // Atualizar pedidos database
        const pedidos = await this.getPedidosDatabase();
        const pedidoIndex = pedidos.findIndex(p => p.id === pedidoId);
        if (pedidoIndex >= 0) {
          pedidos[pedidoIndex].status = 'cancelado';
          pedidos[pedidoIndex].motivo_cancelamento = motivo;
          pedidos[pedidoIndex].data_atualizacao = new Date().toISOString();
          await this.savePedidosDatabase(pedidos);
        }

        // Atualizar pedidos admin
        const pedidosAdmin = await localStorageAsync.getItem('pedidosAdmin') || [];
        const adminIndex = pedidosAdmin.findIndex(p => p.id === pedidoId);
        if (adminIndex >= 0) {
          pedidosAdmin[adminIndex].status = 'cancelado';
          batchLocalStorageUpdate('pedidosAdmin', pedidosAdmin);
        }
      } catch (error) {
        console.error('Erro ao cancelar no localStorage:', error);
      }
    }, 0);
  },

  // ✅ Função para limpar cache
  clearCache: () => {
    pedidosCache = null;
    pedidosCacheTimestamp = 0;
    console.log('🗑️ Cache de pedidos limpo');
  },

  // ✅ NOVO: Helper público para verificar se usuário é admin
  verificarSeEAdmin: verificarSeEAdmin
};
