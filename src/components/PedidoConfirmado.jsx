import React, { useState, useEffect } from 'react';

const PedidoConfirmado = ({ onNavigate }) => {
  const [cnpjInfo, setCnpjInfo] = useState('');
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null);

  useEffect(() => {
    // Recupera informações do sessionStorage
    const cnpj = sessionStorage.getItem('cnpj') || '';
    const empresa = sessionStorage.getItem('empresaInfo') || '';
    setCnpjInfo(`${empresa} - CNPJ: ${cnpj}`);

    // Recupera pedido confirmado
    const pedidoSalvo = sessionStorage.getItem('pedidoConfirmado');
    if (pedidoSalvo) {
      setPedidoConfirmado(JSON.parse(pedidoSalvo));
    } else {
      // Se não tem pedido confirmado, volta para home
      onNavigate('home');
    }
  }, [onNavigate]);

  const formatarData = (dataISO) => {
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatarDataEntrega = (dataISO) => {
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const fazerNovoPedido = () => {
    // Limpa dados do pedido confirmado
    sessionStorage.removeItem('pedidoConfirmado');
    onNavigate('home');
  };

  const consultarPedidos = () => {
    onNavigate('consultar-pedido');
  };

  const baixarComprovante = () => {
    // Simula download do comprovante
    const comprovante = `
COMPROVANTE DE PEDIDO
=====================

Pedido: #${pedidoConfirmado.numero}
Data: ${formatarData(pedidoConfirmado.dataConfirmacao)}
Empresa: ${cnpjInfo}

ITENS:
${pedidoConfirmado.itens.map(item => 
  `${item.quantidade}x ${item.nome} - R$ ${(item.preco * item.quantidade).toFixed(2)}`
).join('\n')}

Subtotal: R$ ${pedidoConfirmado.subtotal.toFixed(2)}
Taxa de entrega: ${pedidoConfirmado.taxaEntrega === 0 ? 'GRÁTIS' : `R$ ${pedidoConfirmado.taxaEntrega.toFixed(2)}`}
${pedidoConfirmado.formaPagamento === 'pix' ? 'Desconto PIX (5%): -R$ ' + (pedidoConfirmado.total * 0.05).toFixed(2) + '\n' : ''}
TOTAL: R$ ${pedidoConfirmado.formaPagamento === 'pix' ? (pedidoConfirmado.total * 0.95).toFixed(2) : pedidoConfirmado.total.toFixed(2)}

Forma de pagamento: ${pedidoConfirmado.formaPagamento === 'pix' ? 'PIX' : 'Cartão de Crédito'}
Previsão de entrega: ${formatarDataEntrega(pedidoConfirmado.previsaoEntrega)}

Fit In Box - Alimentação Saudável
    `;

    const blob = new Blob([comprovante], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprovante-pedido-${pedidoConfirmado.numero}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!pedidoConfirmado) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        Carregando...
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
        padding: '10px 40px',
        borderBottom: '1px solid #ccc'
      }}>
        <img 
          style={{ height: '60px' }}
          src="/assets/logo.jpg" 
          alt="Logo Fit In Box"
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <span style={{
            fontWeight: 'bold',
            color: '#009245',
            fontSize: '14px'
          }}>
            {cnpjInfo}
          </span>
          <button 
            onClick={fazerNovoPedido}
            style={{
              padding: '10px 20px',
              borderRadius: '5px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: '#009245'
            }}
          >
            NOVO PEDIDO
          </button>
        </div>
      </div>

      {/* Container Principal */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        {/* Sucesso Header */}
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '15px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <div style={{
            fontSize: '80px',
            marginBottom: '20px'
          }}>
            ✅
          </div>
          
          <h1 style={{
            color: '#28a745',
            fontSize: '32px',
            marginBottom: '10px'
          }}>
            Pedido Confirmado com Sucesso!
          </h1>
          
          <p style={{
            color: '#666',
            fontSize: '18px',
            marginBottom: '30px'
          }}>
            Seu pedido foi processado e está sendo preparado com carinho.
          </p>

          <div style={{
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              textAlign: 'left'
            }}>
              <div>
                <strong style={{ color: '#155724' }}>Número do Pedido:</strong>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                  #{pedidoConfirmado.numero}
                </div>
              </div>
              <div>
                <strong style={{ color: '#155724' }}>Data do Pedido:</strong>
                <div style={{ fontSize: '16px', color: '#155724' }}>
                  {formatarData(pedidoConfirmado.dataConfirmacao)}
                </div>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '15px',
            color: '#856404'
          }}>
            <strong>📅 Previsão de Entrega:</strong>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px' }}>
              {formatarDataEntrega(pedidoConfirmado.previsaoEntrega)}
            </div>
          </div>
        </div>

        {/* Detalhes do Pedido */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '15px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <h2 style={{
            color: '#009245',
            marginBottom: '20px',
            fontSize: '24px'
          }}>
            📋 Detalhes do Pedido
          </h2>

          {/* Lista de Itens */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#666', marginBottom: '15px' }}>Itens Pedidos:</h3>
            {pedidoConfirmado.itens.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <strong style={{ color: '#009245' }}>{item.nome}</strong>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Quantidade: {item.quantidade} | Preço unitário: R$ {item.preco.toFixed(2)}
                  </div>
                </div>
                <div style={{
                  fontWeight: 'bold',
                  color: '#009245',
                  fontSize: '18px'
                }}>
                  R$ {(item.preco * item.quantidade).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Resumo Financeiro */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#666', marginBottom: '15px' }}>Resumo Financeiro:</h3>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}>
              <span>Subtotal:</span>
              <span>R$ {pedidoConfirmado.subtotal.toFixed(2)}</span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}>
              <span>Taxa de entrega:</span>
              <span style={{ color: pedidoConfirmado.taxaEntrega === 0 ? '#28a745' : '#000' }}>
                {pedidoConfirmado.taxaEntrega === 0 ? 'GRÁTIS' : `R$ ${pedidoConfirmado.taxaEntrega.toFixed(2)}`}
              </span>
            </div>

            {pedidoConfirmado.formaPagamento === 'pix' && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '10px',
                color: '#28a745'
              }}>
                <span>Desconto PIX (5%):</span>
                <span>- R$ {(pedidoConfirmado.total * 0.05).toFixed(2)}</span>
              </div>
            )}
            
            <hr style={{ margin: '15px 0', border: '1px solid #ddd' }} />
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#009245'
            }}>
              <span>Total Pago:</span>
              <span>
                R$ {pedidoConfirmado.formaPagamento === 'pix' 
                  ? (pedidoConfirmado.total * 0.95).toFixed(2) 
                  : pedidoConfirmado.total.toFixed(2)
                }
              </span>
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div style={{
            backgroundColor: '#e7f3ff',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <strong>💳 Forma de Pagamento:</strong>
            <div style={{ marginTop: '5px' }}>
              {pedidoConfirmado.formaPagamento === 'pix' ? (
                <span>PIX - Pagamento confirmado ✅</span>
              ) : (
                <span>
                  Cartão de Crédito - {pedidoConfirmado.dadosPagamento?.numeroMascarado}
                  <br />
                  <small>Titular: {pedidoConfirmado.dadosPagamento?.nome}</small>
                </span>
              )}
            </div>
          </div>

          {/* Endereço de Entrega */}
          <div style={{
            backgroundColor: '#fff8e1',
            padding: '15px',
            borderRadius: '8px'
          }}>
            <strong>📍 Endereço de Entrega:</strong>
            <div style={{ marginTop: '5px' }}>
              {pedidoConfirmado.enderecoEntrega}
            </div>
            {pedidoConfirmado.observacoes && (
              <div style={{ marginTop: '10px' }}>
                <strong>💬 Observações:</strong>
                <div style={{ marginTop: '5px', fontStyle: 'italic' }}>
                  {pedidoConfirmado.observacoes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <button
            onClick={baixarComprovante}
            style={{
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              padding: '15px 20px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            📄 Baixar Comprovante
          </button>

          <button
            onClick={consultarPedidos}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '15px 20px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            📋 Meus Pedidos
          </button>

          <button
            onClick={fazerNovoPedido}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              padding: '15px 20px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            🛒 Fazer Novo Pedido
          </button>
        </div>

        {/* Informações Adicionais */}
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          marginTop: '30px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#009245', marginBottom: '15px' }}>
            📞 Precisa de Ajuda?
          </h3>
          
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Se você tiver alguma dúvida sobre seu pedido ou precisar fazer alterações,
            entre em contato conosco:
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginTop: '20px'
          }}>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px'
            }}>
              <strong>📱 WhatsApp</strong>
              <div>(11) 99999-9999</div>
            </div>
            
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px'
            }}>
              <strong>📧 Email</strong>
              <div>contato@fitinbox.com</div>
            </div>
            
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px'
            }}>
              <strong>🕒 Horário</strong>
              <div>Seg-Sex: 8h às 18h</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PedidoConfirmado;