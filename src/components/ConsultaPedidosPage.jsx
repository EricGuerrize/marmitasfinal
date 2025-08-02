// src/components/ConsultaPedidosPage.jsx
import React, { useState, useEffect } from 'react';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { pedidoService } from '../services/pedidoService';

const ConsultaPedidosPage = ({ onNavigate }) => {
  const [pedidos, setPedidos] = useState([]);
  const [filtros, setFiltros] = useState({
    status: 'todos',
    dataInicio: '',
    dataFim: '',
    periodo: '30'
  });
  const [loading, setLoading] = useState(true);
  const [sessaoAtiva, setSessaoAtiva] = useState(null);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [stats, setStats] = useState({
    totalPedidos: 0,
    valorTotal: 0,
    ultimoPedido: null
  });

  const statusPedidos = [
    { value: 'todos', label: 'Todos os Status', color: '#6c757d' },
    { value: 'enviado', label: 'Enviado', color: '#007bff' },
    { value: 'a_preparar', label: 'A Preparar', color: '#ffc107' },
    { value: 'em_producao', label: 'Em Produção', color: '#fd7e14' },
    { value: 'pronto_entrega', label: 'Pronto p/ Entrega', color: '#28a745' },
    { value: 'entregue', label: 'Entregue', color: '#6c757d' },
    { value: 'cancelado', label: 'Cancelado', color: '#dc3545' }
  ];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Verifica sessão
    const sessao = firebaseAuthService.verificarSessao();
    if (!sessao) {
      alert('Sessão expirada. Faça login novamente.');
      onNavigate('home');
      return;
    }
    setSessaoAtiva(sessao);
    
    carregarPedidos(sessao);
  }, [onNavigate]);
// ConsultaPedidosPage.jsx - SUBSTITUA a função carregarPedidos (linha ~50):

const carregarPedidos = async (sessao) => {
  setLoading(true);
  try {
    console.log('🔍 ConsultaPedidos - Carregando pedidos para sessão:', sessao);
    console.log('🔍 CNPJ da sessão:', sessao.cnpj);
    
    // Carrega pedidos do banco Supabase
    const pedidosSupabase = await pedidoService.buscarPedidosPorEmpresa(sessao.cnpj);
    console.log('📦 Pedidos Supabase encontrados:', pedidosSupabase.length);
    console.log('📦 Dados Supabase:', pedidosSupabase);
    
    // ✅ CORRIGIDO: Limpar CNPJ para comparação
    const cnpjSessaoLimpo = sessao.cnpj?.replace(/\D/g, '');
    
    // Carrega também pedidos locais (localStorage) para compatibilidade
    const pedidosLocais = JSON.parse(localStorage.getItem('pedidosAdmin') || '[]')
      .filter(p => {
        const cnpjPedidoLimpo = p.cnpj?.replace(/\D/g, '');
        const cnpjEmpresaLimpo = p.empresa_cnpj?.replace(/\D/g, '');
        return cnpjPedidoLimpo === cnpjSessaoLimpo || cnpjEmpresaLimpo === cnpjSessaoLimpo;
      })
      .map(p => ({
        ...p,
        origem: 'local'
      }));
    
    console.log('💾 Pedidos locais encontrados:', pedidosLocais.length);
    console.log('💾 Dados locais:', pedidosLocais);
    
    // Combina pedidos (prioriza Supabase)
    const todosPedidos = [...pedidosSupabase, ...pedidosLocais];
    console.log('🔄 Total pedidos combinados:', todosPedidos.length);
    
    // Remove duplicatas baseado no número do pedido
    const pedidosUnicos = todosPedidos.reduce((acc, pedido) => {
      const existing = acc.find(p => p.numero === pedido.numero);
      if (!existing) {
        acc.push(pedido);
      } else {
        console.log('🔄 Pedido duplicado removido:', pedido.numero);
      }
      return acc;
    }, []);
    
    console.log('✅ Pedidos únicos finais:', pedidosUnicos.length);
    
    // Ordena por data (mais recente primeiro)
    pedidosUnicos.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    setPedidos(pedidosUnicos);
    calcularEstatisticas(pedidosUnicos);
    
    // ✅ MENSAGEM DE DEBUG FINAL:
    if (pedidosUnicos.length === 0) {
      console.log('⚠️ NENHUM PEDIDO ENCONTRADO FINAL!');
      console.log('🔍 Verificações ConsultaPedidos:');
      console.log('   - CNPJ da sessão:', sessao.cnpj);
      console.log('   - CNPJ limpo:', cnpjSessaoLimpo);
      console.log('   - Pedidos Supabase:', pedidosSupabase.length);
      console.log('   - Pedidos locais:', pedidosLocais.length);
    } else {
      console.log('🎉 SUCESSO! Pedidos carregados:', pedidosUnicos.length);
    }
    
  } catch (error) {
    console.error('❌ Erro ao carregar pedidos:', error);
    alert('Erro ao carregar pedidos. Tente novamente.');
  } finally {
    setLoading(false);
  }
};

  const calcularEstatisticas = (pedidosList) => {
    if (pedidosList.length === 0) {
      setStats({ totalPedidos: 0, valorTotal: 0, ultimoPedido: null });
      return;
    }

    const valorTotal = pedidosList.reduce((sum, p) => sum + (p.total || 0), 0);
    const ultimoPedido = pedidosList[0]; // Já ordenado por data

    setStats({
      totalPedidos: pedidosList.length,
      valorTotal,
      ultimoPedido
    });
  };

  const aplicarFiltros = () => {
    let pedidosFiltrados = [...pedidos];

    // Filtro por status
    if (filtros.status !== 'todos') {
      pedidosFiltrados = pedidosFiltrados.filter(p => p.status === filtros.status);
    }

    // Filtro por período
    if (filtros.periodo !== 'todos') {
      const diasAtras = parseInt(filtros.periodo);
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - diasAtras);
      
      pedidosFiltrados = pedidosFiltrados.filter(p => 
        new Date(p.data) >= dataLimite
      );
    }

    // Filtro por datas específicas
    if (filtros.dataInicio) {
      pedidosFiltrados = pedidosFiltrados.filter(p => 
        new Date(p.data) >= new Date(filtros.dataInicio)
      );
    }

    if (filtros.dataFim) {
      const dataFimAjustada = new Date(filtros.dataFim);
      dataFimAjustada.setHours(23, 59, 59);
      pedidosFiltrados = pedidosFiltrados.filter(p => 
        new Date(p.data) <= dataFimAjustada
      );
    }

    return pedidosFiltrados;
  };

  const formatarData = (dataISO) => {
    return new Date(dataISO).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusInfo = (status) => {
    return statusPedidos.find(s => s.value === status) || statusPedidos[0];
  };

  const abrirDetalhes = (pedido) => {
    setSelectedPedido(pedido);
    setShowDetalhes(true);
  };

  const baixarComprovante = (pedido) => {
    const conteudoPDF = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Comprovante Pedido #${pedido.numero}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #009245; font-size: 24px; font-weight: bold; }
          .info-box { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .total { font-size: 18px; font-weight: bold; color: #009245; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🍽️ FIT IN BOX</div>
          <h1>COMPROVANTE DE PEDIDO</h1>
        </div>
        
        <div class="info-box">
          <strong>Pedido:</strong> #${pedido.numero}<br>
          <strong>Data:</strong> ${formatarData(pedido.data)}<br>
          <strong>CNPJ:</strong> ${sessaoAtiva.cnpj}<br>
          <strong>Status:</strong> ${getStatusInfo(pedido.status).label}
        </div>
        
        <h2>ITENS DO PEDIDO</h2>
        ${pedido.itens?.map(item => 
          `<div class="item">
            <span>${item.quantidade}x ${item.nome}</span>
            <span>R$ ${(item.quantidade * item.preco).toFixed(2)}</span>
          </div>`
        ).join('') || '<p>Itens não disponíveis</p>'}
        
        <div class="item total">
          <span>TOTAL:</span>
          <span>R$ ${pedido.total.toFixed(2)}</span>
        </div>
        
        ${pedido.enderecoEntrega ? `
          <div class="info-box">
            <strong>Endereço de entrega:</strong><br>
            ${pedido.enderecoEntrega}
          </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px; color: #666;">
          <p>Fit In Box - Alimentação Saudável</p>
          <p>Obrigado pela preferência!</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([conteudoPDF], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const novaJanela = window.open(url, '_blank');
    novaJanela.onload = () => {
      setTimeout(() => {
        novaJanela.print();
        window.URL.revokeObjectURL(url);
      }, 500);
    };
  };

  const repetirPedido = (pedido) => {
    if (!pedido.itens || pedido.itens.length === 0) {
      alert('Não é possível repetir este pedido pois os itens não estão disponíveis.');
      return;
    }

    if (window.confirm('Deseja adicionar os itens deste pedido ao carrinho?')) {
      // Limpa carrinho atual
      sessionStorage.removeItem('carrinho');
      
      // Adiciona itens do pedido ao carrinho
      sessionStorage.setItem('carrinho', JSON.stringify(pedido.itens));
      
      alert('Itens adicionados ao carrinho! Redirecionando...');
      onNavigate('pedido-produtos');
    }
  };

  const handleLogout = () => {
    if (window.confirm('Tem certeza que deseja sair?')) {
      firebaseAuthService.logout();
      onNavigate('home');
    }
  };

  const pedidosFiltrados = aplicarFiltros();

  return (
    <div style={{
      margin: 0,
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '15px' : '15px 40px',
        borderBottom: '1px solid #ccc',
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        <div style={{ 
          fontSize: isMobile ? '24px' : '32px', 
          fontWeight: 'bold', 
          color: '#009245' 
        }}>
          🍽️ Fit In Box
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '10px' : '20px',
          flexDirection: isMobile ? 'column' : 'row',
          marginTop: isMobile ? '15px' : '0',
          width: isMobile ? '100%' : 'auto'
        }}>
          <span style={{
            fontWeight: 'bold',
            color: '#009245',
            fontSize: isMobile ? '12px' : '14px',
            textAlign: 'center'
          }}>
            {sessaoAtiva?.razaoSocial || 'Carregando...'}
          </span>
          
          <div style={{
            display: 'flex',
            gap: '10px',
            flexDirection: isMobile ? 'column' : 'row',
            width: isMobile ? '100%' : 'auto'
          }}>
            <button 
              onClick={() => onNavigate('prosseguir')}
              style={{
                backgroundColor: '#009245',
                color: 'white',
                border: 'none',
                padding: isMobile ? '8px 15px' : '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: isMobile ? '14px' : '16px',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              Menu Principal
            </button>
            
            <button 
              onClick={handleLogout}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: isMobile ? '8px 15px' : '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: isMobile ? '14px' : '16px',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Container Principal */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: isMobile ? '15px' : '25px'
      }}>
        <h1 style={{ 
          color: '#009245', 
          marginBottom: '25px',
          fontSize: isMobile ? '24px' : '28px',
          textAlign: isMobile ? 'center' : 'left'
        }}>
          📋 Histórico de Pedidos
        </h1>

        {/* Estatísticas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '30px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📦</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#009245' }}>
              {stats.totalPedidos}
            </div>
            <div style={{ color: '#666', fontSize: '14px' }}>Total de Pedidos</div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>💰</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
              R$ {stats.valorTotal.toFixed(2)}
            </div>
            <div style={{ color: '#666', fontSize: '14px' }}>Valor Total</div>
          </div>

          {stats.ultimoPedido && (
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>⏱️</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#007bff' }}>
                #{stats.ultimoPedido.numero}
              </div>
              <div style={{ color: '#666', fontSize: '14px' }}>Último Pedido</div>
            </div>
          )}
        </div>

        {/* Filtros */}
        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '20px' : '25px',
          borderRadius: '10px',
          marginBottom: '25px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#009245', marginBottom: '20px' }}>🔍 Filtros</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Status
              </label>
              <select
                value={filtros.status}
                onChange={(e) => setFiltros({...filtros, status: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
                }}
              >
                {statusPedidos.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Período
              </label>
              <select
                value={filtros.periodo}
                onChange={(e) => setFiltros({...filtros, periodo: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
                }}
              >
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="365">Último ano</option>
                <option value="todos">Todos os períodos</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Data Início
              </label>
              <input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
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
                Data Fim
              </label>
              <input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Lista de Pedidos */}
        {loading ? (
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
            <h3>Carregando pedidos...</h3>
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
            <h3 style={{ color: '#666' }}>Nenhum pedido encontrado</h3>
            <p style={{ color: '#999', marginBottom: '20px' }}>
              {pedidos.length === 0 
                ? 'Você ainda não fez nenhum pedido.'
                : 'Nenhum pedido corresponde aos filtros selecionados.'
              }
            </p>
            {pedidos.length === 0 && (
              <button
                onClick={() => onNavigate('pedido-produtos')}
                style={{
                  backgroundColor: '#009245',
                  color: 'white',
                  border: 'none',
                  padding: '12px 25px',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Fazer Primeiro Pedido
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            {pedidosFiltrados.map(pedido => {
              const statusInfo = getStatusInfo(pedido.status);
              return (
                <div
                  key={pedido.id || pedido.numero}
                  style={{
                    backgroundColor: 'white',
                    padding: isMobile ? '20px' : '25px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    border: '1px solid #e9ecef'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '15px',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '15px' : '0'
                  }}>
                    <div>
                      <h3 style={{ 
                        margin: '0 0 5px 0', 
                        color: '#009245',
                        fontSize: isMobile ? '18px' : '20px'
                      }}>
                        Pedido #{pedido.numero}
                      </h3>
                      <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                        📅 {formatarData(pedido.data)}
                      </p>
                      {pedido.origem === 'local' && (
                        <small style={{ 
                          backgroundColor: '#fff3cd', 
                          color: '#856404',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '11px'
                        }}>
                          Pedido Local
                        </small>
                      )}
                    </div>

                    <div style={{ 
                      textAlign: isMobile ? 'left' : 'right',
                      width: isMobile ? '100%' : 'auto'
                    }}>
                      <div style={{
                        backgroundColor: statusInfo.color,
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '15px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginBottom: '10px',
                        display: 'inline-block'
                      }}>
                        {statusInfo.label}
                      </div>
                      <div style={{
                        fontSize: isMobile ? '22px' : '24px',
                        fontWeight: 'bold',
                        color: '#28a745'
                      }}>
                        R$ {pedido.total.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Resumo dos itens */}
                  {pedido.itens && pedido.itens.length > 0 && (
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      padding: '15px',
                      borderRadius: '8px',
                      marginBottom: '15px'
                    }}>
                      <strong style={{ color: '#009245', marginBottom: '10px', display: 'block' }}>
                        📦 Itens ({pedido.itens.reduce((sum, item) => sum + item.quantidade, 0)} marmitas):
                      </strong>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        {pedido.itens.slice(0, 3).map((item, index) => (
                          <div key={index} style={{ marginBottom: '3px' }}>
                            • {item.quantidade}x {item.nome}
                          </div>
                        ))}
                        {pedido.itens.length > 3 && (
                          <div style={{ fontStyle: 'italic', marginTop: '5px' }}>
                            + {pedido.itens.length - 3} item(s) adicional(is)
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap',
                    justifyContent: isMobile ? 'center' : 'flex-start'
                  }}>
                    <button
                      onClick={() => abrirDetalhes(pedido)}
                      style={{
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        padding: '8px 15px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      👁️ Detalhes
                    </button>

                    <button
                      onClick={() => baixarComprovante(pedido)}
                      style={{
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        padding: '8px 15px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      📄 Comprovante
                    </button>

                    {pedido.itens && pedido.itens.length > 0 && (
                      <button
                        onClick={() => repetirPedido(pedido)}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          padding: '8px 15px',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                      >
                        🔄 Repetir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {showDetalhes && selectedPedido && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: isMobile ? '15px' : '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: isMobile ? '25px' : '30px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowDetalhes(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ×
            </button>

            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <h2 style={{ color: '#009245', margin: '0 0 10px 0' }}>
                📋 Detalhes do Pedido
              </h2>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
                #{selectedPedido.numero}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '20px',
              marginBottom: '25px'
            }}>
              <div>
                <strong style={{ color: '#009245' }}>📅 Data do Pedido:</strong>
                <div>{formatarData(selectedPedido.data)}</div>
              </div>

              <div>
                <strong style={{ color: '#009245' }}>📊 Status:</strong>
                <div>
                  <span style={{
                    backgroundColor: getStatusInfo(selectedPedido.status).color,
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {getStatusInfo(selectedPedido.status).label}
                  </span>
                </div>
              </div>

              <div>
                <strong style={{ color: '#009245' }}>💰 Valor Total:</strong>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                  R$ {selectedPedido.total.toFixed(2)}
                </div>
              </div>

              <div>
                <strong style={{ color: '#009245' }}>📦 Total de Itens:</strong>
                <div>
                  {selectedPedido.itens 
                    ? selectedPedido.itens.reduce((sum, item) => sum + item.quantidade, 0)
                    : 'N/A'
                  } marmitas
                </div>
              </div>
            </div>

            {selectedPedido.itens && selectedPedido.itens.length > 0 && (
              <div style={{ marginBottom: '25px' }}>
                <strong style={{ color: '#009245', marginBottom: '15px', display: 'block' }}>
                  🍽️ Itens do Pedido:
                </strong>
                <div style={{
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  padding: '15px'
                }}>
                  {selectedPedido.itens.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: index < selectedPedido.itens.length - 1 ? '1px solid #dee2e6' : 'none'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{item.nome}</div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          {item.quantidade} x R$ {item.preco.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ fontWeight: 'bold', color: '#009245' }}>
                        R$ {(item.quantidade * item.preco).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedPedido.enderecoEntrega && (
              <div style={{ marginBottom: '25px' }}>
                <strong style={{ color: '#009245', marginBottom: '10px', display: 'block' }}>
                  📍 Endereço de Entrega:
                </strong>
                <div style={{
                  backgroundColor: '#fff8e1',
                  padding: '15px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  {selectedPedido.enderecoEntrega}
                </div>
              </div>
            )}

            {selectedPedido.observacoes && (
              <div style={{ marginBottom: '25px' }}>
                <strong style={{ color: '#009245', marginBottom: '10px', display: 'block' }}>
                  💬 Observações:
                </strong>
                <div style={{
                  backgroundColor: '#e7f3ff',
                  padding: '15px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontStyle: 'italic'
                }}>
                  {selectedPedido.observacoes}
                </div>
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => baixarComprovante(selectedPedido)}
                style={{
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                📄 Baixar Comprovante
              </button>

              {selectedPedido.itens && selectedPedido.itens.length > 0 && (
                <button
                  onClick={() => {
                    setShowDetalhes(false);
                    repetirPedido(selectedPedido);
                  }}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  🔄 Repetir Pedido
                </button>
              )}

              <button
                onClick={() => setShowDetalhes(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultaPedidosPage;