// src/services/pedidoService.js

export const pedidoService = {
  
    // Banco de dados mock para pedidos
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
        
        // Simula delay de rede
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const novoPedido = {
          id: Date.now(),
          numero: Math.floor(Math.random() * 10000) + 1000,
          cnpj: dadosPedido.cnpj,
          empresa_nome: dadosPedido.empresaNome,
          itens: dadosPedido.itens,
          subtotal: dadosPedido.subtotal,
          taxa_entrega: dadosPedido.taxaEntrega,
          total: dadosPedido.total,
          endereco_entrega: dadosPedido.enderecoEntrega,
          observacoes: dadosPedido.observacoes,
          status: 'enviado',
          data_criacao: new Date().toISOString(),
          data_atualizacao: new Date().toISOString(),
          origem: 'supabase'
        };
        
        // Salva no banco de pedidos
        const pedidos = this.getPedidosDatabase();
        pedidos.push(novoPedido);
        this.savePedidosDatabase(pedidos);
        
        // Também salva no formato do admin para compatibilidade
        const pedidosAdmin = JSON.parse(localStorage.getItem('pedidosAdmin') || '[]');
        pedidosAdmin.push({
          id: novoPedido.id,
          numero: novoPedido.numero,
          cliente: novoPedido.empresa_nome,
          cnpj: novoPedido.cnpj,
          total: novoPedido.total,
          status: novoPedido.status,
          data: novoPedido.data_criacao,
          itens: novoPedido.itens,
          enderecoEntrega: novoPedido.endereco_entrega,
          observacoes: novoPedido.observacoes
        });
        localStorage.setItem('pedidosAdmin', JSON.stringify(pedidosAdmin));
        
        console.log('✅ Pedido criado com sucesso:', novoPedido.numero);
        
        return {
          success: true,
          pedido: novoPedido,
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
        
        // Simula delay de rede
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        const pedidos = this.getPedidosDatabase();
        
        const pedidosDaEmpresa = pedidos
          .filter(pedido => pedido.cnpj === cnpjLimpo)
          .map(pedido => ({
            id: pedido.id,
            numero: pedido.numero,
            total: pedido.total,
            status: pedido.status,
            data: pedido.data_criacao,
            itens: pedido.itens,
            enderecoEntrega: pedido.endereco_entrega,
            observacoes: pedido.observacoes,
            origem: 'supabase'
          }))
          .sort((a, b) => new Date(b.data) - new Date(a.data)); // Mais recente primeiro
        
        console.log(`✅ Encontrados ${pedidosDaEmpresa.length} pedidos`);
        
        return pedidosDaEmpresa;
        
      } catch (error) {
        console.error('❌ Erro ao buscar pedidos:', error);
        return [];
      }
    },
  
    // Atualizar status do pedido
    atualizarStatusPedido: async (pedidoId, novoStatus) => {
      try {
        console.log('🔄 Atualizando status do pedido:', pedidoId, 'para:', novoStatus);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const pedidos = this.getPedidosDatabase();
        const pedidoIndex = pedidos.findIndex(p => p.id === pedidoId);
        
        if (pedidoIndex === -1) {
          return {
            success: false,
            error: 'Pedido não encontrado'
          };
        }
        
        pedidos[pedidoIndex].status = novoStatus;
        pedidos[pedidoIndex].data_atualizacao = new Date().toISOString();
        
        this.savePedidosDatabase(pedidos);
        
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
          pedido: pedidos[pedidoIndex],
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
        const pedidos = this.getPedidosDatabase();
        const pedido = pedidos.find(p => p.numero === numero);
        
        if (!pedido) {
          return {
            success: false,
            error: 'Pedido não encontrado'
          };
        }
        
        return {
          success: true,
          pedido: pedido
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
        const pedidos = this.getPedidosDatabase();
        
        return pedidos
          .sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao))
          .map(pedido => ({
            id: pedido.id,
            numero: pedido.numero,
            cnpj: pedido.cnpj,
            empresa_nome: pedido.empresa_nome,
            total: pedido.total,
            status: pedido.status,
            data: pedido.data_criacao,
            itens_count: pedido.itens ? pedido.itens.length : 0,
            origem: pedido.origem || 'supabase'
          }));
          
      } catch (error) {
        console.error('Erro ao listar pedidos:', error);
        return [];
      }
    },
  
    // Obter estatísticas de pedidos
    obterEstatisticas: async () => {
      try {
        const pedidos = this.getPedidosDatabase();
        
        const hoje = new Date().toDateString();
        const pedidosHoje = pedidos.filter(p => 
          new Date(p.data_criacao).toDateString() === hoje
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
        
        const resultado = await this.atualizarStatusPedido(pedidoId, 'cancelado');
        
        if (resultado.success) {
          // Adiciona informação do motivo se fornecido
          if (motivo) {
            const pedidos = this.getPedidosDatabase();
            const pedidoIndex = pedidos.findIndex(p => p.id === pedidoId);
            if (pedidoIndex >= 0) {
              pedidos[pedidoIndex].motivo_cancelamento = motivo;
              pedidos[pedidoIndex].data_cancelamento = new Date().toISOString();
              this.savePedidosDatabase(pedidos);
            }
          }
          
          return {
            success: true,
            message: 'Pedido cancelado com sucesso!'
          };
        }
        
        return resultado;
        
      } catch (error) {
        console.error('❌ Erro ao cancelar pedido:', error);
        return {
          success: false,
          error: 'Erro ao cancelar pedido'
        };
      }
    }
  };