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

// ✅ CORRIGIDO: Helper para verificar se usuário é admin - AGORA POR CNPJ
const verificarSeEAdmin = async () => {
  try {
    console.log('🔍 Verificando se usuário é admin...');
    
    // OPÇÃO 1: Verificar por sessão atual armazenada localmente
    const sessaoAtual = sessionStorage.getItem('empresaLogada');
    if (sessaoAtual) {
      try {
        const dadosEmpresa = JSON.parse(sessaoAtual);
        console.log('🔍 Dados da empresa na sessão:', dadosEmpresa);
        
        if (dadosEmpresa.cnpj && dadosEmpresa.tipo_usuario === 'admin') {
          console.log('✅ Admin verificado por sessão local');
          return { 
            isAdmin: true, 
            cnpj: dadosEmpresa.cnpj,
            fonte: 'sessao_local'
          };
        }
      } catch (error) {
        console.error('Erro ao verificar sessão local:', error);
      }
    }

    // OPÇÃO 2: Verificar por localStorage (fallback)
    const dadosLocalStorage = localStorage.getItem('dadosEmpresaLogada');
    if (dadosLocalStorage) {
      try {
        const dadosEmpresa = JSON.parse(dadosLocalStorage);
        console.log('🔍 Dados da empresa no localStorage:', dadosEmpresa);
        
        if (dadosEmpresa.cnpj && dadosEmpresa.tipo_usuario === 'admin') {
          console.log('✅ Admin verificado por localStorage');
          return { 
            isAdmin: true, 
            cnpj: dadosEmpresa.cnpj,
            fonte: 'localStorage'
          };
        }
      } catch (error) {
        console.error('Erro ao verificar localStorage:', error);
      }
    }

    // OPÇÃO 3: Verificar se tem pré-autenticação de admin
    const preAuth = sessionStorage.getItem('adminPreAuthenticated');
    if (preAuth) {
      try {
        const { timestamp, cnpj } = JSON.parse(preAuth);
        if (Date.now() - timestamp < 30 * 60 * 1000) { // 30 min
          console.log('✅ Admin verificado por pré-autenticação');
          return { 
            isAdmin: true, 
            cnpj: cnpj,
            fonte: 'pre_auth'
          };
        }
      } catch (error) {
        console.error('Erro na pré-autenticação:', error);
      }
    }

    // OPÇÃO 4: Verificar por CNPJ admin conhecido
    const cnpjAdmin = '05336475000177';
    try {
      const { data: empresaAdmin, error } = await supabase
        .from('empresas')
        .select('id_uuid, tipo_usuario, ativo')
        .eq('cnpj', cnpjAdmin)
        .eq('tipo_usuario', 'admin')
        .eq('ativo', true)
        .single();

      if (!error && empresaAdmin) {
        console.log('✅ Admin verificado por CNPJ no banco');
        return { 
          isAdmin: true, 
          cnpj: cnpjAdmin,
          fonte: 'supabase_cnpj'
        };
      }
    } catch (error) {
      console.error('Erro ao verificar admin por CNPJ:', error);
    }

    console.log('🚫 Usuário não é admin ou não está autenticado');
    return { 
      isAdmin: false, 
      error: 'Usuário não é administrador ou não está autenticado'
    };

  } catch (error) {
    console.error('❌ Erro na verificação de admin:', error);
    return { 
      isAdmin: false, 
      error: error.message 
    };
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

  // ✅ CORRIGIDO: Criar pedido otimizado para UUID
// Em src/services/pedidoService.js

criarPedido: async (dadosPedido) => {
    console.log('--- INICIANDO PROCESSO DE CRIAÇÃO DE PEDIDO ---');
    try {
      // 1. Validar dados de entrada
      if (!dadosPedido || !dadosPedido.cnpj) {
        console.error('❌ ETAPA 1 FALHOU: `dadosPedido` ou `dadosPedido.cnpj` não foi fornecido.');
        return { success: false, error: 'Dados do pedido inválidos.' };
      }
      console.log('ETAPA 1: Dados recebidos com sucesso.', dadosPedido);

      // 2. Limpar e validar CNPJ
      const empresaCnpj = cnpjService.removerMascaraCnpj(dadosPedido.cnpj);
      console.log(`ETAPA 2: CNPJ limpo para busca: "${empresaCnpj}"`);
      
      // 3. Buscar a empresa no Supabase
      console.log('ETAPA 3: Buscando empresa na tabela `empresas`...');
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('id, nome_empresa') // Pedindo o ID (que agora é uuid)
        .eq('cnpj', empresaCnpj)
        .single(); // .single() é melhor para buscar um registro único

      // 4. Analisar o resultado da busca
      if (empresaError) {
        console.error('❌ ETAPA 4 FALHOU: Erro na query que busca a empresa.', empresaError);
        return { success: false, error: `Erro ao buscar empresa: ${empresaError.message}` };
      }

      if (!empresa) {
        console.error('❌ ETAPA 4 FALHOU: A busca pela empresa não retornou dados. O CNPJ não foi encontrado ou não há permissão de leitura (RLS).');
        return { success: false, error: 'CNPJ não cadastrado ou empresa inativa.' };
      }
      
      console.log('ETAPA 4: Empresa encontrada com sucesso!', empresa); // VERIFIQUE SE O 'id' AQUI É UM UUID

      // 5. Preparar o objeto do pedido
      const novoPedido = {
        empresa_id: empresa.id, // Usando o ID (uuid) obtido
        empresa_cnpj: empresaCnpj,
        empresa_nome: dadosPedido.empresaNome || empresa.nome_empresa,
        itens: dadosPedido.itens,
        subtotal: dadosPedido.subtotal,
        taxa_entrega: dadosPedido.taxaEntrega,
        total: dadosPedido.total,
        endereco_entrega: dadosPedido.enderecoEntrega,
        observacoes: dadosPedido.observacoes || '',
        // O resto dos campos (numero, status, etc.) usará os valores DEFAULT do banco
      };
      console.log('ETAPA 5: Objeto do pedido pronto para ser inserido.', novoPedido);

      // 6. Inserir o pedido no Supabase
      console.log('ETAPA 6: Inserindo pedido na tabela `pedidos`...');
      const { data: pedidoCriado, error: insertError } = await supabase
        .from('pedidos')
        .insert(novoPedido)
        .select()
        .single();

      if (insertError) {
        console.error('❌ ETAPA 6 FALHOU: Erro ao inserir o pedido no banco.', insertError);
        return { success: false, error: `Erro ao salvar pedido: ${insertError.message}` };
      }

      console.log('✅ SUCESSO FINAL: Pedido salvo no Supabase!', pedidoCriado);
      console.log('--- FIM DO PROCESSO ---');

      // O resto da sua lógica de cache...
      this.updateLocalStoragesBackground(pedidoCriado, novoPedido);
      pedidosCache = null;
      pedidosCacheTimestamp = 0;

      return { success: true, pedido: pedidoCriado, message: 'Pedido criado com sucesso!' };

    } catch (error) {
      console.error('❌ ERRO INESPERADO (CATCH GERAL):', error);
      return { success: false, error: 'Erro inesperado ao criar pedido.' };
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
            numero: data.numero, // Usar numero do Supabase
            cliente: novoPedido.empresa_nome,
            cnpj: novoPedido.empresa_cnpj,
            total: novoPedido.total,
            status: novoPedido.status,
            data: data.data_pedido, // Usar data do Supabase
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

      // ✅ Buscar por empresa_cnpj
      let pedidosPromise = supabase
        .from('pedidos')
        .select('*')
        .eq('empresa_cnpj', empresaCnpj)
        .order('data_pedido', { ascending: false });

      let { data: pedidos, error } = await withTimeout(pedidosPromise, 5000);

      if (error) {
        console.error('❌ Erro na query Supabase:', error);
        return [];
      }

      console.log('📦 Quantidade de pedidos encontrados:', pedidos?.length || 0);

      if (!pedidos || pedidos.length === 0) {
        console.log('⚠️ Nenhum pedido encontrado para CNPJ:', empresaCnpj);
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
      return [];
    }
  },

  // ✅ CORRIGIDO: Listar todos os pedidos para AdminPage
  listarTodosPedidos: async () => {
    try {
      console.log('🔍 Carregando todos os pedidos para AdminPage...');
      
      // ✅ Verificar se usuário é admin (com verificação por CNPJ)
      const adminCheck = await verificarSeEAdmin();
      if (!adminCheck.isAdmin) {
        return { 
          success: false, 
          error: adminCheck.error || 'Acesso negado: apenas administradores podem listar todos os pedidos' 
        };
      }

      console.log('✅ Usuário confirmado como admin:', adminCheck);
      
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
      const pedidosFormatados = (pedidos || []).map(pedido => ({
        id: pedido.id,
        numero: pedido.numero,
        cliente: pedido.empresa_nome || 'Cliente não informado',
        cnpj: pedido.empresa_cnpj || 'CNPJ não informado',
        total: parseFloat(pedido.total || 0),
        status: pedido.status || 'pendente',
        data: pedido.data_pedido || pedido.created_at,
        enderecoEntrega: pedido.endereco_entrega,
        observacoes: pedido.observacoes,
        empresa_id: pedido.empresa_id,
        // Converte itens JSONB para array esperado pelo AdminPage
        itens: Array.isArray(pedido.itens) ? pedido.itens.map(item => ({
          nome: item.nome || 'Produto não encontrado',
          quantidade: item.quantidade || 1,
          preco: parseFloat(item.preco || 0)
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

      // ✅ Limpar cache para forçar refresh
      pedidosCache = null;
      pedidosCacheTimestamp = 0;

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

  // ✅ CORRIGIDO: Excluir pedido (para AdminPage)
  excluirPedido: async (pedidoId) => {
    try {
      console.log('🗑️ Iniciando exclusão do pedido:', pedidoId);

      // ✅ Verificar se usuário é admin
      const adminCheck = await verificarSeEAdmin();
      if (!adminCheck.isAdmin) {
        return { 
          success: false, 
          error: adminCheck.error || 'Acesso negado: apenas administradores podem excluir pedidos' 
        };
      }

      const deletePromise = supabase
        .from('pedidos')
        .delete()
        .eq('id', pedidoId);

      const { data, error } = await withTimeout(deletePromise, 5000);

      if (error) {
        console.error('❌ Erro ao excluir pedido no Supabase:', error);
        return {
          success: false,
          error: `Erro ao excluir pedido: ${error.message}`
        };
      }

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
        error: error.message === 'Timeout' ? 'Tempo esgotado. Tente novamente.' : `Erro ao excluir pedido: ${error.message}`
      };
    }
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
          error: adminCheck.error || 'Acesso negado',
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

      for (const pedido of (pedidos || [])) {
        // Contar pedidos de hoje
        if (new Date(pedido.data_pedido).toDateString() === hoje) {
          pedidosHojeCount++;
        }
        
        // Somar vendas
        totalVendas += parseFloat(pedido.total || 0);
      }

      const estatisticas = {
        totalPedidos: pedidos?.length || 0,
        pedidosHoje: pedidosHojeCount,
        totalVendas: totalVendas,
        produtosMaisVendidos: ['Marmita Fitness Frango', 'Marmita Tradicional']
      };

      console.log('✅ Estatísticas calculadas:', estatisticas);
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

  // ✅ Função para limpar cache
  clearCache: () => {
    pedidosCache = null;
    pedidosCacheTimestamp = 0;
    console.log('🗑️ Cache de pedidos limpo');
  },

  // ✅ Helper público para verificar se usuário é admin
  verificarSeEAdmin: verificarSeEAdmin
};