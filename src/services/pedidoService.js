// src/services/pedidoService.js
import { supabase } from '../lib/supabase';

/**
 * Serviço para gerenciamento de pedidos no Supabase
 */
export const pedidoService = {
    
    /**
     * Cria um novo pedido no banco
     * @param {Object} dadosPedido - Dados completos do pedido
     * @returns {Object} Resultado da operação
     */
    async criarPedido(dadosPedido) {
        try {
            const { data, error } = await supabase
                .from('pedidos')
                .insert([{
                    numero: dadosPedido.numero,
                    empresa_cnpj: dadosPedido.cnpj,
                    empresa_nome: dadosPedido.empresaNome,
                    itens: JSON.stringify(dadosPedido.itens),
                    subtotal: dadosPedido.subtotal,
                    taxa_entrega: dadosPedido.taxaEntrega,
                    total: dadosPedido.total,
                    endereco_entrega: dadosPedido.enderecoEntrega,
                    observacoes: dadosPedido.observacoes,
                    status: dadosPedido.status || 'enviado',
                    data_pedido: dadosPedido.data || new Date().toISOString(),
                    metodo_pagamento: dadosPedido.metodoPagamento || 'pix',
                    previsao_entrega: dadosPedido.previsaoEntrega
                }])
                .select()
                .single();
                
            if (error) throw error;
            
            return {
                success: true,
                pedido: data
            };
            
        } catch (error) {
            console.error('Erro ao criar pedido:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Busca pedidos de uma empresa específica
     * @param {string} cnpj - CNPJ da empresa (com ou sem formatação)
     * @returns {Array} Lista de pedidos
     */
    async buscarPedidosPorEmpresa(cnpj) {
        try {
            const cnpjLimpo = cnpj.replace(/\D/g, '');
            const cnpjFormatado = this.formatarCnpj(cnpjLimpo);
            
            const { data, error } = await supabase
                .from('pedidos')
                .select('*')
                .or(`empresa_cnpj.eq.${cnpjLimpo},empresa_cnpj.eq.${cnpjFormatado}`)
                .order('data_pedido', { ascending: false });
                
            if (error) throw error;
            
            // Converte dados para formato esperado pelo componente
            return data.map(pedido => ({
                id: pedido.id,
                numero: pedido.numero,
                cnpj: pedido.empresa_cnpj,
                empresaNome: pedido.empresa_nome,
                total: pedido.total,
                subtotal: pedido.subtotal,
                taxaEntrega: pedido.taxa_entrega,
                status: pedido.status,
                data: pedido.data_pedido,
                itens: this.parseItens(pedido.itens),
                enderecoEntrega: pedido.endereco_entrega,
                observacoes: pedido.observacoes,
                metodoPagamento: pedido.metodo_pagamento,
                previsaoEntrega: pedido.previsao_entrega,
                origem: 'supabase'
            }));
            
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error);
            return [];
        }
    },
    
    /**
     * Atualiza status de um pedido
     * @param {number} pedidoId - ID do pedido
     * @param {string} novoStatus - Novo status
     * @returns {Object} Resultado da operação
     */
    async atualizarStatusPedido(pedidoId, novoStatus) {
        try {
            const { data, error } = await supabase
                .from('pedidos')
                .update({ 
                    status: novoStatus,
                    data_atualizacao: new Date().toISOString()
                })
                .eq('id', pedidoId)
                .select()
                .single();
                
            if (error) throw error;
            
            return {
                success: true,
                pedido: data
            };
            
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Busca pedido por número
     * @param {number} numeroPedido - Número do pedido
     * @returns {Object|null} Dados do pedido ou null
     */
    async buscarPedidoPorNumero(numeroPedido) {
        try {
            const { data, error } = await supabase
                .from('pedidos')
                .select('*')
                .eq('numero', numeroPedido)
                .single();
                
            if (error) throw error;
            
            return {
                id: data.id,
                numero: data.numero,
                cnpj: data.empresa_cnpj,
                empresaNome: data.empresa_nome,
                total: data.total,
                subtotal: data.subtotal,
                taxaEntrega: data.taxa_entrega,
                status: data.status,
                data: data.data_pedido,
                itens: this.parseItens(data.itens),
                enderecoEntrega: data.endereco_entrega,
                observacoes: data.observacoes,
                metodoPagamento: data.metodo_pagamento,
                previsaoEntrega: data.previsao_entrega
            };
            
        } catch (error) {
            console.error('Erro ao buscar pedido:', error);
            return null;
        }
    },
    
    /**
     * Lista todos os pedidos (para admin)
     * @param {Object} filtros - Filtros opcionais
     * @returns {Array} Lista de pedidos
     */
    async listarTodosPedidos(filtros = {}) {
        try {
            let query = supabase
                .from('pedidos')
                .select('*');
                
            // Aplica filtros
            if (filtros.status && filtros.status !== 'todos') {
                query = query.eq('status', filtros.status);
            }
            
            if (filtros.dataInicio) {
                query = query.gte('data_pedido', filtros.dataInicio);
            }
            
            if (filtros.dataFim) {
                query = query.lte('data_pedido', filtros.dataFim);
            }
            
            if (filtros.empresaCnpj) {
                query = query.eq('empresa_cnpj', filtros.empresaCnpj);
            }
            
            const { data, error } = await query.order('data_pedido', { ascending: false });
                
            if (error) throw error;
            
            return data.map(pedido => ({
                id: pedido.id,
                numero: pedido.numero,
                cliente: pedido.empresa_nome,
                cnpj: pedido.empresa_cnpj,
                total: pedido.total,
                status: pedido.status,
                data: pedido.data_pedido,
                itens: this.parseItens(pedido.itens),
                enderecoEntrega: pedido.endereco_entrega,
                observacoes: pedido.observacoes
            }));
            
        } catch (error) {
            console.error('Erro ao listar pedidos:', error);
            return [];
        }
    },
    
    /**
     * Calcula estatísticas de pedidos
     * @param {string} cnpj - CNPJ da empresa (opcional, para stats específicas)
     * @returns {Object} Estatísticas
     */
    async calcularEstatisticas(cnpj = null) {
        try {
            let query = supabase
                .from('pedidos')
                .select('total, status, data_pedido');
                
            if (cnpj) {
                const cnpjLimpo = cnpj.replace(/\D/g, '');
                const cnpjFormatado = this.formatarCnpj(cnpjLimpo);
                query = query.or(`empresa_cnpj.eq.${cnpjLimpo},empresa_cnpj.eq.${cnpjFormatado}`);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            const stats = {
                totalPedidos: data.length,
                valorTotal: data.reduce((sum, p) => sum + (p.total || 0), 0),
                pedidosHoje: data.filter(p => {
                    const hoje = new Date().toDateString();
                    const dataPedido = new Date(p.data_pedido).toDateString();
                    return dataPedido === hoje;
                }).length,
                statusBreakdown: {}
            };
            
            // Conta pedidos por status
            data.forEach(pedido => {
                stats.statusBreakdown[pedido.status] = (stats.statusBreakdown[pedido.status] || 0) + 1;
            });
            
            return stats;
            
        } catch (error) {
            console.error('Erro ao calcular estatísticas:', error);
            return {
                totalPedidos: 0,
                valorTotal: 0,
                pedidosHoje: 0,
                statusBreakdown: {}
            };
        }
    },
    
    /**
     * Adiciona nota/comentário a um pedido
     * @param {number} pedidoId - ID do pedido
     * @param {string} nota - Nota a ser adicionada
     * @returns {Object} Resultado da operação
     */
    async adicionarNota(pedidoId, nota) {
        try {
            // Busca pedido atual para manter histórico de notas
            const { data: pedidoAtual } = await supabase
                .from('pedidos')
                .select('notas')
                .eq('id', pedidoId)
                .single();
                
            const notasExistentes = pedidoAtual?.notas ? JSON.parse(pedidoAtual.notas) : [];
            const novaNotaObj = {
                id: Date.now(),
                texto: nota,
                data: new Date().toISOString(),
                autor: 'Sistema'
            };
            
            const notasAtualizadas = [...notasExistentes, novaNotaObj];
            
            const { data, error } = await supabase
                .from('pedidos')
                .update({ 
                    notas: JSON.stringify(notasAtualizadas),
                    data_atualizacao: new Date().toISOString()
                })
                .eq('id', pedidoId)
                .select()
                .single();
                
            if (error) throw error;
            
            return {
                success: true,
                pedido: data
            };
            
        } catch (error) {
            console.error('Erro ao adicionar nota:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // === MÉTODOS AUXILIARES ===
    
    /**
     * Faz parse dos itens do pedido (JSON string para array)
     */
    parseItens(itensJson) {
        try {
            return typeof itensJson === 'string' ? JSON.parse(itensJson) : itensJson || [];
        } catch (error) {
            console.error('Erro ao fazer parse dos itens:', error);
            return [];
        }
    },
    
    /**
     * Formata CNPJ
     */
    formatarCnpj(cnpj) {
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    },
    
    /**
     * Gera número único para pedido
     */
    async gerarNumeroPedido() {
        try {
            // Busca o maior número existente
            const { data, error } = await supabase
                .from('pedidos')
                .select('numero')
                .order('numero', { ascending: false })
                .limit(1);
                
            if (error) throw error;
            
            const ultimoNumero = data?.[0]?.numero || 1000;
            return ultimoNumero + 1;
            
        } catch (error) {
            console.error('Erro ao gerar número do pedido:', error);
            // Fallback para número baseado em timestamp
            return Math.floor(Date.now() / 1000);
        }
    },
    
    /**
     * Valida dados do pedido antes de salvar
     */
    validarPedido(dadosPedido) {
        const erros = [];
        
        if (!dadosPedido.cnpj) {
            erros.push('CNPJ é obrigatório');
        }
        
        if (!dadosPedido.itens || dadosPedido.itens.length === 0) {
            erros.push('Pedido deve ter pelo menos um item');
        }
        
        if (!dadosPedido.total || dadosPedido.total <= 0) {
            erros.push('Total do pedido deve ser maior que zero');
        }
        
        if (!dadosPedido.enderecoEntrega) {
            erros.push('Endereço de entrega é obrigatório');
        }
        
        return {
            isValid: erros.length === 0,
            erros
        };
    },
    
    /**
     * Converte pedido local (localStorage) para formato do banco
     */
    converterPedidoLocal(pedidoLocal, cnpj, empresaNome) {
        return {
            numero: pedidoLocal.numero,
            cnpj: cnpj,
            empresaNome: empresaNome,
            itens: pedidoLocal.itens,
            subtotal: pedidoLocal.subtotal,
            taxaEntrega: pedidoLocal.taxaEntrega,
            total: pedidoLocal.total,
            enderecoEntrega: pedidoLocal.enderecoEntrega,
            observacoes: pedidoLocal.observacoes,
            status: pedidoLocal.status || 'enviado',
            data: pedidoLocal.data,
            metodoPagamento: 'pix'
        };
    }
};