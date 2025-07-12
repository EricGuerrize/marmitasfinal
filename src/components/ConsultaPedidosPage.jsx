import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext'; // Importa o hook de autenticação
import { pedidoService } from '../services/pedidoService';

const ConsultaPedidosPage = ({ onNavigate }) => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ status: 'todos', periodo: '30' });
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [stats, setStats] = useState({ 
    totalPedidos: 0, 
    valorTotal: 0, 
    ultimoPedido: null,
    pedidosUltimos30Dias: 0,
    ticketMedio: 0
  });

  // Obtém a sessão e a função de logout do contexto
  const { sessionInfo, logout, isAuthenticated } = useAuth();

  const statusPedidos = [
    { value: 'todos', label: 'Todos os Status', color: '#6c757d', icon: '📋' },
    { value: 'enviado', label: 'Enviado', color: '#17a2b8', icon: '📤' },
    { value: 'a_preparar', label: 'A Preparar', color: '#ffc107', icon: '⏳' },
    { value: 'em_producao', label: 'Em Produção', color: '#007bff', icon: '👨‍🍳' },
    { value: 'pronto_entrega', label: 'Pronto para Entrega', color: '#28a745', icon: '📦' },
    { value: 'entregue', label: 'Entregue', color: '#6c757d', icon: '✅' },
    { value: 'cancelado', label: 'Cancelado', color: '#dc3545', icon: '❌' }
  ];

  const periodoOptions = [
    { value: '7', label: 'Últimos 7 dias' },
    { value: '30', label: 'Últimos 30 dias' },
    { value: '90', label: 'Últimos 90 dias' },
    { value: '365', label: 'Último ano' },
    { value: 'todos', label: 'Todos os períodos' }
  ];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Efeito para carregar os pedidos usando a sessão do contexto
  useEffect(() => {
    if (isAuthenticated && sessionInfo?.cnpj) {
      carregarPedidos();
    } else if (!isAuthenticated) {
      // Se o usuário não estiver autenticado, redireciona
      alert('Sessão expirada. Faça login novamente.');
      onNavigate('home');
    }
  }, [isAuthenticated, sessionInfo, onNavigate]);

  const carregarPedidos = async () => {
    setLoading(true);
    try {
      console.log('🔍 Carregando pedidos para CNPJ:', sessionInfo?.cnpj);
      
      const pedidosDoBanco = await pedidoService.buscarPedidosPorEmpresa(sessionInfo.cnpj);
      const pedidosOrdenados = pedidosDoBanco.sort((a, b) => new Date(b.data) - new Date(a.data));
      
      setPedidos(pedidosOrdenados);
      calcularEstatisticas(pedidosOrdenados);
      
      console.log(`✅ ${pedidosOrdenados.length} pedidos carregados`);
    } catch (error) {
      console.error('❌ Erro ao carregar pedidos:', error);
      alert('Erro ao carregar pedidos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const calcularEstatisticas = (pedidosList) => {
    if (!pedidosList || pedidosList.length === 0) {
      setStats({
        totalPedidos: 0,
        valorTotal: 0,
        ultimoPedido: null,
        pedidosUltimos30Dias: 0,
        ticketMedio: 0
      });
      return;
    }

    const totalPedidos = pedidosList.length;
    const valorTotal = pedidosList.reduce((sum, pedido) => sum + (pedido.total || 0), 0);
    const ultimoPedido = pedidosList[0]; // Já está ordenado por data desc

    // Pedidos dos últimos 30 dias
    const trintaDias = new Date();
    trintaDias.setDate(trintaDias.getDate() - 30);
    const pedidosUltimos30Dias = pedidosList.filter(p => 
      new Date(p.data) >= trintaDias
    ).length;

    const ticketMedio = totalPedidos > 0 ? valorTotal / totalPedidos : 0;

    setStats({
      totalPedidos,
      valorTotal,
      ultimoPedido,
      pedidosUltimos30Dias,
      ticketMedio
    });
  };

  const aplicarFiltros = () => {
    let pedidosFiltrados = [...pedidos];

    // Filtro por status
    if (filtros.status !== 'todos') {
      pedidosFiltrados = pedidosFiltrados.filter(pedido => 
        pedido.status === filtros.status
      );
    }

    // Filtro por período
    if (filtros.periodo !== 'todos') {
      const diasAtras = parseInt(filtros.periodo);
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - diasAtras);
      
      pedidosFiltrados = pedidosFiltrados.filter(pedido => 
        new Date(pedido.data) >= dataLimite
      );
    }

    return pedidosFiltrados;
  };

  const formatarData = (dataString) => {
    try {
      const data = new Date(dataString);
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  const getStatusInfo = (status) => {
    return statusPedidos.find(s => s.value === status) || {
      value: status,
      label: status,
      color: '#6c757d',
      icon: '❓'
    };
  };

  const abrirDetalhes = (pedido) => {
    setSelectedPedido(pedido);
    setShowDetalhes(true);
  };

  const fecharDetalhes = () => {
    setSelectedPedido(null);
    setShowDetalhes(false);
  };

  const handleLogout = () => {
    if (window.confirm('Tem certeza que deseja sair?')) {
      logout(); // Chama a função de logout do contexto
      onNavigate('home');
    }
  };

  const exportarPedidos = () => {
    try {
      const pedidosFiltrados = aplicarFiltros();
      const csv = [
        ['Número', 'Data', 'Status', 'Total', 'Itens'].join(';'),
        ...pedidosFiltrados.map(pedido => [
          pedido.numero,
          formatarData(pedido.data),
          getStatusInfo(pedido.status).label,
          `R$ ${pedido.total.toFixed(2)}`,
          pedido.itens ? pedido.itens.length : 0
        ].join(';'))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `pedidos_${sessionInfo?.cnpjFormatado?.replace(/\D/g, '')}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar pedidos.');
    }
  };

  const pedidosFiltrados = aplicarFiltros();

  // Se não estiver autenticado, mostra tela de acesso negado
  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
        <h2 style={{ color: '#dc3545', marginBottom: '10px' }}>Acesso Negado</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>Faça login para consultar seus pedidos.</p>
        <button 
          onClick={() => onNavigate('home')} 
          style={{
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          Fazer Login
        </button>
      </div>
    );
  }

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
          <div style={{
            textAlign: isMobile ? 'center' : 'right'
          }}>
            <div style={{ 
              fontWeight: 'bold', 
              color: '#009245', 
              fontSize: isMobile ? '14px' : '16px' 
            }}>
              {sessionInfo?.nomeEmpresa || sessionInfo?.razaoSocial || 'Empresa'}
            </div>
            <div style={{ 
              fontSize: isMobile ? '12px' : '14px',
              color: '#666'
            }}>
              CNPJ: {sessionInfo?.cnpjFormatado || sessionInfo?.cnpj}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'row' : 'row' }}>
            <button 
              onClick={() => onNavigate('prosseguir')} 
              style={{ 
                backgroundColor: '#009245', 
                color: 'white', 
                border: 'none', 
                padding: isMobile ? '8px 16px' : '10px 20px', 
                borderRadius: '5px', 
                cursor: 'pointer', 
                fontWeight: 'bold',
                fontSize: isMobile ? '14px' : '16px'
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
                padding: isMobile ? '8px 16px' : '10px 20px', 
                borderRadius: '5px', 
                cursor: 'pointer', 
                fontWeight: 'bold',
                fontSize: isMobile ? '14px' : '16px'
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
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '15px' : '0'
        }}>
          <h1 style={{ 
            color: '#009245', 
            margin: 0,
            fontSize: isMobile ? '24px' : '32px'
          }}>
            📋 Histórico de Pedidos
          </h1>
          
          {pedidos.length > 0 && (
            <button
              onClick={exportarPedidos}
              style={{
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              📊 Exportar CSV
            </button>
          )}
        </div>

        {/* Estatísticas */}
        {!loading && pedidos.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '25px'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>📦</div>
              <h3 style={{ color: '#007bff', margin: '0 0 5px 0' }}>Total de Pedidos</h3>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#343a40' }}>
                {stats.totalPedidos}
              </div>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>💰</div>
              <h3 style={{ color: '#28a745', margin: '0 0 5px 0' }}>Valor Total</h3>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#343a40' }}>
                R$ {stats.valorTotal.toFixed(2)}
              </div>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>📈</div>
              <h3 style={{ color: '#ffc107', margin: '0 0 5px 0' }}>Últimos 30 dias</h3>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#343a40' }}>
                {stats.pedidosUltimos30Dias}
              </div>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎯</div>
              <h3 style={{ color: '#dc3545', margin: '0 0 5px 0' }}>Ticket Médio</h3>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#343a40' }}>
                R$ {stats.ticketMedio.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '25px'
        }}>
          <h3 style={{ color: '#343a40', marginBottom: '15px' }}>🔍 Filtros</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '15px'
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontWeight: 'bold',
                color: '#343a40'
              }}>
                Status do Pedido:
              </label>
              <select
                value={filtros.status}
                onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              >
                {statusPedidos.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.icon} {status.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontWeight: 'bold',
                color: '#343a40'
              }}>
                Período:
              </label>
              <select
                value={filtros.periodo}
                onChange={(e) => setFiltros({ ...filtros, periodo: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              >
                {periodoOptions.map(periodo => (
                  <option key={periodo.value} value={periodo.value}>
                    {periodo.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
            <strong>Resultado:</strong> {pedidosFiltrados.length} pedido(s) encontrado(s)
          </div>
        </div>

        {/* Lista de Pedidos */}
        {loading ? (
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '10px',
            textAlign: 'center',
            color: '#666'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔄</div>
            <h3>Carregando pedidos...</h3>
            <p>Aguarde enquanto buscamos seu histórico de pedidos.</p>
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '10px',
            textAlign: 'center',
            color: '#666'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
            <h3>Nenhum pedido encontrado</h3>
            <p>
              {pedidos.length === 0 
                ? 'Você ainda não fez nenhum pedido.'
                : 'Nenhum pedido encontrado com os filtros selecionados.'
              }
            </p>
            {pedidos.length === 0 && (
              <button
                onClick={() => onNavigate('pedido-produtos')}
                style={{
                  backgroundColor: '#009245',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  marginTop: '15px'
                }}
              >
                🛒 Fazer Primeiro Pedido
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            {pedidosFiltrados.map((pedido) => {
              const statusInfo = getStatusInfo(pedido.status);
              return (
                <div
                  key={pedido.id}
                  style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '1px solid transparent'
                  }}
                  onClick={() => abrirDetalhes(pedido)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                    e.currentTarget.style.borderColor = '#009245';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '15px' : '0'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '10px'
                      }}>
                        <h3 style={{ 
                          margin: 0, 
                          color: '#343a40',
                          fontSize: '18px' 
                        }}>
                          Pedido #{pedido.numero}
                        </h3>
                        <span style={{
                          backgroundColor: statusInfo.color,
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </div>
                      
                      <p style={{ 
                        margin: '5px 0', 
                        color: '#666',
                        fontSize: '14px'
                      }}>
                        📅 Data: {formatarData(pedido.data)}
                      </p>
                      
                      {pedido.itens && pedido.itens.length > 0 && (
                        <p style={{ 
                          margin: '5px 0', 
                          color: '#666',
                          fontSize: '14px'
                        }}>
                          📦 {pedido.itens.length} {pedido.itens.length === 1 ? 'item' : 'itens'}
                        </p>
                      )}
                      
                      {pedido.enderecoEntrega && (
                        <p style={{ 
                          margin: '5px 0', 
                          color: '#666',
                          fontSize: '14px'
                        }}>
                          📍 {pedido.enderecoEntrega.substring(0, 50)}...
                        </p>
                      )}
                    </div>
                    
                    <div style={{
                      textAlign: isMobile ? 'left' : 'right',
                      minWidth: isMobile ? 'auto' : '120px'
                    }}>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#28a745',
                        marginBottom: '5px'
                      }}>
                        R$ {pedido.total.toFixed(2)}
                      </div>
                      
                      <div style={{
                        fontSize: '12px',
                        color: '#666'
                      }}>
                        Clique para detalhes
                      </div>
                    </div>
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
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            {/* Header do Modal */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 20px 0 20px',
              borderBottom: '1px solid #eee',
              marginBottom: '20px'
            }}>
              <h2 style={{ 
                margin: 0, 
                color: '#343a40',
                fontSize: '24px'
              }}>
                Pedido #{selectedPedido.numero}
              </h2>
              <button
                onClick={fecharDetalhes}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div style={{ padding: '0 20px 20px 20px' }}>
              {/* Status e Data */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '15px' : '0'
              }}>
                <div>
                  <span style={{
                    backgroundColor: getStatusInfo(selectedPedido.status).color,
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {getStatusInfo(selectedPedido.status).icon} {getStatusInfo(selectedPedido.status).label}
                  </span>
                </div>
                <div style={{
                  fontSize: '16px',
                  color: '#666'
                }}>
                  📅 {formatarData(selectedPedido.data)}
                </div>
              </div>

              {/* Endereço de Entrega */}
              {selectedPedido.enderecoEntrega && (
                <div style={{
                  backgroundColor: '#fff8e1',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: '1px solid #ffecb3'
                }}>
                  <h4 style={{ 
                    margin: '0 0 8px 0', 
                    color: '#f57f17',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}>
                    📍 Endereço de Entrega:
                  </h4>
                  <p style={{ 
                    margin: 0, 
                    color: '#e65100',
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    {selectedPedido.enderecoEntrega}
                  </p>
                </div>
              )}

              {/* Observações */}
              {selectedPedido.observacoes && (
                <div style={{
                  backgroundColor: '#e3f2fd',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: '1px solid #bbdefb'
                }}>
                  <h4 style={{ 
                    margin: '0 0 8px 0', 
                    color: '#1976d2',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}>
                    💬 Observações:
                  </h4>
                  <p style={{ 
                    margin: 0, 
                    color: '#0277bd',
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    {selectedPedido.observacoes}
                  </p>
                </div>
              )}

              {/* Itens do Pedido */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ 
                  margin: '0 0 15px 0', 
                  color: '#343a40',
                  fontSize: '18px'
                }}>
                  📦 Itens do Pedido:
                </h4>
                {selectedPedido.itens && selectedPedido.itens.length > 0 ? (
                  <div style={{
                    border: '1px solid #eee',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    {selectedPedido.itens.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 15px',
                          borderBottom: index < selectedPedido.itens.length - 1 ? '1px solid #eee' : 'none',
                          backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontWeight: 'bold', 
                            color: '#343a40',
                            marginBottom: '4px'
                          }}>
                            {item.nome}
                          </div>
                          <div style={{ 
                            fontSize: '14px', 
                            color: '#666' 
                          }}>
                            Quantidade: {item.quantidade}x | Preço unit.: R$ {item.preco.toFixed(2)}
                          </div>
                        </div>
                        <div style={{
                          fontWeight: 'bold',
                          color: '#28a745',
                          fontSize: '16px'
                        }}>
                          R$ {(item.quantidade * item.preco).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#666', fontStyle: 'italic' }}>
                    Nenhum item detalhado disponível.
                  </p>
                )}
              </div>

              {/* Total */}
              <div style={{
                borderTop: '2px solid #009245',
                paddingTop: '15px',
                textAlign: 'right'
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#28a745'
                }}>
                  Total: R$ {selectedPedido.total.toFixed(2)}
                </div>
              </div>

              {/* Botões de Ação */}
              <div style={{
                display: 'flex',
                gap: '10px',
                marginTop: '20px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={fecharDetalhes}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    fecharDetalhes();
                    onNavigate('pedido-produtos');
                  }}
                  style={{
                    backgroundColor: '#009245',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  🛒 Fazer Novo Pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultaPedidosPage;