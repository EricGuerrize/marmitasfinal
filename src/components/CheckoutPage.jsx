import React, { useState, useEffect } from 'react';

const CheckoutPage = ({ onNavigate, carrinho, calcularQuantidadeTotal }) => {
  const [cnpjInfo, setCnpjInfo] = useState('');
  const [pedidoAtual, setPedidoAtual] = useState(null);
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [processandoPedido, setProcessandoPedido] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detecta se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Recupera informações do sessionStorage
    const cnpj = sessionStorage.getItem('cnpj') || '';
    const empresa = sessionStorage.getItem('empresaInfo') || '';
    setCnpjInfo(`${empresa} - CNPJ: ${cnpj}`);

    // Recupera dados do pedido
    const pedidoSalvo = sessionStorage.getItem('pedidoAtual');
    if (pedidoSalvo) {
      setPedidoAtual(JSON.parse(pedidoSalvo));
    } else {
      // Se não tem pedido, volta para o carrinho
      onNavigate('carrinho');
    }
    
    // Intercepta o botão voltar do navegador
    const handlePopState = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onNavigate('carrinho');
      return false;
    };
    
    // Remove qualquer listener anterior
    window.removeEventListener('popstate', handlePopState);
    window.addEventListener('popstate', handlePopState);
    
    // Adiciona uma entrada no histórico para interceptar o botão voltar
    window.history.pushState({ page: 'checkout' }, '', window.location.pathname);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onNavigate]);

  const finalizarPedido = async () => {
    setProcessandoPedido(true);

    try {
      // Simula processamento do pagamento
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Cria dados do pedido final
      const pedidoFinal = {
        ...pedidoAtual,
        formaPagamento,
        dadosPagamento: null,
        status: 'confirmado',
        dataConfirmacao: new Date().toISOString(),
        previsaoEntrega: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 dias
      };

      // Salva pedido confirmado
      sessionStorage.setItem('pedidoConfirmado', JSON.stringify(pedidoFinal));
      
      // Limpa carrinho
      sessionStorage.removeItem('carrinho');
      sessionStorage.removeItem('pedidoAtual');

      // Vai para página de confirmação
      onNavigate('pedido-confirmado');

    } catch (error) {
      alert('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setProcessandoPedido(false);
    }
  };

  const voltarCarrinho = () => {
    onNavigate('carrinho');
  };

  if (!pedidoAtual) {
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
        padding: isMobile ? '10px 15px' : '10px 40px',
        borderBottom: '1px solid #ccc',
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        <img 
          style={{ height: isMobile ? '50px' : '60px' }}
          src="/assets/logo.jpg" 
          alt="Logo Fit In Box"
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '10px' : '20px',
          flexDirection: isMobile ? 'column' : 'row',
          marginTop: isMobile ? '10px' : '0',
          width: isMobile ? '100%' : 'auto'
        }}>
          <span style={{
            fontWeight: 'bold',
            color: '#009245',
            fontSize: isMobile ? '12px' : '14px',
            textAlign: 'center'
          }}>
            {cnpjInfo}
          </span>
          <button 
            onClick={voltarCarrinho}
            style={{
              padding: isMobile ? '8px 15px' : '10px 20px',
              borderRadius: '5px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: '#009245',
              fontSize: isMobile ? '14px' : '16px',
              width: isMobile ? '100%' : 'auto'
            }}
          >
            VOLTAR AO CARRINHO
          </button>
        </div>
      </div>

      {/* Container Principal */}
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: isMobile ? '10px' : '20px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
        gap: isMobile ? '20px' : '30px'
      }}>
        {/* Coluna Esquerda - Dados do Pagamento */}
        <div>
          <h1 style={{ 
            color: '#009245', 
            marginBottom: '20px',
            fontSize: isMobile ? '20px' : '24px'
          }}>
            💳 Finalizar Pedido
          </h1>

          {/* Forma de Pagamento */}
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '20px' : '25px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h2 style={{ 
              color: '#009245', 
              marginBottom: '20px',
              fontSize: isMobile ? '16px' : '18px'
            }}>💰 Forma de Pagamento</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                padding: '15px',
                border: `2px solid #009245`,
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '10px',
                backgroundColor: '#f0f9f0'
              }}>
                <input
                  type="radio"
                  name="pagamento"
                  value="pix"
                  checked={true}
                  readOnly
                  style={{ marginRight: '10px' }}
                />
                <div>
                  <strong>PIX</strong>
                  <br />
                  <small style={{ color: '#666' }}>Pagamento instantâneo via QR Code</small>
                </div>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                padding: '15px',
                border: `2px solid #ddd`,
                borderRadius: '8px',
                cursor: 'not-allowed',
                backgroundColor: '#f5f5f5',
                opacity: 0.6
              }}>
                <input
                  type="radio"
                  name="pagamento"
                  value="cartao"
                  disabled
                  style={{ marginRight: '10px' }}
                />
                <div>
                  <strong>Cartão de Crédito</strong>
                  <br />
                  <small style={{ color: '#999' }}>Indisponível no momento</small>
                </div>
              </label>
            </div>
          </div>

          {/* PIX - única opção disponível */}
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '20px' : '25px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <h3 style={{ 
              color: '#009245', 
              marginBottom: '20px',
              fontSize: isMobile ? '16px' : '18px'
            }}>📱 Pagamento PIX</h3>
            
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              <div style={{
                width: isMobile ? '120px' : '150px',
                height: isMobile ? '120px' : '150px',
                backgroundColor: '#fff',
                border: '2px solid #ddd',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 15px auto',
                fontSize: '12px',
                color: '#666'
              }}>
                QR CODE PIX
                <br />
                (Simulação)
              </div>
              
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: '#666' 
              }}>
                Escaneie o QR Code com seu banco ou copie o código PIX
              </p>
            </div>
          </div>
        </div>

        {/* Coluna Direita - Resumo do Pedido */}
        <div>
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '20px' : '25px',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            position: isMobile ? 'static' : 'sticky',
            top: isMobile ? 'auto' : '20px'
          }}>
            <h2 style={{ 
              color: '#009245', 
              marginBottom: '20px',
              fontSize: isMobile ? '18px' : '20px'
            }}>📊 Resumo Final</h2>
            
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '5px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                <strong>Pedido #{pedidoAtual.numero}</strong>
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                {calcularQuantidadeTotal()} marmitas
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '10px',
              fontSize: '16px'
            }}>
              <span>Subtotal:</span>
              <span>R$ {pedidoAtual.subtotal.toFixed(2)}</span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '10px',
              fontSize: '16px'
            }}>
              <span>Taxa de entrega:</span>
              <span style={{ color: pedidoAtual.taxaEntrega === 0 ? '#28a745' : '#000' }}>
                {pedidoAtual.taxaEntrega === 0 ? 'GRÁTIS' : `R$ ${pedidoAtual.taxaEntrega.toFixed(2)}`}
              </span>
            </div>
            
            <hr style={{ margin: '15px 0', border: '1px solid #eee' }} />
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: 'bold',
              color: '#009245',
              marginBottom: '25px'
            }}>
              <span>Total:</span>
              <span>R$ {pedidoAtual.total.toFixed(2)}</span>
            </div>
            
            <button
              onClick={finalizarPedido}
              disabled={processandoPedido}
              style={{
                backgroundColor: processandoPedido ? '#ccc' : '#f38e3c',
                color: 'white',
                border: 'none',
                padding: '15px',
                width: '100%',
                borderRadius: '5px',
                fontSize: isMobile ? '16px' : '18px',
                fontWeight: 'bold',
                cursor: processandoPedido ? 'wait' : 'pointer',
                marginBottom: '10px',
                opacity: processandoPedido ? 0.6 : 1
              }}
            >
              {processandoPedido ? '⏳ Processando...' : '🚀 Confirmar Pedido'}
            </button>
            
            <button
              onClick={voltarCarrinho}
              disabled={processandoPedido}
              style={{
                backgroundColor: 'transparent',
                color: '#009245',
                border: '2px solid #009245',
                padding: '12px',
                width: '100%',
                borderRadius: '5px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: processandoPedido ? 'not-allowed' : 'pointer',
                opacity: processandoPedido ? 0.5 : 1
              }}
            >
              Voltar ao Carrinho
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;