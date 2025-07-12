// ✅ CORRIGIDO: Usar cliente singleton
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

  // ✅ Criar pedido otimizado
  criarPedido: async (dadosPedido) => {
    try {
      console.log('📝 Criando novo pedido:', dadosPedido);
      
      // ✅ Validação rápida
      const empresaCnpj = cnpjService.removerMascaraCnpj(dadosPedido.cnpj);
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

      // ✅ Preparar dados do pedido
      const novoPedido = {
        numero: Math.floor(Math.random() * 10000) + 1000,
        empresa_id: empresa.id,
        empresa_cnpj: empresaCnpj,
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

  // ✅ Buscar pedidos com cache inteligente
  buscarPedidosPorEmpresa: async (cnpj) => {
    try {
      console.log('🔍 Buscando pedidos para CNPJ:', cnpj);
      
      const empresaCnpj = cnpjService.removerMascaraCnpj(cnpj);
      
      // ✅ Verificar cache
      const cacheKey = `pedidos_${empresaCnpj}`;
      const now = Date.now();
      
      if (pedidosCache && pedidosCache[cacheKey] && (now - pedidosCacheTimestamp) < CACHE_DURATION) {
        console.log('✅ Usando pedidos do cache');
        return pedidosCache[cacheKey];
      }

      // ✅ Buscar no Supabase com timeout
      const pedidosPromise = supabase
        .from('pedidos')
        .select('*')
        .eq('empresa_cnpj', empresaCnpj)
        .order('data_pedido', { ascending: false });

      const { data: pedidos, error } = await withTimeout(pedidosPromise, 5000);

      if (error) {
        console.error('❌ Erro ao buscar pedidos no Supabase:', error.message);
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
        origem: pedido.origem
      }));

      // ✅ Atualizar cache
      if (!pedidosCache) pedidosCache = {};
      pedidosCache[cacheKey] = pedidosFormatados;
      pedidosCacheTimestamp = now;

      console.log(`✅ Encontrados ${pedidos.length} pedidos`);
      return pedidosFormatados;

    } catch (error) {
      console.error('❌ Erro ao buscar pedidos:', error);
      return [];
    }
  },

  // ✅ Atualizar status otimizado
  atualizarStatusPedido: async (pedidoId, novoStatus) => {
    try {
      console.log('🔄 Atualizando status do pedido:', pedidoId, 'para:', novoStatus);

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

  // ✅ Listar todos os pedidos otimizado
  listarTodosPedidos: async () => {
    try {
      const pedidosPromise = supabase
        .from('pedidos')
        .select('*')
        .order('data_pedido', { ascending: false });

      const { data: pedidos, error } = await withTimeout(pedidosPromise, 8000);

      if (error) {
        console.error('Erro ao listar pedidos:', error);
        return [];
      }

      return pedidos.map(pedido => ({
        id: pedido.id,
        numero: pedido.numero,
        empresa_cnpj: pedido.empresa_cnpj,
        empresa_nome: pedido.empresa_nome,
        total: pedido.total,
        status: pedido.status,
        data: pedido.data_pedido,
        itens_count: pedido.itens ? pedido.itens.length : 0,
        origem: pedido.origem
      }));
    } catch (error) {
      console.error('Erro ao listar pedidos:', error);
      return [];
    }
  },

  // ✅ Estatísticas otimizadas
  obterEstatisticas: async () => {
    try {
      const estatisticasPromise = supabase
        .from('pedidos')
        .select('status, total, data_pedido');

      const { data: pedidos, error } = await withTimeout(estatisticasPromise, 5000);

      if (error) {
        console.error('Erro ao obter estatísticas:', error);
        return {
          totalPedidos: 0,
          pedidosHoje: 0,
          totalVendas: 0,
          statusCount: {},
          ticketMedio: 0
        };
      }

      // ✅ Cálculos otimizados
      const hoje = new Date().toDateString();
      let pedidosHojeCount = 0;
      let totalVendas = 0;
      const statusCount = {};

      for (const pedido of pedidos) {
        // Contar pedidos de hoje
        if (new Date(pedido.data_pedido).toDateString() === hoje) {
          pedidosHojeCount++;
        }
        
        // Somar vendas
        totalVendas += pedido.total || 0;
        
        // Contar status
        statusCount[pedido.status] = (statusCount[pedido.status] || 0) + 1;
      }

      return {
        totalPedidos: pedidos.length,
        pedidosHoje: pedidosHojeCount,
        totalVendas: totalVendas,
        statusCount: statusCount,
        ticketMedio: pedidos.length > 0 ? totalVendas / pedidos.length : 0
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return {
        totalPedidos: 0,
        pedidosHoje: 0,
        totalVendas: 0,
        statusCount: {},
        ticketMedio: 0
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
  }
};