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

  const enviarNovamenteWhatsApp = () => {
    const numeroWhatsApp = '5565992556938'; // Substitua pelo número real
    
    // Monta a mensagem para WhatsApp
    let mensagem = `🍽️ *CONSULTA DE PEDIDO - FIT IN BOX*\n\n`;
    mensagem += `📋 *Pedido:* #${pedidoConfirmado.numero}\n`;
    mensagem += `🏢 *Empresa:* ${cnpjInfo}\n`;
    mensagem += `📅 *Data:* ${formatarData(pedidoConfirmado.dataConfirmacao)}\n`;
    mensagem += `💰 *Total:* R$ ${pedidoConfirmado.total.toFixed(2)}\n\n`;
    mensagem += `Gostaria de tirar alguma dúvida sobre este pedido.`;

    // URL do WhatsApp
    const url = `https://wa.me/${(5565992556938)}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  const baixarComprovante = () => {
    // Cria conteúdo HTML para PDF
    const conteudoPDF = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Comprovante Pedido #${pedidoConfirmado.numero}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #009245; font-size: 24px; font-weight: bold; }
          .titulo { color: #009245; font-size: 20px; margin: 20px 0; }
          .info-box { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .total { font-size: 18px; font-weight: bold; color: #009245; }
          .rodape { margin-top: 30px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🍽️ FIT IN BOX</div>
          <h1>COMPROVANTE DE PEDIDO</h1>
        </div>
        
        <div class="info-box">
          <strong>Pedido:</strong> #${pedidoConfirmado.numero}<br>
          <strong>Data:</strong> ${formatarData(pedidoConfirmado.dataConfirmacao)}<br>
          <strong>Empresa:</strong> ${cnpjInfo}<br>
          <strong>Status:</strong> ${pedidoConfirmado.status.toUpperCase()}
        </div>
        
        <h2 class="titulo">ITENS DO PEDIDO</h2>
        ${pedidoConfirmado.itens.map(item => 
          `<div class="item">
            <span>${item.quantidade}x ${item.nome}</span>
            <span>R$ ${(item.preco * item.quantidade).toFixed(2)}</span>
          </div>`
        ).join('')}
        
        <div style="margin: 20px 0;">
          <div class="item">
            <span>Subtotal:</span>
            <span>R$ ${pedidoConfirmado.subtotal.toFixed(2)}</span>
          </div>
          <div class="item">
            <span>Taxa de entrega:</span>
            <span>${pedidoConfirmado.taxaEntrega === 0 ? 'GRÁTIS' : `R$ ${pedidoConfirmado.taxaEntrega.toFixed(2)}`}</span>
          </div>
          <div class="item total">
            <span>TOTAL:</span>
            <span>R$ ${pedidoConfirmado.total.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="info-box">
          <strong>Previsão de entrega:</strong> ${formatarDataEntrega(pedidoConfirmado.previsaoEntrega)}
        </div>
        
        <div class="info-box">
          <strong>Endereço de entrega:</strong><br>
          ${pedidoConfirmado.enderecoEntrega}
          ${pedidoConfirmado.observacoes ? `<br><br><strong>Observações:</strong><br>${pedidoConfirmado.observacoes}` : ''}
        </div>
        
        <div class="rodape">
          <p>Fit In Box - Alimentação Saudável</p>
          <p>Pedido enviado via WhatsApp</p>
          <p>Obrigado pela preferência!</p>
        </div>
      </body>
      </html>
    `;

    // Cria um blob com o conteúdo HTML
    const blob = new Blob([conteudoPDF], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    
    // Abre em nova janela para o usuário imprimir como PDF
    const novaJanela = window.open(url, '_blank');
    novaJanela.onload = () => {
      setTimeout(() => {
        novaJanela.print();
        window.URL.revokeObjectURL(url);
      }, 500);
    };
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
            Pedido Enviado com Sucesso!
          </h1>
          
          <p style={{
            color: '#666',
            fontSize: '18px',
            marginBottom: '20px'
          }}>
            Seu pedido foi enviado via WhatsApp e está sendo processado pela nossa equipe.
          </p>

          {/* Status do WhatsApp */}
          <div style={{
            backgroundColor: '#e7f3ff',
            border: '1px solid #b3d9ff',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              color: '#0066cc',
              fontWeight: 'bold'
            }}>
              <span style={{ fontSize: '24px' }}>📱</span>
              Pedido enviado via WhatsApp
            </div>
            <p style={{ 
              margin: '10px 0 0 0', 
              fontSize: '14px',
              color: '#333'
            }}>
              Nossa equipe entrará em contato em breve para confirmar os detalhes
            </p>
          </div>

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
            
            <hr style={{ margin: '15px 0', border: '1px solid #ddd' }} />
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#009245'
            }}>
              <span>Total:</span>
              <span>R$ {pedidoConfirmado.total.toFixed(2)}</span>
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
            onClick={enviarNovamenteWhatsApp}
            style={{
              backgroundColor: '#25D366',
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
            📱 Abrir WhatsApp
          </button>

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
            Nossa equipe já recebeu seu pedido via WhatsApp. Se precisar de esclarecimentos
            ou quiser fazer alterações, entre em contato conosco:
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