import createSupabaseClient from '../lib/supabase';
import { cnpjService } from './cnpjService';
const supabase = createSupabaseClient();

export const pedidoService = {
  
  // Banco de dados mock para pedidos (mantido para compatibilidade)
  getPedidosDatabase: () => {
    try {
      const pedidos = localStorage.getItem('pedidosDatabase');
      return pedidos ? JSON.parse(pedidos) : [];
    } catch (error) {
      console.error('Erro ao acessar banco de pedidos:', error);
      return [];
    }
  },

  savePedidosDatabase: (pedidos) => {
    try {
      localStorage.setItem('pedidosDatabase', JSON.stringify(pedidos));
      return true;
    } catch (error) {
      console.error('Erro ao salvar banco de pedidos:', error);
      return false;
    }
  },

  // Criar um novo pedido
  criarPedido: async (dadosPedido) => {
    try {
      console.log('📝 Criando novo pedido:', dadosPedido);
      
      // Garante CNPJ limpo e valida
      const empresaCnpj = cnpjService.removerMascaraCnpj(dadosPedido.cnpj);
      const validacaoCnpj = cnpjService.validarCnpj(empresaCnpj);
      if (!validacaoCnpj.valido) {
        console.error('❌ CNPJ inválido:', validacaoCnpj.erro);
        return {
          success: false,
          error: validacaoCnpj.erro
        };
      }

      // Buscar empresa pelo CNPJ para obter empresa_id
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('id, nome_empresa')
        .eq('cnpj', empresaCnpj)
        .eq('ativo', true)
        .single();

      if (empresaError || !empresa) {
        console.error('❌ Empresa não encontrada:', empresaError?.message || 'CNPJ não cadastrado');
        return {
          success: false,
          error: 'CNPJ não cadastrado ou empresa inativa'
        };
      }

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
        previsao_entrega: dadosPedido.previsaoEntrega || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // +1 dia
      };

      // Salva no Supabase
      const { data, error } = await supabase
        .from('pedidos')
        .insert(novoPedido)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar pedido no Supabase:', error.message);
        return {
          success: false,
          error: 'Erro ao criar pedido. Tente novamente.'
        };
      }

      // Salva no localStorage para compatibilidade
      const pedidos = this.getPedidosDatabase();
      pedidos.push({ id: data.id, ...novoPedido });
      this.savePedidosDatabase(pedidos);

      // Atualiza pedidosAdmin para compatibilidade
      const pedidosAdmin = JSON.parse(localStorage.getItem('pedidosAdmin') || '[]');
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
      localStorage.setItem('pedidosAdmin', JSON.stringify(pedidosAdmin));

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
        error: 'Erro ao criar pedido. Tente novamente.'
      };
    }
  },

  // Buscar pedidos por empresa
  buscarPedidosPorEmpresa: async (cnpj) => {
    try {
      console.log('🔍 Buscando pedidos para CNPJ:', cnpj);
      
      // Garante CNPJ limpo
      const empresaCnpj = cnpjService.removerMascaraCnpj(cnpj);

      // Busca no Supabase
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('empresa_cnpj', empresaCnpj)
        .order('data_pedido', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar pedidos no Supabase:', error.message);
        return [];
      }

      console.log(`✅ Encontrados ${pedidos.length} pedidos`);

      return pedidos.map(pedido => ({
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
    } catch (error) {
      console.error('❌ Erro ao buscar pedidos:', error);
      return [];
    }
  },

  // Atualizar status do pedido
  atualizarStatusPedido: async (pedidoId, novoStatus) => {
    try {
      console.log('🔄 Atualizando status do pedido:', pedidoId, 'para:', novoStatus);

      // Atualiza no Supabase
      const { data, error } = await supabase
        .from('pedidos')
        .update({ 
          status: novoStatus, 
          data_atualizacao: new Date().toISOString() 
        })
        .eq('id', pedidoId)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar status no Supabase:', error.message);
        return {
          success: false,
          error: 'Pedido não encontrado'
        };
      }

      // Atualiza no localStorage para compatibilidade
      const pedidos = this.getPedidosDatabase();
      const pedidoIndex = pedidos.findIndex(p => p.id === pedidoId);
      if (pedidoIndex >= 0) {
        pedidos[pedidoIndex].status = novoStatus;
        pedidos[pedidoIndex].data_atualizacao = new Date().toISOString();
        this.savePedidosDatabase(pedidos);
      }

      // Atualiza também no formato admin
      const pedidosAdmin = JSON.parse(localStorage.getItem('pedidosAdmin') || '[]');
      const adminIndex = pedidosAdmin.findIndex(p => p.id === pedidoId);
      if (adminIndex >= 0) {
        pedidosAdmin[adminIndex].status = novoStatus;
        localStorage.setItem('pedidosAdmin', JSON.stringify(pedidosAdmin));
      }

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
        error: 'Erro ao atualizar status do pedido'
      };
    }
  },

  // Buscar pedido por número
  buscarPedidoPorNumero: async (numero) => {
    try {
      const { data: pedido, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('numero', numero)
        .single();

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
        error: 'Erro ao buscar pedido'
      };
    }
  },

  // Listar todos os pedidos (para admin)
  listarTodosPedidos: async () => {
    try {
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('data_pedido', { ascending: false });

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

  // Obter estatísticas de pedidos
  obterEstatisticas: async () => {
    try {
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('*');

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

      const hoje = new Date().toDateString();
      const pedidosHoje = pedidos.filter(p => 
        new Date(p.data_pedido).toDateString() === hoje
      );

      const totalVendas = pedidos.reduce((sum, p) => sum + (p.total || 0), 0);

      const statusCount = pedidos.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {});

      return {
        totalPedidos: pedidos.length,
        pedidosHoje: pedidosHoje.length,
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

  // Cancelar pedido
  cancelarPedido: async (pedidoId, motivo = '') => {
    try {
      console.log('❌ Cancelando pedido:', pedidoId);

      const { data, error } = await supabase
        .from('pedidos')
        .update({
          status: 'cancelado',
          motivo_cancelamento: motivo,
          data_atualizacao: new Date().toISOString()
        })
        .eq('id', pedidoId)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao cancelar pedido:', error);
        return {
          success: false,
          error: 'Erro ao cancelar pedido'
        };
      }

      // Atualiza localStorage para compatibilidade
      const pedidos = this.getPedidosDatabase();
      const pedidoIndex = pedidos.findIndex(p => p.id === pedidoId);
      if (pedidoIndex >= 0) {
        pedidos[pedidoIndex].status = 'cancelado';
        pedidos[pedidoIndex].motivo_cancelamento = motivo;
        pedidos[pedidoIndex].data_atualizacao = new Date().toISOString();
        this.savePedidosDatabase(pedidos);
      }

      // Atualiza também no formato admin
      const pedidosAdmin = JSON.parse(localStorage.getItem('pedidosAdmin') || '[]');
      const adminIndex = pedidosAdmin.findIndex(p => p.id === pedidoId);
      if (adminIndex >= 0) {
        pedidosAdmin[adminIndex].status = 'cancelado';
        localStorage.setItem('pedidosAdmin', JSON.stringify(pedidosAdmin));
      }

      return {
        success: true,
        message: 'Pedido cancelado com sucesso!'
      };
    } catch (error) {
      console.error('❌ Erro ao cancelar pedido:', error);
      return {
        success: false,
        error: 'Erro ao cancelar pedido'
      };
    }
  }
};